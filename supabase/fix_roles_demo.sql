-- Correction rôles / données pour tests Associé & Banque
-- À exécuter dans Supabase → SQL Editor (après seed).

-- 1) Vérifier les profils
-- select email, role, shareholder_name, bank_name from profiles;

-- 2) Forcer le profil ASSOCIÉ (adapte l'email)
update profiles
set
  role = 'ASSOCIE',
  name = 'Alexandre Niel',
  first_name = 'Alexandre',
  initials = 'AN',
  shareholder_name = 'Alexandre Niel',
  bank_name = null
where email = 'METS_EMAIL_ASSOCIE_ICI';

-- 3) Forcer le profil BANQUE (adapte l'email)
update profiles
set
  role = 'BANQUE',
  name = 'LCL',
  first_name = 'LCL',
  initials = 'LC',
  bank_name = 'LCL',
  shareholder_name = null
where email = 'METS_EMAIL_BANQUE_ICI';

-- 4) Donner de vraies banques aux crédits (sinon le portail banque est vide)
-- Répartition démo : LCL / Crédit Agricole / BNP
with ranked as (
  select id, row_number() over (order by address) as rn
  from properties
)
update loans l
set banque = case
  when (select rn from ranked r where r.id = l.property_id) % 3 = 1 then 'LCL'
  when (select rn from ranked r where r.id = l.property_id) % 3 = 2 then 'Crédit Agricole'
  else 'BNP Paribas'
end
where coalesce(nullif(trim(l.banque), ''), 'À préciser') in ('À préciser', '');

-- 5) Contrôle
-- select p.address, l.banque, l.mensualite from loans l join properties p on p.id = l.property_id;
-- select email, role, shareholder_name, bank_name from profiles;
