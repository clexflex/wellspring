create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default app.current_creator_id() references public.creators(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creator_id, id),
  unique (token_hash)
);

create index if not exists password_reset_tokens_creator_expires_idx on public.password_reset_tokens (creator_id, expires_at);
