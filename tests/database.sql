-- Runs inside an isolated temporary database and rolled-back transaction.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;
\ir ../supabase/migrations/001_campusvault.sql
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333'),('44444444-4444-4444-8444-444444444444');
insert into public.profiles(id,full_name,email,role) values('11111111-1111-4111-8111-111111111111','Student A','a@example.test','student'),('22222222-2222-4222-8222-222222222222','Student B','b@example.test','student'),('33333333-3333-4333-8333-333333333333','Staff A','staff@example.test','staff'),('44444444-4444-4444-8444-444444444444','Student C','c@example.test','student');
insert into public.review_scopes(id,name) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Scope A'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Scope B');
insert into public.scope_memberships(user_id,scope_id,membership_type) values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','student'),('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','student'),('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','staff'),('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','student');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into storage.objects(bucket_id,name,owner_id) values('student-documents','students/11111111-1111-4111-8111-111111111111/dddddddd-dddd-4ddd-8ddd-dddddddddddd/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf','11111111-1111-4111-8111-111111111111');
select public.register_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Dummy Marksheet','Academic Marksheet','','dummy.pdf','students/11111111-1111-4111-8111-111111111111/dddddddd-dddd-4ddd-8ddd-dddddddddddd/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf','application/pdf',100);
do $$ begin
 if (select count(*) from public.documents)!=1 then raise exception 'Own document not visible'; end if;
 if public.access_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','preview') is null then raise exception 'Own access denied'; end if;
 begin update public.documents set status='verified'; raise exception 'Student changed status'; exception when insufficient_privilege then null; end;
 begin update public.profiles set role='staff' where id=auth.uid(); raise exception 'Role escalation allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.activity_logs(actor_id,action,resource_type,result) values(auth.uid(),'forged','document','success'); raise exception 'Audit forgery allowed'; exception when insufficient_privilege then null; end;
 begin perform public.review_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','verified',''); raise exception 'Student reviewed'; exception when raise_exception then if sqlerrm='Student reviewed' then raise; end if; end;
 begin perform public.record_export('documents'); raise exception 'Student exported'; exception when raise_exception then if sqlerrm='Student exported' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if (select count(*) from public.documents)!=0 then raise exception 'Cross student document leak'; end if;
 if (select count(*) from storage.objects)!=0 then raise exception 'Cross student storage leak'; end if;
 if public.access_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','download') is not null then raise exception 'Cross student access allowed'; end if;
 if not exists(select 1 from public.activity_logs where action='unauthorized_document_access' and actor_id=auth.uid()) then raise exception 'Denial not logged'; end if;
 if exists(select 1 from public.activity_logs where actor_id!=auth.uid()) then raise exception 'Other actor logs leaked'; end if;
 perform public.log_role_denial('staff');
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
insert into storage.objects(bucket_id,name,owner_id) values('student-documents','students/44444444-4444-4444-8444-444444444444/cccccccc-cccc-4ccc-8ccc-cccccccccccc/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf','44444444-4444-4444-8444-444444444444');
select public.register_document('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Other Scope Document','Other','','other.pdf','students/44444444-4444-4444-8444-444444444444/cccccccc-cccc-4ccc-8ccc-cccccccccccc/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.pdf','application/pdf',100);
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 if (select count(*) from public.documents)!=1 then raise exception 'Staff scope leak'; end if;
 if public.access_document('cccccccc-cccc-4ccc-8ccc-cccccccccccc','preview') is not null then raise exception 'Out of scope staff allowed'; end if;
 if public.access_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','preview') is null then raise exception 'Authorized staff blocked'; end if;
 begin perform public.review_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','rejected',''); raise exception 'Reasonless rejection allowed'; exception when raise_exception then if sqlerrm='Reasonless rejection allowed' then raise; end if; end;
 perform public.review_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','verified','Checked');
 begin perform public.review_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','verified','Again'); raise exception 'Repeated review allowed'; exception when raise_exception then if sqlerrm='Repeated review allowed' then raise; end if; end;
 if (select count(*) from public.document_reviews)!=1 then raise exception 'Review history missing'; end if;
 perform public.record_export('documents');
 if not exists(select 1 from public.activity_logs where action='data_exported') then raise exception 'Export log missing'; end if;
end $$;
reset role;
select 'PASS: migration, own access, cross-student denial, scope isolation, audit integrity, role escalation, verification and exports';

