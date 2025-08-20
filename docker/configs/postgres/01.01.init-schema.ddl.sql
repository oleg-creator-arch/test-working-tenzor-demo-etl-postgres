\connect demo_db;

create schema if not exists demo_schema;

grant all on schema demo_schema to demo_role;
alter role demo_role set search_path = 'demo_schema';

\q
