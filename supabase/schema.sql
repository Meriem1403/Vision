-- Vision Patrimoine — schéma PostgreSQL pour Supabase
-- Exécuter dans Supabase → SQL Editor (dans l'ordre : schema.sql → seed.sql → rls.sql)

create extension if not exists "pgcrypto";

create type user_role as enum ('GERANT', 'ASSOCIE', 'BANQUE');
create type dossier_status as enum ('DRAFT', 'SENT', 'VIEWED', 'EXPIRED');

-- Profils liés à Supabase Auth (id = auth.users.id)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  first_name text not null,
  initials text not null,
  role user_role not null,
  bank_name text,
  shareholder_name text,
  /** Sous-ensemble des vues UI (null = défaut du rôle) */
  allowed_views text[] null,
  /** ASSOCIE : SCI autorisées par slug (null = toutes celles où il est actionnaire) */
  allowed_entity_slugs text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table legal_entities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  type text not null check (type in ('IR', 'IS', 'RP')),
  creation text,
  valeur_estimee numeric not null default 0,
  color text not null default '#60a5fa',
  gradient text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shareholders (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references legal_entities(id) on delete cascade,
  name text not null,
  parts numeric not null,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references legal_entities(id) on delete cascade,
  address text not null,
  ville text not null,
  cp text not null,
  type text not null,
  surface numeric not null default 0,
  lots integer not null default 1,
  prix_achat numeric not null default 0,
  travaux numeric not null default 0,
  frais_notaire numeric not null default 0,
  valeur_actuelle numeric not null default 0,
  loyer numeric not null default 0,
  taxe_fonciere numeric not null default 0,
  assurance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id) on delete cascade,
  banque text not null default 'À préciser',
  montant_initial numeric not null default 0,
  taux_annuel numeric not null default 0,
  duree_mois integer not null default 0,
  date_debut date,
  assurance_mensuelle numeric not null default 0,
  mensualite numeric not null default 0,
  capital_restant numeric not null default 0,
  fin_credit date,
  amortization_model text not null default 'EXCEL_IMPORT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table amortization_entries (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  periode date not null,
  mois_index integer not null,
  crd numeric not null,
  capital_amorti numeric not null default 0,
  interets numeric not null default 0,
  assurance numeric not null default 0,
  mensualite numeric not null default 0,
  unique (loan_id, mois_index)
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  nom text not null,
  initiales text not null,
  tel text,
  email text,
  debut_bail text not null,
  fin_bail text not null,
  debut_ts bigint not null,
  fin_ts bigint not null,
  loyer numeric not null,
  charges numeric not null default 0,
  statut text not null default 'En cours',
  created_at timestamptz not null default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  detail text not null,
  severity text not null default 'medium',
  created_at timestamptz not null default now()
);

create table bank_dossiers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  target_bank text not null,
  status dossier_status not null default 'DRAFT',
  message text,
  montant_demande numeric,
  objet text,
  entity_slugs text[] not null default '{}',
  include_patrimoine boolean not null default true,
  include_endettement boolean not null default true,
  include_cash_flow boolean not null default true,
  anonymize_tenants boolean not null default true,
  payload jsonb not null default '{}',
  created_by uuid references profiles(id),
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shareholders_entity on shareholders(entity_id);
create index idx_properties_entity on properties(entity_id);
create index idx_loans_banque on loans(banque);
create index idx_tenants_property on tenants(property_id);
create index idx_amort_loan on amortization_entries(loan_id, periode);
create index idx_dossiers_bank_status on bank_dossiers(target_bank, status);
create index idx_profiles_role on profiles(role);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger entities_updated_at before update on legal_entities
  for each row execute function set_updated_at();
create trigger properties_updated_at before update on properties
  for each row execute function set_updated_at();
create trigger loans_updated_at before update on loans
  for each row execute function set_updated_at();
create trigger dossiers_updated_at before update on bank_dossiers
  for each row execute function set_updated_at();

-- Auto-création profil à l'inscription (métadonnées passées au signup)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_views text[];
  v_slugs text[];
begin
  begin
    v_views := array(
      select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'allowed_views', '[]'::jsonb))
    );
  exception when others then
    v_views := null;
  end;
  begin
    v_slugs := array(
      select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'allowed_entity_slugs', '[]'::jsonb))
    );
  exception when others then
    v_slugs := null;
  end;
  if v_views is not null and cardinality(v_views) = 0 then v_views := null; end if;
  if v_slugs is not null and cardinality(v_slugs) = 0 then v_slugs := null; end if;

  insert into public.profiles (
    id, email, name, first_name, initials, role, bank_name, shareholder_name,
    allowed_views, allowed_entity_slugs
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(split_part(new.email, '@', 1), 2))),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'ASSOCIE'),
    nullif(new.raw_user_meta_data->>'bank_name', ''),
    nullif(new.raw_user_meta_data->>'shareholder_name', ''),
    v_views,
    v_slugs
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
