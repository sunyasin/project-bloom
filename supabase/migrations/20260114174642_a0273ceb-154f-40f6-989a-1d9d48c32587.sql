-- Drop and recreate pgcrypto in public schema
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION pgcrypto WITH SCHEMA public;