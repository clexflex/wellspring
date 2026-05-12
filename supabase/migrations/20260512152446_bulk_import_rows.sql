create table if not exists public.bulk_import_rows (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  bulk_import_id uuid not null,
  row_number integer not null,
  status text not null,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (creator_id, id),
  constraint bulk_import_rows_import_fk
    foreign key (creator_id, bulk_import_id)
    references public.bulk_imports (creator_id, id)
    on delete cascade,
  constraint bulk_import_rows_row_number_positive check (row_number > 0)
);

create index if not exists bulk_import_rows_creator_import_row_idx on public.bulk_import_rows (creator_id, bulk_import_id, row_number);
