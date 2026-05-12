create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  program_id uuid not null,
  title text not null,
  description text not null default '',
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, id),
  unique (creator_id, program_id, position),
  constraint sessions_program_fk
    foreign key (creator_id, program_id)
    references public.programs (creator_id, id)
    on delete cascade,
  constraint sessions_position_positive check (position > 0)
);

create index if not exists sessions_creator_program_position_idx on public.sessions (creator_id, program_id, position);

create trigger sessions_set_updated_at
before update on public.sessions
for each row
execute function app.touch_updated_at();
