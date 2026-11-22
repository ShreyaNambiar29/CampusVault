-- Run manually in the Supabase SQL Editor after migrations 001 and 002.
-- Assumption: teacher@gmail.com is Staff; shreya@gmail.com is Student.
-- Re-runnable. Does not change passwords, Auth users, existing profile fields, or documents.
begin;
do $$
declare
  staff_id uuid;
  student_id uuid;
  issuance_scope constant uuid := 'e615da0a-7efa-4eaa-9d70-e0d3cfe3d182';
begin
  select id into strict staff_id from auth.users where lower(email)='teacher@gmail.com';
  select id into strict student_id from auth.users where lower(email)='shreya@gmail.com';

  insert into public.profiles(id,full_name,email,role)
  values(staff_id,'Teacher','teacher@gmail.com','staff'),
        (student_id,'Shreya','shreya@gmail.com','student')
  on conflict(id) do nothing;

  if not exists(select 1 from public.profiles where id=staff_id and role='staff')
     or not exists(select 1 from public.profiles where id=student_id and role='student') then
    raise exception 'An existing profile has a different role. No changes were committed. Review the intended roles first.';
  end if;

  insert into public.review_scopes(id,name)
  values(issuance_scope,'University Document Issuance') on conflict(id) do nothing;
  if not exists(select 1 from public.review_scopes where id=issuance_scope and name='University Document Issuance') then
    raise exception 'Scope identifier conflict. No changes were committed.';
  end if;

  insert into public.scope_memberships(user_id,scope_id,membership_type)
  values(staff_id,issuance_scope,'staff'),(student_id,issuance_scope,'student')
  on conflict(user_id,scope_id) do nothing;
  if not exists(select 1 from public.scope_memberships where user_id=staff_id and scope_id=issuance_scope and membership_type='staff')
     or not exists(select 1 from public.scope_memberships where user_id=student_id and scope_id=issuance_scope and membership_type='student') then
    raise exception 'Existing scope membership conflicts with intended roles. No changes were committed.';
  end if;
end $$;
commit;

-- Expected: Teacher / staff and Shreya / student, both in University Document Issuance.
select p.full_name,p.email,p.role,m.membership_type,s.name as issuance_scope
from public.profiles p
join public.scope_memberships m on m.user_id=p.id
join public.review_scopes s on s.id=m.scope_id
where s.id='e615da0a-7efa-4eaa-9d70-e0d3cfe3d182'
order by p.role;
