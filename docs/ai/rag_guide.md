# RAG y embeddings — referencia operativa

**Alineación con `docs/`:** la convención (dónde documentar, MVP vs thin routes + DI) está en [`docs/ai/knowledge-rag-pipeline.md`](docs/ai/knowledge-rag-pipeline.md). Este archivo describe **qué hace el código hoy**, **en qué archivos** vive cada paso y **checklist** de desarrollo.

---

La visión de “estilo literario vs solo tema” está al final como **dirección de producto**; gran parte sigue pendiente de implementación.

---

## Resumen ejecutivo

| Fase | Dónde | Qué ocurre |
|------|-------|-------------|
| **Subida de PDF** | `POST /api/project/:id/knowledge` | Body `multipart/form-data` con campo `file` (opcionalmente `title`). |
| **Ingesta** | `lib/knowledge/ingestDocument.ts` | PDF → texto → chunks → embedding por chunk (Ollama) → Postgres (`ready`/`error`). |
| **Embedding** | `lib/ai/embedding/*`, `OLLAMA_*` | Cada texto (chunk o query) va a `getEmbeddingProvider().embed(...)`. Proveedor actual: Ollama. |
| **Almacenamiento** | Prisma, tablas `knowledge_documents` + `knowledge_chunks` | Vectores en columna **`Json`** (array de números), no pgvector en el MVP. |
| **Filtrado para el agente** | `knowledge_documents` | Solo documentos **`status === "ready"`** y **`activeForAgent === true`**. Activación vía PATCH o UI después de ingestado. |
| **Retrieval / RAG** | `lib/knowledge/search.ts` | Embedding de la **query**, carga chunks candidatos desde BD, **similitud coseno en memoria**, top‑K por score. |

---

## 1. Ingesta (upload → embeddings)

### 1.1 Entrada HTTP

- **Ruta:** `app/api/project/[id]/knowledge/route.ts`
- **Método:** `POST`
- Comprueba que el `projectId` exista, que el body sea `multipart/form-data`, campo **`file`**, y que parezca PDF (extensión o `Content-Type`).
- Convierte el archivo a `Buffer` y llama a `ingestPdfToKnowledge({ projectId, buffer, sourceFilename, titleOverride? })`.

### 1.2 `ingestPdfToKnowledge` (`lib/knowledge/ingestDocument.ts`)

Orden de operaciones:

1. **Tamaño máximo:** `MAX_FILE_BYTES = 12 * 1024 * 1024` (12 MB). Si se supera, lanza error antes de tocar la base.
2. **Fila `knowledge_document`:** se crea con `status: "pending"`, `activeForAgent: false`, título desde `titleOverride` o `defaultTitleFromFilename` (`lib/knowledge/chunking.ts`).
3. **Texto:** `extractTextFromPdf(buffer, { maxPages: 80 })` en `lib/knowledge/parsePdf.ts`  
   - Usa `pdf-parse` (import dinámico; `serverExternalPackages` en `next.config.ts`).
4. **Chunking:** `splitIntoParagraphChunks(text)` en `lib/knowledge/chunking.ts`  
   - Normaliza saltos de línea, parte por **bloques separados con doble salto** (`\n\n+`).  
   - Si un párrafo supera `maxChunkChars` (por defecto **4000**), se parte en rebanadas de ese tamaño.
5. **Si no hay chunks:** el documento pasa a `status: "error"` con mensaje explícito y termina.
6. **Embeddings:** `getEmbeddingProvider()` (`lib/ai/embedding/index.ts` → `createOllamaEmbeddingProvider`) y, **por cada chunk**, `await provider.embed(p.text)` (secuencial en un bucle).
7. **Persistencia:** transacción Prisma con `knowledgeChunk.createMany` (texto + `embedding` como array) y `knowledgeDocument.update` a `status: "ready"`.  
8. **Errores:** cualquier excepción actualiza el documento a `status: "error"` y `errorMessage` truncado; el error se relanza.

### 1.3 Proveedor de embeddings

- **Interfaz:** `lib/ai/embedding/types.ts` — `embed(text: string) => Promise<number[]>`.
- **Implementación:** `lib/ai/embedding/ollamaEmbedding.ts` — HTTP a Ollama (`/api/embed` o `/api/embeddings`), modelo y dimensión validados frente a `EMBEDDING_DIMENSION`.
- **Singleton en proceso:** `getEmbeddingProvider()` cachea la instancia (`lib/ai/embedding/index.ts`).

