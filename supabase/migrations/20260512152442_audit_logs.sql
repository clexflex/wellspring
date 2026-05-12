create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  actor_creator_id uuid not null references public.creators(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (creator_id, id)
);

create index if not exists audit_logs_creator_created_idx on public.audit_logs (creator_id, created_at desc);
create index if not exists audit_logs_creator_action_created_idx on public.audit_logs (creator_id, action, created_at desc);
