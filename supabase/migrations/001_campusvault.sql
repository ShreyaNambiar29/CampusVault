-- Run once in a new Supabase project. No public signup provisioning trigger.
create type public.app_role as enum ('student','staff');
create type public.document_status as enum ('pending','verified','rejected');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text not null check(length(full_name) between 2 and 100),email text not null,role public.app_role not null,student_identifier text unique,department text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.review_scopes(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now());
create table public.scope_memberships(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,scope_id uuid not null references public.review_scopes on delete cascade,membership_type public.app_role not null,created_at timestamptz not null default now(),unique(user_id,scope_id));
create table public.documents(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles,scope_id uuid not null references public.review_scopes,title text not null check(length(title) between 3 and 120),category text not null check(category in ('Academic Marksheet','Student Identity','Admission Document','Certificate','Fee Receipt','Other')),description text check(length(description)<=1000),original_filename text not null,storage_path text not null unique,mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),file_size bigint not null check(file_size>0 and file_size<=10485760),status public.document_status not null default 'pending',review_remarks text,reviewed_by uuid references public.profiles,reviewed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(status!='rejected' or length(trim(review_remarks))>=5));
create table public.activity_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles on delete set null,scope_id uuid references public.review_scopes,action text not null,resource_type text not null,resource_id uuid,result text not null check(result in ('success','denied','failure')),metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table public.document_reviews(id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents,reviewer_id uuid not null references public.profiles,previous_status public.document_status not null,new_status public.document_status not null,remarks text,created_at timestamptz not null default now());
create index documents_owner_date on public.documents(owner_id,created_at desc);
create index documents_scope_status on public.documents(scope_id,status,created_at desc);
create index activity_actor_date on public.activity_logs(actor_id,created_at desc);
create index activity_scope_date on public.activity_logs(scope_id,created_at desc);
create index memberships_scope_user on public.scope_memberships(scope_id,user_id);
create index reviews_document on public.document_reviews(document_id);

create function public.my_role() returns public.app_role language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() $$;
create function public.staff_scope(s uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.scope_memberships m join public.profiles p on p.id=m.user_id where m.user_id=auth.uid() and m.scope_id=s and m.membership_type='staff' and p.role='staff') $$;
create function public.can_read_document(d uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.documents where id=d and (owner_id=auth.uid() or public.staff_scope(scope_id))) $$;
create function public.shared_student(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.scope_memberships where user_id=u and membership_type='student' and public.staff_scope(scope_id)) $$;

alter table public.profiles enable row level security;
alter table public.review_scopes enable row level security;
alter table public.scope_memberships enable row level security;
alter table public.documents enable row level security;
alter table public.activity_logs enable row level security;
alter table public.document_reviews enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.shared_student(id));
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy scopes_read on public.review_scopes for select to authenticated using(exists(select 1 from public.scope_memberships where scope_id=review_scopes.id and user_id=auth.uid()));
create policy memberships_read on public.scope_memberships for select to authenticated using(user_id=auth.uid() or public.staff_scope(scope_id));
create policy documents_read on public.documents for select to authenticated using(owner_id=auth.uid() or public.staff_scope(scope_id));
create policy logs_read on public.activity_logs for select to authenticated using(actor_id=auth.uid() or public.staff_scope(scope_id));
create policy reviews_read on public.document_reviews for select to authenticated using(public.can_read_document(document_id));
revoke all on public.profiles,public.review_scopes,public.scope_memberships,public.documents,public.activity_logs,public.document_reviews from anon,authenticated;
grant select on public.profiles,public.review_scopes,public.scope_memberships,public.documents,public.activity_logs,public.document_reviews to authenticated;
grant update(full_name,department) on public.profiles to authenticated;

-- Audit records are generated by purpose-specific trusted functions, never client inserts.
create function public.log_role_denial(requested_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or requested_role not in ('student','staff') or public.my_role()::text=requested_role then return; end if;
 insert into public.activity_logs(actor_id,action,resource_type,result,metadata) values(auth.uid(),'unauthorized_role_access','route','denied',jsonb_build_object('requested_role',requested_role));
end $$;
create function public.log_login() returns void language plpgsql security definer set search_path='' as $$ begin
 if public.my_role() is null then return; end if;
 insert into public.activity_logs(actor_id,action,resource_type,result) values(auth.uid(),'login_success','session','success');
end $$;
-- Returns no metadata for unknown or unauthorized IDs. Denial is committed rather than rolled back by an exception.
create function public.access_document(doc_id uuid,access_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.documents; begin
 if public.my_role() is null then return null; end if;
 if access_kind not in ('preview','download') then raise exception 'Invalid access action'; end if;
 select * into d from public.documents where id=doc_id;
 if d.id is null or not(d.owner_id=auth.uid() or public.staff_scope(d.scope_id)) then
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),(select scope_id from public.scope_memberships where user_id=auth.uid() limit 1),'unauthorized_document_access','document',doc_id,'denied');
 return null;
 end if;
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),d.scope_id,case when access_kind='preview' then 'document_previewed' else 'document_downloaded' end,'document',d.id,'success');
 return to_jsonb(d);
