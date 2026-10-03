-- Gestion des comptes par le gérant : droits de vues + SCI autorisées
-- À exécuter dans Supabase → SQL Editor (après schema.sql / rls.sql)

alter table profiles
  add column if not exists allowed_views text[] null,
  add column if not exists allowed_entity_slugs text[] null;

comment on column profiles.allowed_views is
  'Sous-ensemble des vues UI autorisées (null/[] = défaut du rôle)';
comment on column profiles.allowed_entity_slugs is
  'Pour ASSOCIE : SCI (slug) visibles (null/[] = toutes les SCI où il est actionnaire)';

-- Associe : filtre aussi par SCI explicitement autorisées
create or replace function public.associe_entity_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.entity_id
  from shareholders s
  join profiles p on p.id = auth.uid() and p.role = 'ASSOCIE'
  join legal_entities e on e.id = s.entity_id
  where lower(trim(s.name)) = lower(trim(coalesce(p.shareholder_name, p.name)))
    and (
      p.allowed_entity_slugs is null
      or cardinality(p.allowed_entity_slugs) = 0
      or e.slug = any (p.allowed_entity_slugs)
    );
$$;

-- Métadonnées signup : vues / SCI
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

  if v_views is not null and cardinality(v_views) = 0 then
    v_views := null;
  end if;
  if v_slugs is not null and cardinality(v_slugs) = 0 then
    v_slugs := null;
  end if;

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
