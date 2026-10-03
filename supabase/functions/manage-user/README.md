# Edge Function `manage-user`

Création / mise à jour / suppression de comptes **Associé** et **Banque** (réservé au rôle GERANT).

## Prérequis

1. Exécuter `supabase/migrate_user_access.sql` dans le SQL Editor Supabase.
2. Secrets de la fonction (déjà souvent présents en local via `supabase secrets`) :

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... 
# SUPABASE_URL et SUPABASE_ANON_KEY sont injectés automatiquement sur le cloud
```

## Déploiement

```bash
supabase functions deploy manage-user --no-verify-jwt
```

`--no-verify-jwt` : la vérification JWT + rôle GERANT est faite **dans** la fonction (sinon le gateway peut bloquer avant).

## Appel depuis l’app

`supabase.functions.invoke('manage-user', { body: { action: 'create', ... } })`