end $$;
create function public.register_document(doc_id uuid,doc_scope uuid,doc_title text,doc_category text,doc_description text,doc_filename text,doc_path text,doc_mime text,doc_size bigint) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if public.my_role()!='student' or not exists(select 1 from public.scope_memberships where user_id=auth.uid() and scope_id=doc_scope and membership_type='student') then raise exception 'Forbidden'; end if;
 if doc_path !~ ('^students/'||auth.uid()::text||'/'||doc_id::text||'/[a-f0-9-]+\.(pdf|png|jpg)$') then raise exception 'Invalid object path'; end if;
 if not exists(select 1 from storage.objects where bucket_id='student-documents' and name=doc_path and owner_id=auth.uid()::text) then raise exception 'Uploaded object missing'; end if;
 insert into public.documents(id,owner_id,scope_id,title,category,description,original_filename,storage_path,mime_type,file_size) values(doc_id,auth.uid(),doc_scope,trim(doc_title),doc_category,doc_description,doc_filename,doc_path,doc_mime,doc_size);
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),doc_scope,'document_uploaded','document',doc_id,'success');
 return doc_id;
end $$;
create function public.review_document(doc_id uuid,new_status public.document_status,remarks text) returns void language plpgsql security definer set search_path='' as $$
declare d public.documents; begin
 select * into d from public.documents where id=doc_id for update;
 if d.id is null or not public.staff_scope(d.scope_id) then raise exception 'Forbidden'; end if;
 if d.status!='pending' then raise exception 'This document has already been reviewed'; end if;
 if new_status not in ('verified','rejected') or length(remarks)>1000 or (new_status='rejected' and coalesce(length(trim(remarks)),0)<5) then raise exception 'Invalid review or missing rejection reason'; end if;
 update public.documents set status=new_status,review_remarks=trim(remarks),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=doc_id;
 insert into public.document_reviews(document_id,reviewer_id,previous_status,new_status,remarks) values(doc_id,auth.uid(),d.status,new_status,trim(remarks));
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,resource_id,result) values(auth.uid(),d.scope_id,case when new_status='verified' then 'document_verified' else 'document_rejected' end,'document',doc_id,'success');
end $$;
create function public.record_export(export_kind text) returns void language plpgsql security definer set search_path='' as $$ begin
 if public.my_role()!='staff' or export_kind not in ('documents','activity') then raise exception 'Forbidden'; end if;
 insert into public.activity_logs(actor_id,scope_id,action,resource_type,result,metadata) select auth.uid(),scope_id,'data_exported','export','success',jsonb_build_object('kind',export_kind) from public.scope_memberships where user_id=auth.uid() and membership_type='staff';
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-documents','student-documents',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy files_insert on storage.objects for insert to authenticated with check(bucket_id='student-documents' and public.my_role()='student' and (storage.foldername(name))[1]='students' and (storage.foldername(name))[2]=auth.uid()::text and array_length(storage.foldername(name),1)=3);
create policy files_read on storage.objects for select to authenticated using(bucket_id='student-documents' and exists(select 1 from public.documents d where d.storage_path=name and public.can_read_document(d.id)));
-- Cleanup only unregistered uploads. Registered academic records are immutable to students.
create policy files_cleanup on storage.objects for delete to authenticated using(bucket_id='student-documents' and owner_id=auth.uid()::text and not exists(select 1 from public.documents d where d.storage_path=name));
-- Storage DELETE requires SELECT; permit own orphan objects only under their exact path, without exposing others.
create policy orphan_files_read on storage.objects for select to authenticated using(bucket_id='student-documents' and owner_id=auth.uid()::text and (storage.foldername(name))[2]=auth.uid()::text and not exists(select 1 from public.documents d where d.storage_path=name));

revoke execute on all functions in schema public from public,anon;
grant execute on function public.my_role(),public.staff_scope(uuid),public.can_read_document(uuid),public.shared_student(uuid),public.log_role_denial(text),public.log_login(),public.access_document(uuid,text),public.register_document(uuid,uuid,text,text,text,text,text,text,bigint),public.review_document(uuid,public.document_status,text),public.record_export(text) to authenticated;

create function public.touch_profile() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_profile();
revoke execute on function public.touch_profile() from public,anon,authenticated;
