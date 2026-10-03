-- Vision Patrimoine — seed depuis VISION PATRIMOINE 030425.xlsx
-- Régénéré par scripts/excel_to_seed.py
-- Modèle EXCEL_FLAT : CRD = CRD_réf − mensualité × mois (comme Amort Beneduc/Troika)
truncate table amortization_entries, loans, tenants, properties, shareholders, bank_dossiers, alerts, legal_entities cascade;

insert into legal_entities (id, slug, name, short_name, type, creation, valeur_estimee, color, gradient) values ('8a4847da-39ec-510a-8789-a2ace17f1515', 'beneduc', $$SCI IR BENEDUC$$, $$BENEDUC$$, 'IR', null, 380000, '#60a5fa', 'from-blue-500/20 to-transparent');
insert into shareholders (id, entity_id, name, parts) values ('cc0a687d-ccb9-514c-9e58-36f8fa83a3e1', '8a4847da-39ec-510a-8789-a2ace17f1515', $$Johann Faraut$$, 50);
insert into shareholders (id, entity_id, name, parts) values ('5b60ade1-2ec0-59af-b469-3946002c6ba3', '8a4847da-39ec-510a-8789-a2ace17f1515', $$Alexandre Niel$$, 50);

insert into legal_entities (id, slug, name, short_name, type, creation, valeur_estimee, color, gradient) values ('ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', 'troika', $$SCI IR TROIKA$$, $$TROIKA$$, 'IR', null, 1265000, '#a78bfa', 'from-violet-500/20 to-transparent');
insert into shareholders (id, entity_id, name, parts) values ('5377b7af-15ef-594e-9328-2e769d69fc97', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$Johann Faraut$$, 33);
insert into shareholders (id, entity_id, name, parts) values ('57f5d289-f930-5d96-99dd-51c8be54de4e', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$Alexandre Niel$$, 67);

insert into legal_entities (id, slug, name, short_name, type, creation, valeur_estimee, color, gradient) values ('09305380-f1a9-5362-8259-591f0cdcdeaf', 'lavista', $$SCI IS LA VISTA$$, $$LA VISTA$$, 'IS', null, 390000, '#22d3ee', 'from-cyan-500/20 to-transparent');
insert into shareholders (id, entity_id, name, parts) values ('50f474bf-ec19-5010-98e5-fb05f4841e75', '09305380-f1a9-5362-8259-591f0cdcdeaf', $$Johann Faraut$$, 33);
insert into shareholders (id, entity_id, name, parts) values ('5821cb1d-6caf-5971-a592-08361043d00a', '09305380-f1a9-5362-8259-591f0cdcdeaf', $$Alexandre Niel$$, 67);

