# Déploiement Vision / Patrimis — Frontend Netlify + Backend Supabase

## Architecture

- **Frontend** : Netlify (Vite / React)
- **Backend** : Supabase (Postgres + Auth + RLS)
- Plus besoin du serveur Fastify en production

## 1. Créer le projet Supabase

1. [supabase.com](https://supabase.com) → New project
2. Noter **Project URL** et **anon public key** (Settings → API)

## 2. Schéma + données Excel + RLS

Dans **SQL Editor**, exécuter dans cet ordre :

1. `supabase/schema.sql`
2. `supabase/seed.sql` ← biens / SCI / crédits depuis `VISION PATRIMOINE 030425.xlsx`
3. `supabase/rls.sql` ← accès par rôle (gérant / associé / banque)

## 3. Créer les utilisateurs Auth

Authentication → Users → Add user (ou invite).

Pour chaque compte, passer des **User Metadata** (raw_user_meta_data) :

| Email | role | name | first_name | initials | bank_name | shareholder_name |
|-------|------|------|------------|----------|-----------|------------------|
| johann@… | `GERANT` | Johann Faraut | Johann | JF | | |
| alexandre@… | `ASSOCIE` | Alexandre Niel | Alexandre | AN | | Alexandre Niel |
| lcl@… | `BANQUE` | LCL | LCL | LC | LCL | |

Exemple metadata JSON à la création :

```json
{
  "role": "GERANT",
  "name": "Johann Faraut",
  "first_name": "Johann",
  "initials": "JF"
}
```

Le trigger `handle_new_user` crée automatiquement la ligne `profiles`.

> Les banques du seed Excel sont à `À préciser` : le gérant doit renseigner le vrai nom de banque sur chaque crédit pour que le filtre RLS banque fonctionne.

## 4. Variables Netlify

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé anon |

Build : `npm run build` · Publish : `dist`

Dans Supabase → Authentication → URL Configuration :
- **Site URL** : `https://votre-site.netlify.app`
- **Redirect URLs** : `https://votre-site.netlify.app/**`

## 5. Page de connexion (prod)

- Email + mot de passe (Supabase Auth)
- Mot de passe oublié (lien email)
- Réinitialisation après clic sur le lien
- Pas de comptes démo affichés en production
- Accès refusé clairement si les variables Supabase manquent

Créer les utilisateurs dans **Authentication → Users** (pas d’inscription publique ouverte).

## 5. Qui voit quoi (RLS)

| Rôle | Lecture | Écriture |
|------|---------|----------|
| **Gérant** | Tout | Tout |
| **Associé** | SCI où il est actionnaire + biens/crédits liés | Non |
| **Banque** | Crédits à son nom + dossiers SENT/VIEWED destinés | Marquer dossier vu |

## 6. Contenu du seed Excel

Importés depuis la feuille « Vision patrimoine » :

- SCI BENEDUC, TROIKA, LA VISTA, Résidence Principale
- 13 biens (Marseille / Aubagne) avec loyers, taxes, CRD, mensualités, valeurs
- Parts Johann / Alexandre selon l’Excel

Non présents dans l’Excel (à compléter dans l’app) :

- Noms de banques réels
- Taux / durées d’origine si besoin d’amortissement recalculé
- Locataires

## 7. Dev local sans Supabase

Sans `VITE_SUPABASE_*`, l’app peut encore parler à l’ancien backend Docker (`VITE_API_URL`).  
En prod avec Supabase, les fixtures mock ne sont plus utilisées.
