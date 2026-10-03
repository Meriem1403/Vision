-- Alignement des prêts sur les TAM (private/amortissements/) — RATE_BASED
-- Safe : UPDATE / DELETE uniquement, pas de TRUNCATE.
-- À exécuter dans Supabase → SQL Editor sur la base PRODUCTION.

-- ─── BENEDUC ────────────────────────────────────────────────────────────────

-- 22 RUE SERY (déjà corrigé éventuellement via fix_loan_22_rue_sery.sql)
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 68000,
  taux_annuel = 1.75,
  duree_mois = 185,
  date_debut = '2016-09-01',
  assurance_mensuelle = 20.54,
  mensualite = 419.64,
  capital_restant = 25242.46,
  fin_credit = '2032-02-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%SERY%';

-- 47 RUE DANTON RDC — un seul TAM CM 45k (Excel avait scindé RDC + 1er)
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 45000,
  taux_annuel = 1.55,
  duree_mois = 144,
  date_debut = '2019-09-01',
  assurance_mensuelle = 4.73,
  mensualite = 342.66,
  capital_restant = 19136.8,
  fin_credit = '2031-09-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%DANTON%RDC%';

-- 47 RUE DANTON 1er — plus de prêt distinct
delete from loans l
using properties p
where l.property_id = p.id and upper(p.address) like '%DANTON%1ER%';

-- 4 RUE MIREILLE
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 72000,
  taux_annuel = 1.65,
  duree_mois = 192,
  date_debut = '2020-01-01',
  assurance_mensuelle = 5.44,
  mensualite = 426.93,
  capital_restant = 43555.9,
  fin_credit = '2036-01-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%MIREILLE%';

-- 25 BD NOTRE DAME
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 110000,
  taux_annuel = 1.35,
  duree_mois = 204,
  date_debut = '2020-12-01',
  assurance_mensuelle = 19.64,
  mensualite = 603.76,
  capital_restant = 74541.95,
  fin_credit = '2037-12-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%NOTRE DAME%';

-- 221 BD LIBERATION (Beneduc appartement)
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 68990,
  taux_annuel = 3.3,
  duree_mois = 144,
  date_debut = '2026-04-01',
  assurance_mensuelle = 9.44,
  mensualite = 580.85,
  capital_restant = 66229.41,
  fin_credit = '2038-04-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
join legal_entities e on e.id = p.entity_id
where l.property_id = p.id
  and e.slug = 'beneduc'
  and upper(p.address) like '%LIBERATION%';

-- ─── TROIKA ─────────────────────────────────────────────────────────────────

-- 23 RUE ROGER SCHIAFFINI (immeuble 8 lots)
update loans l
set
  banque = 'CIC',
  montant_initial = 464000,
  taux_annuel = 1.35,
  duree_mois = 156,
  date_debut = '2018-11-01',
  assurance_mensuelle = 65.39,
  mensualite = 3244.66,
  capital_restant = 188151.9,
  fin_credit = '2031-11-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '23%SCHIAFFINI%';

-- 23 RUE ANTOINE MAILLE
update loans l
set
  banque = 'CIC',
  montant_initial = 146000,
  taux_annuel = 1.78,
  duree_mois = 204,
  date_debut = '2017-02-01',
  assurance_mensuelle = 23.39,
  mensualite = 829.95,
  capital_restant = 67871.33,
  fin_credit = '2034-02-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%ANTOINE MAILLE%';

-- 13 RUE ROUSSEL DORIA (prêt remanié — ancré sur encours)
update loans l
set
  banque = 'CIC',
  montant_initial = 52667.55,
  taux_annuel = 1.38,
  duree_mois = 109,
  date_debut = '2026-10-01',
  assurance_mensuelle = 12.43,
  mensualite = 514.38,
  capital_restant = 52667.55,
  fin_credit = '2035-11-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%ROUSSEL%';

-- 13 RUE ROGER SCHIAFFINI
update loans l
set
  banque = 'CIC',
  montant_initial = 47000,
  taux_annuel = 0.93,
  duree_mois = 180,
  date_debut = '2020-11-01',
  assurance_mensuelle = 6.9,
  mensualite = 279.85,
  capital_restant = 28982.34,
  fin_credit = '2035-11-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '13%SCHIAFFINI%';

-- ─── LA VISTA ───────────────────────────────────────────────────────────────

-- Maison Mathieu
update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 95000,
  taux_annuel = 4.5,
  duree_mois = 144,
  date_debut = '2023-06-01',
  assurance_mensuelle = 22.06,
  mensualite = 855.01,
  capital_restant = 72939.68,
  fin_credit = '2035-06-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id and upper(p.address) like '%MATHIEU%';

-- 221 bd de la libération (La Vista local commercial)
update loans l
set
  banque = 'CIC',
  montant_initial = 90000,
  taux_annuel = 4.5,
  duree_mois = 132,
  date_debut = '2025-04-01',
  assurance_mensuelle = 51.3,
  mensualite = 865.69,
  capital_restant = 79618.38,
  fin_credit = '2036-04-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
join legal_entities e on e.id = p.entity_id
where l.property_id = p.id
  and e.slug = 'lavista'
  and upper(p.address) like '%LIBERATION%';

-- Non mappé (pas de bien La Vista « 13 Roussel Doria » en base) :
-- TAL LA VISTA 13 ROUSSEL DORIA.pdf → CIC 150 000 @ 3,2 % · mens 1 176,63 + ass 44,35 · encours 147 663,89
-- À rattacher manuellement si c’est un 2ᵉ prêt ou un bien manquant.

-- Vérification
select
  e.slug,
  p.address,
  l.banque,
  l.montant_initial,
  l.taux_annuel,
  l.duree_mois,
  l.date_debut,
  l.assurance_mensuelle,
  l.mensualite,
  round((l.mensualite + coalesce(l.assurance_mensuelle, 0))::numeric, 2) as echeance_totale,
  l.capital_restant,
  l.fin_credit,
  l.amortization_model
from loans l
join properties p on p.id = l.property_id
join legal_entities e on e.id = p.entity_id
where e.slug in ('beneduc', 'troika', 'lavista')
order by e.slug, p.address;
