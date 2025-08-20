\connect demo_db;

drop table if exists demo_schema.demo_data;

create table if not exists demo_schema.demo_data (
	from_ts timestamptz not null,
	to_ts timestamptz not null,
	group_name varchar(200) not null,
	cnt integer not null
);

grant all on all tables in schema demo_schema to demo_role;
alter table demo_schema.demo_data owner to demo_user;

\q
