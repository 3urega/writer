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
- **Patrón de referencia (obligatorio para código nuevo):** DDD táctico + arquitectura hexagonal documentada en [`docs/backend/hexagonal-architecture.md`](docs/backend/hexagonal-architecture.md): dominio sin dependencias de framework, **un caso de uso por clase** en aplicación, infraestructura detrás de interfaces, rutas HTTP **finas** (sin lógica de negocio en el handler). Ver también [`docs/backend/thin-api-routes.md`](docs/backend/thin-api-routes.md).
- **Estructura de carpetas objetivo (docs):** `src/contexts/{bounded-context}/…` con `domain/`, `application/`, `infrastructure/`; API en `src/app/api/`. Parte del repo aún está en `app/` y `lib/` por **herencia MVP**; **no** es excusa para seguir añadiendo capas ad hoc sin leer `docs/`.
- **Capa actual (MVP / legado):** ChapterForge en `app/_components/chapterforge/`; editor en `/write`; dominio en `lib/domain/`; persistencia híbrida `localStorage` + API en `app/api/project/`; Postgres vía Prisma en `lib/db/`, `lib/storage/postgresProjectStore.ts`. Esto convive con el objetivo DDD hasta migrar; **nuevas** piezas de backend deben acercarse al modelo de `docs/`, no alejarse.
- **Variables de entorno:** `DATABASE_URL` (servidor) y, opcional, `NEXT_PUBLIC_DEFAULT_PROJECT_ID` (UUID); ver `.env.example`. No commitear secretos.

---

# Regla obligatoria: `docs/` antes de generar código

**Antes de crear o modificar** archivos de **infraestructura, aplicación (casos de uso), API, base de datos o convenciones de estilo**, el agente (o desarrollador) **debe** abrir y seguir los documentos que correspondan a ese tipo de cambio listados más abajo. No implementar primero y consultar después.

Si la tarea implica más de una área (p. ej. endpoint + modelo Prisma), se leen **todas** las entradas relevantes del mapa antes de escribir código.

### Qué cuenta como “infraestructura” o trabajo que exige docs

- Nuevo módulo o carpeta para persistencia, clientes HTTP, gateways, parsers, embeddings, filesystem, mensajería.
- Nueva ruta **`app/api/**` / `src/app/api/**`** o cambio sustancial en handlers.
- Nuevos repositorios Prisma/servicios que acceden a BD o APIs externas.
- Nuevo esquema o migraciones: convenciones de tablas/texto/not null.
- Cualquier “servicio aplicación” nuevo que orqueste reglas de negocio (debe alinearse con casos de uso + hexagonal, no pegar TODO en la ruta).

### Mapa tipo de trabajo → documentos **obligatorios** (leer antes de implementar)

| Tipo de cambio | Lee primero (`docs/`) |
|----------------|----------------------|
| Cualquier ruta API o contrato HTTP | [`backend/thin-api-routes.md`](docs/backend/thin-api-routes.md), [`backend/api-routes-reflect-metadata.md`](docs/backend/api-routes-reflect-metadata.md) (primer import `import "reflect-metadata"` si usas DI) |
| Casos de uso, capas aplicación/dominio, bounded context | [`backend/hexagonal-architecture.md`](docs/backend/hexagonal-architecture.md) |
| Contenedor DI, `@Service()`, wiring | [`backend/dependency-injection-diod.md`](docs/backend/dependency-injection-diod.md) |
| Modelo Prisma / tablas / columnas | [`database/table-naming-singular-plural-convention.md`](docs/database/table-naming-singular-plural-convention.md), [`database/text-over-varchar-char-convention.md`](docs/database/text-over-varchar-char-convention.md), [`database/not-null-fields.md`](docs/database/not-null-fields.md) |
| Pipeline RAG / conocimiento | [`ai/knowledge-rag-pipeline.md`](docs/ai/knowledge-rag-pipeline.md) + enlaces ahí a backend |
| Estilo TS / firmas explícitas / lint | [`code-style.md`](docs/code-style.md) |
| **Nuevo** documento de convención en el repo | [`documentation-format.md`](docs/documentation-format.md) |

Si hay duda entre dos docs, léelos ambos antes de proseguir.

### Comportamiento esperado del agente

1. **Identificar** qué archivo(s) va a crear o tocar de la lista anterior.
2. **Leer** con la herramienta de lectura los `.md` correspondientes del mapa (no sólo el título).
3. **Implementar** conforme a esos patrones DDD/onion/ausencia de lógica en rutas donde aplique.
4. Si el repo **aún no tiene** `src/contexts/` o DI configurado pero el cambio es backend nuevo: **preferir** introducir el caso de uso y la firma hexagonal donde el proyecto ya permita acoplarlos (por ejemplo mover lógica a funciones/objetos de aplicación claros separados del handler), en lugar de amontonar en `route.ts` “porque así estaba antes”.

---

# Documentation

- Todas las convenciones vivas están bajo [`docs/`](docs/).
- **No** cargar todos los ficheros sin criterio: usa el **mapa de la sección anterior** según la tarea.
- Árbol de referencia rápida:

```
docs/
├── ai/
│   └── knowledge-rag-pipeline.md
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
