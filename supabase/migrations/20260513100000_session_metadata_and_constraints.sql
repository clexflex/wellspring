alter table public.sessions
  add column if not exists duration_seconds integer,
  add column if not exists instructor_name text,
  add column if not exists tags text[],
  add column if not exists media_url text,
  add column if not exists media_type text;

alter table public.sessions
  alter column tags set default '{}'::text[];

update public.sessions
set tags = '{}'::text[]
where tags is null;

alter table public.sessions
  alter column tags set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_duration_seconds_positive'
  ) then
    alter table public.sessions
      add constraint sessions_duration_seconds_positive
      check (duration_seconds is null or duration_seconds > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_media_type_allowed'
  ) then
    alter table public.sessions
      add constraint sessions_media_type_allowed
      check (media_type is null or media_type in ('audio', 'video'));
  end if;
end $$;
