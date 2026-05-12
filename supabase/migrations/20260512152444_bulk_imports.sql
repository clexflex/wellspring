create table if not exists public.bulk_imports (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  client_import_id text not null,
  status text not null default 'pending',
  result_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, id),
  unique (creator_id, client_import_id)
);

create index if not exists bulk_imports_creator_created_idx on public.bulk_imports (creator_id, created_at desc);

create trigger bulk_imports_set_updated_at
before update on public.bulk_imports
for each row
execute function app.touch_updated_at();
