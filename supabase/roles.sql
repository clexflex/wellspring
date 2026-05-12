do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'wellspring_app') then
    create role wellspring_app
      nologin
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      noreplication;
  end if;
end
$$;
