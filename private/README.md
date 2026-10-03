# Documents privés (non versionnés)

Dépose ici les tableaux d’amortissement (PDF) et fichiers Excel du client.

- `private/amortissements/` — TAM banque (PDF)
- `private/excel/` — exports / fichiers Excel source

Ces fichiers sont ignorés par Git (voir `.gitignore`). Ne jamais les committer ni les pousser sur GitHub.

## Import dans l’app

Dans **Crédits** (nouveau / modifier) ou **Bien → Crédit**, bouton **Importer un TAM (PDF)** :
lecture locale du PDF, extraction des champs (montant, taux, assurance, dates),
puis calcul Vision. **Le PDF n’est pas stocké** en base.
