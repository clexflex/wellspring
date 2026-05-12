create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creators_email_key on public.creators (lower(email));
create unique index if not exists creators_slug_key on public.creators (slug);

create trigger creators_set_updated_at
before update on public.creators
for each row
execute function app.touch_updated_at();
