create index if not exists audit_logs_creator_created_id_idx
on public.audit_logs (creator_id, created_at desc, id desc);

create index if not exists audit_logs_creator_action_created_id_idx
on public.audit_logs (creator_id, action, created_at desc, id desc);

drop function if exists app.consume_password_reset_token(text, text);

create or replace function app.consume_password_reset_token(p_token_hash text, p_new_password_hash text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_id uuid;
begin
  select creator_id
  into v_creator_id
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  limit 1
  for update;

  if v_creator_id is null then
    return null;
  end if;

  update public.creators
  set password_hash = p_new_password_hash,
      updated_at = now()
  where id = v_creator_id;

  update public.password_reset_tokens
  set used_at = now()
  where token_hash = p_token_hash
    and used_at is null;

  return v_creator_id;
end;
$$;

grant execute on function app.consume_password_reset_token(text, text) to wellspring_app;
