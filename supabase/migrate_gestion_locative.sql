-- Gestion locative déléguée — colonnes sur properties
-- Safe : ALTER uniquement, pas de TRUNCATE.
-- À exécuter dans Supabase → SQL Editor sur la base PRODUCTION.

alter table properties
  add column if not exists gestion_deleguee boolean not null default false,
  add column if not exists honoraires_gestion_pct numeric not null default 0;

-- Vérification
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name in ('gestion_deleguee', 'honoraires_gestion_pct');