Variables típicas (ver `.env.example`):

- `OLLAMA_BASE_URL` (por defecto `http://127.0.0.1:11434`)
- `OLLAMA_EMBEDDING_MODEL` (p. ej. `nomic-embed-text`)
- `EMBEDDING_DIMENSION` (p. ej. `768` para `nomic-embed-text`)

Las llamadas son **desde el servidor Node** (Route Handlers), no desde el navegador.

---

## 2. Recuperación (RAG semántico)

### 2.1 Función núcleo: `searchKnowledgeForAgent`

**Archivo:** `lib/knowledge/search.ts`.

1. **Query vacía** → devuelve `[]`.
2. **`qVec = await provider.embed(query)`** — mismo modelo/canal que en ingest (**importante**: query y chunks deben ser **comparables**; mismo proveedor/dimensión).
3. **`knowledgeDocument.findMany`** con:

   - `projectId` dado  
   - `status: "ready"`  
   - `activeForAgent: true`  

4. **`knowledgeChunk.findMany`** con `documentId` en ese conjunto (solo `id`, `documentId`, `text`, `embedding`).
5. Por cada chunk: **`jsonToFloatArray`** (`lib/knowledge/cosine.ts`) para leer el vector del JSON → **`cosineSimilarity(qVec, ev)`** (`lib/knowledge/cosine.ts`).
6. Ordenar por **`score`** descendente y devolver **`topK`** hits (`KnowledgeChunkHit`: `documentId`, `documentTitle`, `chunkId`, `text`, `score`).

**Limitaciones actuales (MVP):**

- No hay **pgvector ni índice ANN**: se traen **todos** los chunks de los documentos activos y se puntúan en RAM. Vale para bibliotecas pequeñas; no escala a millones de fragmentos sin cambiar modelo (p. ej. pgvector + `ORDER BY embedding <=>` o servicio externo).
- No hay **metadatos de estilo**, **dos embeddings** ni **re-ranking híbrido**; solo similitud coseno contenido/consulta.

### 2.2 API HTTP de prueba

- **GET** `app/api/project/[id]/knowledge/search/route.ts`
- Query string: `q` (texto obligatorio, hasta 2000 caracteres), `topK` opcional (1–20, default **5**).
- Devuelve `{ hits: [...] }` usando la misma `searchKnowledgeForAgent`.

### 2.3 Capa “agente” (preparada, no necesariamente conectada)

- **`lib/knowledge/agentContext.ts`**
  - `getActiveReferenceDocuments(projectId)` — lista docs `ready` + `activeForAgent`.
  - `searchKnowledgeForAgentProject(projectId, query, { topK })` — wrapper de la búsqueda.

Convierte el contrato que podrían usar tools de un futuro agente; **busca si ya hay llamadas desde rutas del asistente** al integrar herramientas.

---

## 3. Datos persistidos (Prisma)

Esquema relevante (`prisma/schema.prisma`, tablas `knowledge_documents` / `knowledge_chunks`):

- **`KnowledgeDocument`:** vínculo a `projectId`, `title`, `sourceFilename`, `status` (`pending` | `ready` | `error`), `errorMessage`, `activeForAgent`, timestamps.
- **`KnowledgeChunk`:** `documentId`, `chunkIndex`, `text`, **`embedding`** (`Json`), `metadata` opcional (no usado de forma destacada en el flujo anterior).

Índices en `projectId` + `status` / `activeForAgent` para listados y filtros.

---

## 4. UI y cliente (`fetch`)

- **`app/_components/KnowledgeLibrary.tsx`** — subida/listado/toggles (según implementación actual).
- **`lib/storage/knowledgeClient.ts`**
  - `fetchKnowledgeDocuments` → GET `.../knowledge`
  - `uploadKnowledgePdf` → POST `.../knowledge`
  - `patchKnowledgeDocument` → PATCH `.../knowledge/:documentId` (título, `activeForAgent`)

**PATCH** (`app/api/project/[id]/knowledge/[docId]/route.ts`): no permite `activeForAgent: true` si el documento no está `ready` (409).

Hasta activar **`activeForAgent`**, ese documento **no participa** en `searchKnowledgeForAgent`.

