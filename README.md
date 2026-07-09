
  # Vision Patrimoine

  Application de gestion patrimoniale immobilière avec calcul automatique des prêts bancaires.

  ## Fonctionnalités

  - Dashboard patrimonial (comme l'Excel de référence)
  - Prêts bancaires : saisie minimale (montant, taux, durée, date) → mensualité, CRD, intérêts calculés automatiquement
  - Cash-flow locatif par bien et par SCI
  - Stack full-stack dockerisée

  ## Démarrage avec Docker

  ```bash
  docker compose up --build
  ```

  | Service   | URL                        |
  |-----------|----------------------------|
  | Frontend  | http://localhost:5173      |
  | Backend   | http://localhost:3001      |
  | Mailpit   | http://localhost:8025      |
  | PostgreSQL| localhost:5432             |

  ## Développement local

  ```bash
  cp .env.example .env
  cd backend && npm install && npm run db:push && npm run db:seed && npm run dev
  pnpm install && pnpm dev
  ```

  ## Running the code (frontend seul)

  Run `pnpm install` to install the dependencies.

  Run `pnpm dev` to start the development server.
  