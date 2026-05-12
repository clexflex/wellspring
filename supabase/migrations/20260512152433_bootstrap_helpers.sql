create extension if not exists pgcrypto;

create schema if not exists app;

create or replace function app.current_creator_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_creator_id', true), '')::uuid
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