insert into legal_entities (id, slug, name, short_name, type, creation, valeur_estimee, color, gradient) values ('043b9a9f-a4b6-5373-843f-25ed1235a85f', 'rp', $$Résidence Principale$$, $$RP$$, 'RP', null, 630000, '#34d399', 'from-emerald-500/20 to-transparent');
insert into shareholders (id, entity_id, name, parts) values ('7c942036-4b70-5615-94ce-b2719acb9650', '043b9a9f-a4b6-5373-843f-25ed1235a85f', $$Johann Faraut$$, 66);
insert into shareholders (id, entity_id, name, parts) values ('818c887b-a4a9-52f7-8f2d-c3eae0d09e86', '043b9a9f-a4b6-5373-843f-25ed1235a85f', $$Alexandre Niel$$, 34);

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('2cf91e4e-8277-5cb4-8277-bbb3b51c4ba0', '8a4847da-39ec-510a-8789-a2ace17f1515', $$22 RUE SERY$$, $$Marseille$$, '13003', $$TYPE 2/3$$, 0, 1, 0, 0, 0, 85000.0, 534.0, 410.0, 0);
-- Aligné TAM Crédit Mutuel (PRET MODULIMMO) : 68k @ 1,75 %, éch. 440,18 dont ass. 20,54
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('cf63d4af-7c29-5000-a287-94d3cef9a507', '2cf91e4e-8277-5cb4-8277-bbb3b51c4ba0', $$Crédit Mutuel$$, 68000.0, 1.75, 185, '2016-09-01'::date, 20.54, 419.64, 25242.46, '2032-02-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('3efa81b6-1715-5fc6-b8f9-3575bfb7c3c1', '8a4847da-39ec-510a-8789-a2ace17f1515', $$47 RUE DANTON RDC$$, $$Marseille$$, '13003', $$TYPE 2/3$$, 0, 2, 0, 0, 0, 60000.0, 450.0, 285.0, 0);
-- TAM unique Danton (CM 45k) — était scindé en 2 prêts Excel sur RDC + 1er
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('3090bba5-adb2-54fb-abd3-dbcaee2908c2', '3efa81b6-1715-5fc6-b8f9-3575bfb7c3c1', $$Crédit Mutuel$$, 45000.0, 1.55, 144, '2019-09-01'::date, 4.73, 342.66, 19136.8, '2031-09-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('d5a8dc4e-29de-5bea-a440-96398d67b5cb', '8a4847da-39ec-510a-8789-a2ace17f1515', $$47 RUE DANTON 1er$$, $$Marseille$$, '13003', $$TYPE 2+TERRASSE$$, 0, 1, 0, 0, 0, 0, 450.0, 285.0, 0);
-- Pas de prêt distinct : le TAM Danton est rattaché au RDC

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('d8ed9f25-f529-56ee-b343-6a05ce6d1e44', '8a4847da-39ec-510a-8789-a2ace17f1515', $$4 RUE MIREILLE$$, $$Aubagne$$, '13400', $$TYPE 2$$, 0, 1, 0, 0, 0, 85000.0, 566.0, 530.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('d1f58a94-2365-5b7f-85b0-5e3e76bf9278', 'd8ed9f25-f529-56ee-b343-6a05ce6d1e44', $$Crédit Mutuel$$, 72000.0, 1.65, 192, '2020-01-01'::date, 5.44, 426.93, 43555.9, '2036-01-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('9c3f9a5a-42b6-5706-a661-b285f114dd32', '8a4847da-39ec-510a-8789-a2ace17f1515', $$25 BD NOTRE DAME$$, $$Marseille$$, '13006', $$TYPE 1+TERRASSE$$, 0, 1, 0, 0, 0, 150000.0, 540.0, 700.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('4752e4ce-1f7c-5294-9c9c-ceff9a548b4a', '9c3f9a5a-42b6-5706-a661-b285f114dd32', $$Crédit Mutuel$$, 110000.0, 1.35, 204, '2020-12-01'::date, 19.64, 603.76, 74541.95, '2037-12-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('6e763f71-e96b-5c87-af6a-99dca2e18bb2', '8a4847da-39ec-510a-8789-a2ace17f1515', $$221 BD LIBERATION$$, $$Marseille$$, '13004', $$TYPE 1$$, 0, 1, 0, 0, 0, 115000.0, 425.0, 495.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('72eb3843-0786-5f80-83a8-47972c2fea92', '6e763f71-e96b-5c87-af6a-99dca2e18bb2', $$Crédit Mutuel$$, 68990.0, 3.3, 144, '2026-04-01'::date, 9.44, 580.85, 66229.41, '2038-04-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('cfc014d1-6ab2-5a1f-ba32-4e6344c57f78', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$23 RUE ROGER SCHIAFFINI$$, $$Marseille$$, '13003', $$IMMEUBLE 8LOTS$$, 0, 8, 0, 0, 0, 670000.0, 5035.0, 2600.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('b179f284-7ac6-53f9-8620-81d70d2e7a48', 'cfc014d1-6ab2-5a1f-ba32-4e6344c57f78', $$CIC$$, 464000.0, 1.35, 156, '2018-11-01'::date, 65.39, 3244.66, 188151.9, '2031-11-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('f4c3d56a-0357-5e52-a2be-d718474fa229', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$23 RUE ANTOINE MAILLE$$, $$Marseille$$, '13005', $$T2 + Terrasse$$, 0, 1, 0, 0, 0, 145000.0, 740.0, 835.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('a9a146e9-efc6-52e7-bf05-8e943942dd3e', 'f4c3d56a-0357-5e52-a2be-d718474fa229', $$CIC$$, 146000.0, 1.78, 204, '2017-02-01'::date, 23.39, 829.95, 67871.33, '2034-02-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('ff6d0bbd-a798-5e0b-abbc-20b2bb7571c5', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$13 RUE ROUSSEL DORIA$$, $$Marseille$$, '13004', $$2 T2 et 1 T1$$, 0, 3, 0, 0, 0, 360000.0, 1993.0, 1400.0, 0);
-- Prêt remanié : crédit accordé 283k → ancré sur encours + 109 mois restants
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('eb50e14b-842c-56eb-9d6f-26ef93baa16a', 'ff6d0bbd-a798-5e0b-abbc-20b2bb7571c5', $$CIC$$, 52667.55, 1.38, 109, '2026-10-01'::date, 12.43, 514.38, 52667.55, '2035-11-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('80efbd1a-ab53-564e-9495-809dae540a3b', 'ef4afaf1-f008-5b8c-8e92-28b8ad56a7e1', $$13 RUE ROGER SCHIAFFINI$$, $$Marseille$$, '13003', $$TYPE 2/3$$, 0, 1, 0, 0, 0, 90000.0, 0, 290.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('6ffb3c1f-4b48-503e-a386-39450205b1f1', '80efbd1a-ab53-564e-9495-809dae540a3b', $$CIC$$, 47000.0, 0.93, 180, '2020-11-01'::date, 6.9, 279.85, 28982.34, '2035-11-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('aee2302d-25b0-526b-bf7c-5f37d420f56e', '09305380-f1a9-5362-8259-591f0cdcdeaf', $$Maison Mathieu$$, $$Marseille$$, '13000', $$Local professionnel$$, 0, 1, 0, 0, 0, 230000.0, 1198.8, 1750.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('f3992ef3-ce70-56a9-abe6-d0481a22992b', 'aee2302d-25b0-526b-bf7c-5f37d420f56e', $$Crédit Mutuel$$, 95000.0, 4.5, 144, '2023-06-01'::date, 22.06, 855.01, 72939.68, '2035-06-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('708fab1f-03f2-576a-b367-e5382732d00d', '09305380-f1a9-5362-8259-591f0cdcdeaf', $$221 bd de la libération$$, $$Marseille$$, '13000', $$Local commercial$$, 0, 1, 0, 0, 0, 160000.0, 1000.0, 0.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('7f0321ea-4170-515c-addc-ea44fcb11505', '708fab1f-03f2-576a-b367-e5382732d00d', $$CIC$$, 90000.0, 4.5, 132, '2025-04-01'::date, 51.3, 865.69, 79618.38, '2036-04-01'::date, 'RATE_BASED');

insert into properties (id, entity_id, address, ville, cp, type, surface, lots, prix_achat, travaux, frais_notaire, valeur_actuelle, loyer, taxe_fonciere, assurance) values ('cb3c381a-7ce8-5a51-9ea2-67bf88bbc9f6', '043b9a9f-a4b6-5373-843f-25ed1235a85f', $$33 chemin du petit pin vert$$, $$Marseille$$, '13000', $$Maison 140m2$$, 140, 1, 0, 0, 0, 630000.0, 840.0, 2400.0, 0);
insert into loans (id, property_id, banque, montant_initial, taux_annuel, duree_mois, date_debut, assurance_mensuelle, mensualite, capital_restant, fin_credit, amortization_model) values ('dcd93c67-53aa-546c-ba0a-000f7a98cc7f', 'cb3c381a-7ce8-5a51-9ea2-67bf88bbc9f6', $$LCL$$, 266771.42, 0, 299, '2024-11-01'::date, 0, 835.75, 266725.42, '2049-10-01'::date, 'EXCEL_FLAT');

insert into alerts (id, type, title, detail, severity) values ('e5dbec06-be85-55c2-a137-08c74dac3ee7', 'info', 'Données importées depuis Excel', 'Patrimoine Vision — amortissement flat aligné Excel (CRD − mensualité).', 'low');
