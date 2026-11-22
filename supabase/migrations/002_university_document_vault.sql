-- Incremental conversion. Apply AFTER 001; preserves every user, file, review and audit row.
begin;
create type public.vault_document_status as enum ('draft','issued','archived','revoked');
alter table public.documents rename column status to legacy_status;
alter table public.documents alter column legacy_status drop not null;
alter table public.documents alter column legacy_status drop default;
alter table public.documents add column status public.vault_document_status not null default 'draft';
alter table public.documents add column issued_by uuid references public.profiles;
alter table public.documents add column issued_at timestamptz;
alter table public.documents add column lifecycle_remarks text check(length(lifecycle_remarks)<=1000);
alter table public.documents add column status_changed_at timestamptz;
-- Past submissions are NOT official university issuances. Retain and quarantine them.
update public.documents set status='archived',lifecycle_remarks='Legacy student submission retained for historical records; not a university issuance.',status_changed_at=now();
alter table public.documents add constraint issuance_identity check(status!='issued' or (issued_by is not null and issued_at is not null));
create index documents_vault_scope_status on public.documents(scope_id,status,created_at desc);
create index documents_student_issued on public.documents(owner_id,issued_at desc) where status='issued';
create table public.issuance_uploads(document_id uuid primary key,staff_id uuid not null references public.profiles,student_id uuid not null references public.profiles,scope_id uuid not null references public.review_scopes,storage_path text not null unique,mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),expires_at timestamptz not null default now()+interval '2 hours',completed_at timestamptz,created_at timestamptz not null default now());
create table public.document_events(id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents,actor_id uuid not null references public.profiles,previous_status public.vault_document_status,new_status public.vault_document_status not null,remarks text,created_at timestamptz not null default now());
alter table public.issuance_uploads enable row level security;
alter table public.document_events enable row level security;
revoke all on public.issuance_uploads,public.document_events from anon,authenticated;
grant select on public.issuance_uploads,public.document_events to authenticated;
create policy issuance_uploads_read on public.issuance_uploads for select to authenticated using(staff_id=auth.uid() and public.staff_scope(scope_id));
create policy document_events_read on public.document_events for select to authenticated using(public.can_read_document(document_id));

create or replace function public.can_read_document(d uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.documents where id=d and ((owner_id=auth.uid() and public.my_role()='student' and status='issued') or public.staff_scope(scope_id))) $$;
drop policy documents_read on public.documents;
create policy documents_read on public.documents for select to authenticated using((owner_id=auth.uid() and public.my_role()='student' and status='issued') or public.staff_scope(scope_id));
drop policy logs_read on public.activity_logs;
create policy logs_read on public.activity_logs for select to authenticated using(actor_id=auth.uid() or public.staff_scope(scope_id) or (resource_type='document' and action in ('document_issued','document_downloaded','document_previewed') and public.can_read_document(resource_id)));

-- Retire old writers but retain their signatures and historical tables for safe upgrades.
create or replace function public.register_document(doc_id uuid,doc_scope uuid,doc_title text,doc_category text,doc_description text,doc_filename text,doc_path text,doc_mime text,doc_size bigint) returns uuid language plpgsql security definer set search_path='' as $$ begin raise exception 'Student uploads have been retired'; end $$;
create or replace function public.review_document(doc_id uuid,new_status public.document_status,remarks text) returns void language plpgsql security definer set search_path='' as $$ begin raise exception 'Verification has been retired; use document issuance'; end $$;
revoke execute on function public.register_document(uuid,uuid,text,text,text,text,text,text,bigint),public.review_document(uuid,public.document_status,text) from public,anon,authenticated;

create or replace function public.access_document(doc_id uuid,access_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.documents; begin
 if public.my_role() is null then return null; end if;
 if access_kind not in ('preview','download') or access_kind is null then raise exception 'Invalid access action'; end if;
 select * into d from public.documents where id=doc_id;
 if d.id is null or not public.can_read_document(doc_id) then
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),(select scope_id from public.scope_memberships where user_id=auth.uid() limit 1),'unauthorized_document_access','document',doc_id,'denied'); return null;
 end if;
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),d.scope_id,case when access_kind='preview' then 'document_previewed' else 'document_downloaded' end,'document',d.id,'success');
 return to_jsonb(d);
end $$;

create function public.prepare_issuance(doc_id uuid,target_student uuid,target_scope uuid,doc_mime text) returns text language plpgsql security definer set search_path='' as $$
declare p text; begin
 if not public.staff_scope(target_scope) or not exists(select 1 from public.scope_memberships m join public.profiles p on p.id=m.user_id where m.user_id=target_student and m.scope_id=target_scope and m.membership_type='student' and p.role='student') then raise exception 'Forbidden recipient or scope'; end if;
 if doc_mime not in ('application/pdf','image/jpeg','image/png') or doc_id is null then raise exception 'Invalid file'; end if;
 p:='issued/'||auth.uid()::text||'/'||doc_id::text||'/'||doc_id::text||case when doc_mime='application/pdf' then '.pdf' when doc_mime='image/png' then '.png' else '.jpg' end;
 insert into public.issuance_uploads(document_id,staff_id,student_id,scope_id,storage_path,mime_type) values(doc_id,auth.uid(),target_student,target_scope,p,doc_mime);
 return p;
