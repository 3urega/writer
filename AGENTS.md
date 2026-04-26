# Useful commands

```bash
npm run dev
npm run build          # prisma generate && next build
npm run lint
npm run db:generate    # prisma generate
npm run db:push        # prisma db push (dev; requiere DATABASE_URL)
```

# Architecture

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind.
- **Objetivo de producto:** asistente de escritura con versionado por snapshot y fragmentos; ver [domain.md](domain.md).
- **Estructura actual (MVP):**
  - UI y rutas en `app/` (no hay `src/app/` aún); componentes p. ej. `app/_components/`.
  - Dominio y tipos en `lib/domain/`.
  - Persistencia MVP en cliente: `lib/storage/projectStore.ts` (`localStorage`) + interfaz `ProjectStore`.
  - Postgres/Prisma (servidor, rutas o acciones en el futuro): `prisma/`, `lib/db/prisma.ts`, `lib/storage/postgresProjectStore.ts`. Cliente generado en `lib/generated/prisma` (ignorado en git; se regenera con `postinstall` / `db:generate`).
- **A medio plazo (documentado en [docs/](docs/)):** alinear con Onion/DDD: mover a `src/app/`, `src/app/api/`, y `src/contexts/` con casos de uso; ver [docs/backend/hexagonal-architecture.md](docs/backend/hexagonal-architecture.md).
- **Variables de entorno:** conexión en `DATABASE_URL` (ver `.env.example`); no commitear secretos.

# Documentation

- Detailed conventions with examples live in `docs/`.
- **Do NOT read all docs upfront.**
- When working on a task, use this map to find and read only the docs relevant to your task:

```
docs/
├── code-style.md
├── documentation-format.md
├── backend/
│   ├── api-routes-reflect-metadata.md
│   ├── dependency-injection-diod.md
│   ├── hexagonal-architecture.md
│   └── thin-api-routes.md
├── database/
│   ├── not-null-fields.md
│   ├── table-naming-singular-plural-convention.md
│   └── text-over-varchar-char-convention.md
└── testing/
    ├── mock-objects.md
    └── object-mothers.md
```
