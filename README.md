# Portfolio — Alban Grelaud

Spécification : `SPEC.md`. Décisions techniques : `DECISIONS.md`.
**Installation, déploiement et utilisation de l'admin : `GUIDE.md`.**

## Démarrage local (sans Docker)

```
npm install
cp .env.example .env      # puis renseigner AUTH_SECRET, ADMIN_INITIAL_PASSWORD…
npm run db:start          # Prisma Postgres local (prisma dev)
npm run db:migrate
npm run db:seed
npm run dev
```

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `db:start`, `db:stop`, `db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:studio`.