end $$;
create function public.can_upload_issuance(p text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.issuance_uploads where storage_path=p and staff_id=auth.uid() and public.staff_scope(scope_id) and completed_at is null and expires_at>now()) $$;
create function public.register_issuance(doc_id uuid,doc_title text,doc_category text,doc_description text,doc_filename text,doc_size bigint,initial_status public.vault_document_status) returns uuid language plpgsql security definer set search_path='' as $$
declare u public.issuance_uploads; begin
 select * into u from public.issuance_uploads where document_id=doc_id for update;
 if u.document_id is null or u.staff_id!=auth.uid() or not public.staff_scope(u.scope_id) or u.completed_at is not null or u.expires_at<=now() then raise exception 'Forbidden or expired issuance'; end if;
 if not exists(select 1 from public.scope_memberships m join public.profiles p on p.id=m.user_id where m.user_id=u.student_id and m.scope_id=u.scope_id and m.membership_type='student' and p.role='student') then raise exception 'Recipient is no longer in scope'; end if;
 if initial_status is null or initial_status not in ('draft','issued') then raise exception 'Invalid initial status'; end if;
 if not exists(select 1 from storage.objects where bucket_id='student-documents' and name=u.storage_path and owner_id=auth.uid()::text) then raise exception 'Uploaded file missing'; end if;
 insert into public.documents(id,owner_id,scope_id,title,category,description,original_filename,storage_path,mime_type,file_size,status,issued_by,issued_at,status_changed_at) values(doc_id,u.student_id,u.scope_id,trim(doc_title),doc_category,doc_description,doc_filename,u.storage_path,u.mime_type,doc_size,initial_status,case when initial_status='issued' then auth.uid() end,case when initial_status='issued' then now() end,now());
 update public.issuance_uploads set completed_at=now() where document_id=doc_id;
 insert into public.document_events(document_id,actor_id,new_status) values(doc_id,auth.uid(),initial_status);
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),u.scope_id,case when initial_status='issued' then 'document_issued' else 'document_drafted' end,'document',doc_id,'success');
 return doc_id;
end $$;
create function public.change_document_status(doc_id uuid,expected_status public.vault_document_status,new_status public.vault_document_status,remarks text) returns void language plpgsql security definer set search_path='' as $$
declare d public.documents; begin
 select * into d from public.documents where id=doc_id for update;
 if d.id is null or not public.staff_scope(d.scope_id) then raise exception 'Forbidden'; end if;
 if expected_status is null or d.status!=expected_status then raise exception 'Document changed; refresh before continuing'; end if;
 if new_status is null or not ((d.status='draft' and new_status in ('issued','archived')) or (d.status='issued' and new_status in ('archived','revoked')) or (d.status='archived' and d.issued_by is not null and new_status='revoked')) then raise exception 'Invalid lifecycle transition'; end if;
 if length(coalesce(remarks,''))>1000 or (new_status in ('archived','revoked') and length(trim(coalesce(remarks,'')))<5) then raise exception 'A meaningful archive or revocation reason is required'; end if;
 if new_status='issued' and not exists(select 1 from public.scope_memberships m join public.profiles p on p.id=m.user_id where m.user_id=d.owner_id and m.scope_id=d.scope_id and m.membership_type='student' and p.role='student') then raise exception 'Recipient is no longer in scope'; end if;
 update public.documents set status=new_status,issued_by=case when new_status='issued' then auth.uid() else issued_by end,issued_at=case when new_status='issued' then now() else issued_at end,lifecycle_remarks=trim(remarks),status_changed_at=now(),updated_at=now() where id=doc_id;
 insert into public.document_events(document_id,actor_id,previous_status,new_status,remarks) values(doc_id,auth.uid(),d.status,new_status,trim(remarks));
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),d.scope_id,'document_'||new_status::text,'document',doc_id,'success');
end $$;
-- Replace student-upload/storage-orphan permissions; legacy file paths remain readable to scoped Staff.
drop policy files_insert on storage.objects;
drop policy files_read on storage.objects;
drop policy files_cleanup on storage.objects;
drop policy orphan_files_read on storage.objects;
create policy files_insert on storage.objects for insert to authenticated with check(bucket_id='student-documents' and public.can_upload_issuance(name));
create policy files_read on storage.objects for select to authenticated using(bucket_id='student-documents' and exists(select 1 from public.documents d where d.storage_path=name and public.can_read_document(d.id)));
create policy issuance_orphan_read on storage.objects for select to authenticated using(bucket_id='student-documents' and public.can_upload_issuance(name));
create policy issuance_cleanup on storage.objects for delete to authenticated using(bucket_id='student-documents' and public.can_upload_issuance(name) and not exists(select 1 from public.documents d where d.storage_path=name));
revoke execute on function public.prepare_issuance(uuid,uuid,uuid,text),public.can_upload_issuance(text),public.register_issuance(uuid,text,text,text,text,bigint,public.vault_document_status),public.change_document_status(uuid,public.vault_document_status,public.vault_document_status,text) from public,anon;
grant execute on function public.prepare_issuance(uuid,uuid,uuid,text),public.can_upload_issuance(text),public.register_issuance(uuid,text,text,text,text,bigint,public.vault_document_status),public.change_document_status(uuid,public.vault_document_status,public.vault_document_status,text) to authenticated;
commit;