---

## 5. Criterios prácticos (por qué 12 MB, 80 páginas, chunk 4000…)

| Decisión | Valor típico | Motivo práctico |
|----------|----------------|-----------------|
| Tamaño PDF | 12 MB en código (`ingestDocument`) | Limitar RAM, tiempo de respuesta por request y carga sobre Ollama/DB. Subir implica revisar timeouts y límites del host (body size). |
| Páginas PDF | `maxPages: 80` | Acotar `pdf-parse` y texto extraíble. |
| Caracteres por chunk | 4096 defecto (`chunking.ts`) | Límite razonable para modelos de embedding y tamaño JSON en Postgres. |

---

## 6. Dirección de producto (no implementado igual hoy)

Objetivo a largo plazo para **escritura asistida**: recuperar patrones **cómo está escrito** (tono, ritmo, tipo de párrafo), no solo hechos. Direcciones posibles mencionadas en conversaciones previas:

- Chunking guiado por diálogo / narración / descripción (más que solo párrafos y recorte por longitud).
- Metadatos o segundo embedding “de estilo”.
- Queries múltiples (contenido + estilo) y mezcla α/β en el score.

El pipeline **actual** se acerca en que el chunk es texto continuo extrajdo del PDF con separación por párrafos: es una base, no el diseño final de “estilo”.

---

## 7. Checklist rápido para desarrolladores

1. Postgres accesible; si usas Accelerate para `DATABASE_URL`, el pool del adaptador `pg` requiere **`DIRECT_DATABASE_URL`** (véase `lib/db/prisma.ts` y `npm run db:diagnose`).
2. Ollama en marcha con el modelo de embedding indicado (`ollama pull …`).
3. Subir PDF → esperar **`ready`** en la biblioteca → activar **“para el agente”** si debe indexarse para búsqueda.
4. Probar retrieval: GET `…/api/project/:id/knowledge/search?q=…&topK=5`.


ejemplo
Está preparado para **RAG semántico sobre la biblioteca de PDFs del proyecto**: dado un **texto de consulta en lenguaje natural**, se genera un embedding de esa consulta, se compara (coseno) con los embeddings de los chunks ya indexados y se devuelven los **fragmentos más parecidos en significado**, no por coincidencia literal de palabras.

**Filtros importantes** (en `search.ts`): solo cuenta lo que esté `status: ready` y `activeForAgent: true`; el resto no entra en la búsqueda.

### Para qué sirve (caso de uso)

- **Asistente de escritura** (“escritor con memoria”): el agente o el usuario formulen una pregunta tipo *“¿qué dice la guía sobre ritmo de diálogo?”* o *“ejemplos de descripción de interiores”* y el sistema recupere párrafos del PDF que sean **semánticamente cercanos**, para usarlos como **contexto** al generar o revisar texto.
- **Prueba manual / depuración**: el endpoint `GET /api/project/:id/knowledge/search?q=...` sirve para validar que ingest + embeddings + búsqueda funcionan sin pasar por la UI del asistente.

Hoy, en el repo, la búsqueda está **expuesta por API** y **`searchKnowledgeForAgentProject` en `agentContext.ts` está pensada para herramientas del agente**, pero **no vi** integración aún en flujos tipo “chat que llama a la tool” (solo el contrato listo).

### Ejemplo concreto de búsqueda

1. Has subido un PDF (p. ej. un manual de estilo) y el documento está **listo** y **activo para el agente**.
2. Llamas:

`GET /api/project/<UUID_DEL_PROYECTO>/knowledge/search?q=Escena%20con%20tensi%C3%B3n%20entre%20dos%20personajes&topK=3`

3. Internamente: `embed("Escena con tensión entre dos personajes")` → vector de la query; se puntúan todos los chunks elegibles; la respuesta incluye **trozos de texto** (`text`) y **score** (similitud).

**Uso:** esos 3 fragmentos se podrían inyectar en el prompt de un LLM para decir: *“mantente alineado con estos pasajes del material de referencia”* o *“imita el registro que ves aquí”*.

En una frase: la búsqueda está preparada para **recuperar, por significado, pasajes de tus PDFs de referencia** y usarlos como **contexto para el asistente**; el “producto” típico es **RAG para escritura asistida**, no un buscador web.