-- Snapshot the populated original schema, then upgrade in place.
create temp table before_upgrade as select (select count(*) from public.documents) docs,(select count(*) from public.document_reviews) reviews,(select count(*) from public.activity_logs) logs,(select count(*) from public.profiles) profiles,(select count(*) from storage.objects) objects;
\ir ../supabase/migrations/002_university_document_vault.sql
do $$ begin
 if (select count(*) from public.documents)!=(select docs from before_upgrade) or (select count(*) from public.document_reviews)!=(select reviews from before_upgrade) or (select count(*) from public.activity_logs)!=(select logs from before_upgrade) or (select count(*) from public.profiles)!=(select profiles from before_upgrade) or (select count(*) from storage.objects)!=(select objects from before_upgrade) then raise exception 'Upgrade lost records'; end if;
 if exists(select 1 from public.documents where status!='archived' or legacy_status is null or issued_at is not null) then raise exception 'Unsafe legacy classification'; end if;
 if (select legacy_status from public.documents where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')!='verified' then raise exception 'Legacy status lost'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ declare p text; begin
 begin perform public.prepare_issuance('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','application/pdf'); raise exception 'Bad recipient accepted'; exception when raise_exception then if sqlerrm='Bad recipient accepted' then raise; end if; end;
 begin perform public.prepare_issuance('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','application/pdf'); raise exception 'Wrong scope accepted'; exception when raise_exception then if sqlerrm='Wrong scope accepted' then raise; end if; end;
 p:=public.prepare_issuance('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','application/pdf');
 insert into storage.objects(bucket_id,name,owner_id) values('student-documents',p,auth.uid()::text);
 perform public.register_issuance('55555555-5555-4555-8555-555555555555','Official Marksheet','Academic Marksheet','Issued by the university','official.pdf',100,'draft');
 if public.can_upload_issuance(p) then raise exception 'Completed upload can be reused'; end if;
 if not public.can_read_document('55555555-5555-4555-8555-555555555555') then raise exception 'Staff draft access denied'; end if;
 if public.can_read_document('cccccccc-cccc-4ccc-8ccc-cccccccccccc') then raise exception 'Staff scope isolation broken'; end if;
 begin perform public.change_document_status('dddddddd-dddd-4ddd-8ddd-dddddddddddd','archived','issued','Promote legacy'); raise exception 'Legacy promoted'; exception when raise_exception then if sqlerrm='Legacy promoted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.documents)!=0 or (select count(*) from storage.objects)!=0 then raise exception 'Draft or legacy file visible to Student'; end if;
 if public.access_document('55555555-5555-4555-8555-555555555555','preview') is not null then raise exception 'Student opened draft'; end if;
 begin insert into storage.objects(bucket_id,name,owner_id) values('student-documents','students/'||auth.uid()::text||'/x/x.pdf',auth.uid()::text); raise exception 'Student uploaded'; exception when insufficient_privilege then null; end;
 begin perform public.register_document('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Bypass','Other','','x.pdf','x','application/pdf',1); raise exception 'Old uploader callable'; exception when insufficient_privilege then null; end;
 begin perform public.review_document('dddddddd-dddd-4ddd-8ddd-dddddddddddd','verified',''); raise exception 'Old review callable'; exception when insufficient_privilege then null; end;
 begin perform public.prepare_issuance('66666666-6666-4666-8666-666666666666',auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','application/pdf'); raise exception 'Student prepared issuance'; exception when raise_exception then if sqlerrm='Student prepared issuance' then raise; end if; end;
 begin perform public.change_document_status('55555555-5555-4555-8555-555555555555','draft','issued',''); raise exception 'Student issued'; exception when raise_exception then if sqlerrm='Student issued' then raise; end if; end;
 begin update public.documents set status='issued'; raise exception 'Student direct status write'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select public.change_document_status('55555555-5555-4555-8555-555555555555','draft','issued','Officially issued');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.documents)!=1 or (select count(*) from storage.objects)!=1 then raise exception 'Issued owner access blocked'; end if;
 if public.access_document('55555555-5555-4555-8555-555555555555','download') is null then raise exception 'Issued download denied'; end if;
 if not exists(select 1 from public.activity_logs where action='document_issued' and resource_id='55555555-5555-4555-8555-555555555555') then raise exception 'Student issuance activity missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if (select count(*) from public.documents)!=0 then raise exception 'Cross-student issued metadata leaked'; end if;
 if public.access_document('55555555-5555-4555-8555-555555555555','preview') is not null then raise exception 'Cross student allowed'; end if;
 if exists(select 1 from public.activity_logs where action='document_issued') then raise exception 'Other student issuance log leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 begin perform public.change_document_status('55555555-5555-4555-8555-555555555555','draft','issued',''); raise exception 'Stale state accepted'; exception when raise_exception then if sqlerrm='Stale state accepted' then raise; end if; end;
 begin perform public.change_document_status('55555555-5555-4555-8555-555555555555','issued','revoked',''); raise exception 'Reasonless revoke'; exception when raise_exception then if sqlerrm='Reasonless revoke' then raise; end if; end;
 perform public.change_document_status('55555555-5555-4555-8555-555555555555','issued','archived','Superseded document');
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin if (select count(*) from public.documents)!=0 or (select count(*) from storage.objects)!=0 or public.access_document('55555555-5555-4555-8555-555555555555','preview') is not null then raise exception 'Archive still accessible'; end if; end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select public.change_document_status('55555555-5555-4555-8555-555555555555','archived','revoked','Invalidated university record');
do $$ begin if (select count(*) from public.document_events where document_id='55555555-5555-4555-8555-555555555555')!=4 then raise exception 'Lifecycle history missing'; end if; perform public.record_export('documents'); end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin if public.access_document('55555555-5555-4555-8555-555555555555','download') is not null then raise exception 'Revoked access allowed'; end if; end $$;
reset role;
select 'PASS: incremental migration preservation; Student upload denial; Staff scope/recipient checks; draft/archived/revoked isolation; issued owner access; old writers retired; lifecycle/history/export audit';
