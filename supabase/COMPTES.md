# Comptes Associé / Banque — guide simple

Pour que Johann (gérant) puisse créer des comptes dans l’app, il faut **2 actions une seule fois** dans Supabase.  
Ensuite tout se fait dans Vision → menu **Comptes**.

---

## Étape 1 — Préparer la base (SQL)

1. Va sur [https://supabase.com](https://supabase.com) → ton projet Vision
2. Menu de gauche → **SQL Editor**
3. Clique **New query**
4. Ouvre le fichier du projet : `supabase/migrate_user_access.sql`
5. **Copie tout** le contenu → colle-le dans Supabase
6. Clique **Run** (en bas à droite)

✅ Si tu vois « Success », c’est bon.

Ça ajoute juste 2 colonnes pour dire *quelles pages* et *quelles SCI* chaque compte peut voir.

---

## Étape 2 — Activer la création de comptes (fonction)

L’app ne peut pas créer un login toute seule : il faut une petite fonction côté Supabase.

### 2a. Récupérer la clé secrète

1. Dans Supabase → **Project Settings** (engrenage)
2. **API**
3. Copie la clé **`service_role`** (pas la clé `anon`)  
   ⚠️ Ne la mets jamais dans le code front / Netlify public — uniquement dans les secrets Supabase ci-dessous.

### 2b. Déployer la fonction (sur ton Mac, dans le dossier Vision)

Ouvre le Terminal, puis :

```bash
cd "/Users/meriemzahzouh/Epitech/App perso/Vision"

# 1) Se connecter à Supabase
supabase login

# 2) Lier ce dossier à ton projet (Settings → General → Reference ID)
supabase link --project-ref REF

# 3) Publier la fonction
#    (SUPABASE_SERVICE_ROLE_KEY est déjà fournie automatiquement — ne pas la setter)
supabase functions deploy manage-user --no-verify-jwt
```

✅ Si la dernière commande dit `Deployed Functions ... manage-user`, c’est bon.

> Si la commande `supabase` n’existe pas :  
> `brew install supabase/tap/supabase`

---

## Étape 3 — Utiliser dans l’app

1. Connecte-toi avec le compte **gérant** (Johann)
2. Menu → **Comptes**
3. Choisis **Associé** ou **Banque**
4. Remplis email, nom, mot de passe temporaire
5. Choisis :
   - Associé → quelle personne (quote-part) + quelles SCI + quelles pages
   - Banque → quelle banque + quelles pages
6. **Créer le compte**
7. Donne à la personne : **email + mot de passe** (une seule fois)

Elle se connecte sur le même site Vision. Elle ne voit que ce que tu as coché.

---

## En cas d’erreur

| Message | Cause probable |
|--------|----------------|
| « Action compte impossible » / fonction | Étape 2 pas faite ou mal déployée |
| « Réservé au gérant » | Tu n’es pas connectée en GERANT |
| Erreur SQL colonne déjà existante | Étape 1 déjà faite → OK, ignore |

---

## Résumé ultra-court

1. **SQL** `migrate_user_access.sql` → Run dans Supabase  
2. **Terminal** → `supabase functions deploy manage-user` (+ secret service_role)  
3. **App** → menu Comptes → créer Associé / Banque  
