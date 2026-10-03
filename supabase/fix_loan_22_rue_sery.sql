-- Correction prêt 22 RUE SERY (BENEDUC) — d’après TAM Crédit Mutuel GECTAM03
-- Safe : UPDATE uniquement, pas de TRUNCATE / seed.
-- À exécuter dans Supabase → SQL Editor sur la base PRODUCTION.

update loans l
set
  banque = 'Crédit Mutuel',
  montant_initial = 68000,
  taux_annuel = 1.75,
  duree_mois = 185,
  date_debut = '2016-09-01',
  assurance_mensuelle = 20.54,
  -- Mensualité HORS assurance (capital + intérêts). Total banque = 440,18 = 419,64 + 20,54
  mensualite = 419.64,
  capital_restant = 25242.46,
  -- fin dérivée début+185 mois (cohérent avec enrichCredit) ; dernière éch. TAM = 25/12/2031
  fin_credit = '2032-02-01',
  amortization_model = 'RATE_BASED',
  updated_at = now()
from properties p
where l.property_id = p.id
  and upper(p.address) like '%SERY%';

-- Vérification
select
  p.address,
  l.banque,
  l.montant_initial,
  l.taux_annuel,
  l.duree_mois,
  l.date_debut,
  l.assurance_mensuelle,
  l.mensualite,
  l.mensualite + l.assurance_mensuelle as echeance_totale,
  l.capital_restant,
  l.fin_credit,
  l.amortization_model
from loans l
join properties p on p.id = l.property_id
where upper(p.address) like '%SERY%';
