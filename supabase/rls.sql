-- Vision Patrimoine — RLS par rôle
-- Gérant : tout. Associé : SCI où il est actionnaire. Banque : ses crédits + dossiers reçus.

alter table profiles enable row level security;
alter table legal_entities enable row level security;
alter table shareholders enable row level security;
alter table properties enable row level security;
alter table loans enable row level security;
alter table amortization_entries enable row level security;
alter table tenants enable row level security;
alter table alerts enable row level security;
alter table bank_dossiers enable row level security;

-- Helpers
create or replace function public.current_profile()
returns profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_gerant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'GERANT');
$$;

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

-- PROFILES
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_update_self on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.is_gerant());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or public.is_gerant())
  with check (id = auth.uid() or public.is_gerant());

-- LEGAL ENTITIES
drop policy if exists entities_select on legal_entities;
drop policy if exists entities_write on legal_entities;
create policy entities_select on legal_entities for select to authenticated
  using (
    public.is_gerant()
    or id in (select public.associe_entity_ids())
    or (
      public.current_role() = 'BANQUE'
      and exists (
        select 1 from properties p
        join loans l on l.property_id = p.id
        join profiles pr on pr.id = auth.uid()
        where p.entity_id = legal_entities.id
          and lower(trim(l.banque)) = lower(trim(pr.bank_name))
      )
    )
  );
create policy entities_write on legal_entities for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- SHAREHOLDERS
drop policy if exists shareholders_select on shareholders;
drop policy if exists shareholders_write on shareholders;
create policy shareholders_select on shareholders for select to authenticated
  using (
    public.is_gerant()
    or entity_id in (select public.associe_entity_ids())
  );
create policy shareholders_write on shareholders for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- PROPERTIES
drop policy if exists properties_select on properties;
drop policy if exists properties_write on properties;
create policy properties_select on properties for select to authenticated
  using (
    public.is_gerant()
    or entity_id in (select public.associe_entity_ids())
    or (
      public.current_role() = 'BANQUE'
      and exists (
        select 1 from loans l
        join profiles pr on pr.id = auth.uid()
        where l.property_id = properties.id
          and lower(trim(l.banque)) = lower(trim(pr.bank_name))
      )
    )
  );
create policy properties_write on properties for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- LOANS
drop policy if exists loans_select on loans;
drop policy if exists loans_write on loans;
create policy loans_select on loans for select to authenticated
  using (
    public.is_gerant()
    or exists (
      select 1 from properties p
      where p.id = loans.property_id
        and p.entity_id in (select public.associe_entity_ids())
    )
    or (
      public.current_role() = 'BANQUE'
      and exists (
        select 1 from profiles pr
        where pr.id = auth.uid()
          and lower(trim(loans.banque)) = lower(trim(pr.bank_name))
      )
    )
  );
create policy loans_write on loans for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- AMORTIZATION
drop policy if exists amort_select on amortization_entries;
drop policy if exists amort_write on amortization_entries;
create policy amort_select on amortization_entries for select to authenticated
  using (
    public.is_gerant()
    or exists (
      select 1 from loans l
      join properties p on p.id = l.property_id
      where l.id = amortization_entries.loan_id
        and (
          p.entity_id in (select public.associe_entity_ids())
          or (
            public.current_role() = 'BANQUE'
            and exists (
              select 1 from profiles pr
              where pr.id = auth.uid()
                and lower(trim(l.banque)) = lower(trim(pr.bank_name))
            )
          )
        )
    )
  );
create policy amort_write on amortization_entries for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- TENANTS (associés + gérant ; pas les banques)
drop policy if exists tenants_select on tenants;
drop policy if exists tenants_write on tenants;
create policy tenants_select on tenants for select to authenticated
  using (
    public.is_gerant()
    or exists (
      select 1 from properties p
      where p.id = tenants.property_id
        and p.entity_id in (select public.associe_entity_ids())
    )
  );
create policy tenants_write on tenants for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- ALERTS
drop policy if exists alerts_select on alerts;
drop policy if exists alerts_write on alerts;
create policy alerts_select on alerts for select to authenticated using (true);
create policy alerts_write on alerts for all to authenticated
  using (public.is_gerant()) with check (public.is_gerant());

-- BANK DOSSIERS
drop policy if exists dossiers_select on bank_dossiers;
drop policy if exists dossiers_insert on bank_dossiers;
drop policy if exists dossiers_update on bank_dossiers;
drop policy if exists dossiers_delete on bank_dossiers;

create policy dossiers_select on bank_dossiers for select to authenticated
  using (
    public.is_gerant()
    or (
      public.current_role() = 'BANQUE'
      and status in ('SENT', 'VIEWED')
      and exists (
        select 1 from profiles pr
        where pr.id = auth.uid()
          and lower(trim(bank_dossiers.target_bank)) = lower(trim(pr.bank_name))
      )
    )
  );

create policy dossiers_insert on bank_dossiers for insert to authenticated
  with check (public.is_gerant());

create policy dossiers_update on bank_dossiers for update to authenticated
  using (
    public.is_gerant()
    or (
      public.current_role() = 'BANQUE'
      and status in ('SENT', 'VIEWED')
      and exists (
        select 1 from profiles pr
        where pr.id = auth.uid()
          and lower(trim(bank_dossiers.target_bank)) = lower(trim(pr.bank_name))
      )
    )
  )
  with check (
    public.is_gerant()
    or public.current_role() = 'BANQUE'
  );

create policy dossiers_delete on bank_dossiers for delete to authenticated
  using (public.is_gerant());
