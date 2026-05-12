create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, id)
);

create index if not exists programs_creator_updated_idx on public.programs (creator_id, updated_at desc);

create trigger programs_set_updated_at
before update on public.programs
for each row
execute function app.touch_updated_at();
