grant usage on schema public to wellspring_app;
grant usage on schema app to wellspring_app;

grant execute on function app.current_creator_id() to wellspring_app;

grant select, insert, update, delete on public.programs to wellspring_app;
grant select, insert, update, delete on public.sessions to wellspring_app;
grant select, insert, update, delete on public.audit_logs to wellspring_app;
grant select, insert, update, delete on public.bulk_imports to wellspring_app;
grant select, insert, update, delete on public.bulk_import_rows to wellspring_app;
grant select, insert, update, delete on public.password_reset_tokens to wellspring_app;

grant usage, select on all sequences in schema public to wellspring_app;

alter table public.programs enable row level security;
alter table public.programs force row level security;
alter table public.sessions enable row level security;
alter table public.sessions force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.bulk_imports enable row level security;
alter table public.bulk_imports force row level security;
alter table public.bulk_import_rows enable row level security;
alter table public.bulk_import_rows force row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.password_reset_tokens force row level security;

create policy programs_tenant_isolation_select
on public.programs
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy programs_tenant_isolation_insert
on public.programs
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy programs_tenant_isolation_update
on public.programs
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy programs_tenant_isolation_delete
on public.programs
for delete
to wellspring_app
using (creator_id = app.current_creator_id());

create policy sessions_tenant_isolation_select
on public.sessions
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy sessions_tenant_isolation_insert
on public.sessions
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy sessions_tenant_isolation_update
on public.sessions
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy sessions_tenant_isolation_delete
on public.sessions
for delete
to wellspring_app
using (creator_id = app.current_creator_id());

create policy audit_logs_tenant_isolation_select
on public.audit_logs
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy audit_logs_tenant_isolation_insert
on public.audit_logs
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy audit_logs_tenant_isolation_update
on public.audit_logs
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy audit_logs_tenant_isolation_delete
on public.audit_logs
for delete
to wellspring_app
using (creator_id = app.current_creator_id());

create policy bulk_imports_tenant_isolation_select
on public.bulk_imports
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy bulk_imports_tenant_isolation_insert
on public.bulk_imports
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy bulk_imports_tenant_isolation_update
on public.bulk_imports
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy bulk_imports_tenant_isolation_delete
on public.bulk_imports
for delete
to wellspring_app
using (creator_id = app.current_creator_id());

create policy bulk_import_rows_tenant_isolation_select
on public.bulk_import_rows
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy bulk_import_rows_tenant_isolation_insert
on public.bulk_import_rows
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy bulk_import_rows_tenant_isolation_update
on public.bulk_import_rows
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy bulk_import_rows_tenant_isolation_delete
on public.bulk_import_rows
for delete
to wellspring_app
using (creator_id = app.current_creator_id());

create policy password_reset_tokens_tenant_isolation_select
on public.password_reset_tokens
for select
to wellspring_app
using (creator_id = app.current_creator_id());

create policy password_reset_tokens_tenant_isolation_insert
on public.password_reset_tokens
for insert
to wellspring_app
with check (creator_id = app.current_creator_id());

create policy password_reset_tokens_tenant_isolation_update
on public.password_reset_tokens
for update
to wellspring_app
using (creator_id = app.current_creator_id())
with check (creator_id = app.current_creator_id());

create policy password_reset_tokens_tenant_isolation_delete
on public.password_reset_tokens
for delete
to wellspring_app
using (creator_id = app.current_creator_id());
