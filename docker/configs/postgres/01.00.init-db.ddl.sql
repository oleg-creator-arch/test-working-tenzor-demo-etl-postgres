-- БД

create database demo_db;
create role demo_role ;
create user demo_user with password 'demo_pw';
grant demo_role to demo_user ;
grant all on database demo_db to demo_user;