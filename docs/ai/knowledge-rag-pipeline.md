# 🎯 Pipeline de conocimiento (RAG) y embeddings

## 💡 Convention

1. **Dónde vive la descripción técnica** — El flujo ingest → almacén → recuperación debe documentarse en este archivo dentro de **`docs/ai/`**, siguiendo el [estándar de documentación](../documentation-format.md). El archivo **`rag.md`** en la raíz actúa como **resumen y checklist**, con enlaces aquí para el detalle.
2. **Arquitectura de entrega (API)** — El objetivo a medio plazo del repositorio (véase [`AGENTS.md`](../../AGENTS.md)) es alinear rutas HTTP con **[Thin API Routes](../backend/thin-api-routes.md)**: handlers mínimos que delegan en **casos de uso** registrados por DI (**[reflect-metadata](../backend/api-routes-reflect-metadata.md)**, **[hexagonal / DDD](../backend/hexagonal-architecture.md)**). Hoy el MVP usa **`app/api/project/.../knowledge/*`** llamando directamente a Prisma y a `lib/knowledge/*` — es **adecuado para iterar**, pero **no cumple** aún ese contrato formal.
3. **Qué debe extraerse de la ruta cuando se refactorice** — Lógica a mover eventualmente hacia aplicación/domino según docs de backend:
   - ingest: validación de negocio, límites de tamaño/orquestación (no solo parse HTTP);
   - búsqueda: `searchKnowledgeForAgent` como caso de uso inyectable;
   - PATCH de documentos: reglas sobre `activeForAgent` + `status`.

La implementación factual (paths, enums, límites 12 MB / 80 páginas / chunk 4000, Ollama) se mantiene **en detalle** en `rag.md` (checklist y pasos) hasta que se consolide más bloque en este documento o en PRs de código.

---

## 🏆 Benefits

- Un solo lugar bajo **`docs/`** descubrible por equipos y agentes sin mezclar convenciones con narrativa sin estructura.
- Queda explícito **MVP vs objetivo**: se evita confundir el estado actual con los ejemplos de **contexts + DI** (`src/contexts/` + container) que ilustran otros documentos de `docs/backend/`.
- Al migrar a capas aplicación/dominio, este documento permite marcar checkpoints sin reescribir `rag.md` entero cada vez.

---

## 👀 Examples

### ✅ Good — Documentación alineada

- Índice de convenciones en `docs/` con carpetas (`backend/`, `database/`, **`ai/`**).
- `rag.md` en raíz: **≤ una página**, checklist + “ver `docs/ai/knowledge-rag-pipeline.md`”.
- Nueva pieza normativa sobre RAG: **nuevo archivo** en `docs/ai/` o ampliación de este, **no** un monolito sin secciones fijas ([documentation-format](../documentation-format.md)).

### ❌ Bad — Desalineaciones con `docs/`

- Tratar las rutas **`app/api/.../knowledge/route.ts`** actuales como si ya fueran “thin controllers con DI”, cuando el stack aún usa `getPrismaClient()` dentro del handler sin `import "reflect-metadata"`.
- Depositar todas las especificaciones de RAG únicamente en **`rag.md` raíz** sin entrada en **`docs/`** cuando ya existe política explícita de documentación centralizada.

---

## 🧐 Real world examples

| Área | Archivos MVP actuales | Objetivo según `docs/backend/*` |
|------|-----------------------|----------------------------------|
| Ingest | `lib/knowledge/ingestDocument.ts`, `POST` `app/api/project/[id]/knowledge/route.ts` | Caso de uso `IngestKnowledgePdf`; ruta sólo arma `multipart` → comando |
| Retrieval | `lib/knowledge/search.ts`, `GET` `.../knowledge/search/route.ts` | Caso de uso `SearchKnowledge`; gateway de embeddings inyectado |
| Reglas PATCH | `app/api/project/[id]/knowledge/[docId]/route.ts` | Regla dominio (“no activar si no `ready`”) tras filtro HTTP |

Referencias de código vivas (`lib/knowledge/agentContext.ts`, `lib/storage/knowledgeClient.ts`, `KnowledgeLibrary.tsx`): ver checklist en **`rag.md`**.

---

## 📌 Detalle técnico (implementación actual)

Resumen mínimo; para **tablas, rutas exactas y secuencias** mantener **`rag.md`** sincronizado o expandir esta sección en la misma PR que cambios de código.

| Fase | Qué ocurre |
|------|-------------|
| Subida | `POST` multipart a `…/project/:id/knowledge` |
| Ingest | `ingestPdfToKnowledge`: límites, PDF→texto, chunks, embeddings Ollama, Prisma JSON |
| Búsqueda | `searchKnowledgeForAgent`: `ready` + `activeForAgent`, coseno en memoria |

**Brecha explícita con [hexagonal](../backend/hexagonal-architecture.md):** no existe aún bounded context `knowledge/` bajo `src/contexts/`; el dominio vive disperso en `lib/knowledge/` y tipos Prisma.

---

## 🔗 Related agreements

- [Documentation Standard](../documentation-format.md)
- [Thin API Routes](../backend/thin-api-routes.md)
- [API Routes with reflect-metadata](../backend/api-routes-reflect-metadata.md)
- [Hexagonal Architecture](../backend/hexagonal-architecture.md)
