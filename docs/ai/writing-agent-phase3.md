# Writing agent — Fase 3 (estilo, evaluación, diff, persistencia)

## Convención

- **Extiende Fases 1 y 2** ([writing-agent-phase1](./writing-agent-phase1.md), [phase2](./writing-agent-phase2.md)): mismo `POST /api/agent`, opcional **`editorContext`** para `get_context` / `rewrite_fragment`.
- **Reintento único**: si la primera respuesta del orquestador no es JSON parseable válido (`final`/`action`), el servidor pide corrección antes de gastar otro paso del bucle (ver [`runWritingAgent`](../../lib/agent/application/runWritingAgent.ts)).

## Tools adicionales (registro completo)

| Tool | Arguments | Resultado breve |
|------|-----------|-----------------|
| `list_reference_documents` | `project_id` | `{ documents: [{ id, title }] }` — documentos `ready` + `activeForAgent` |
| `search_knowledge` | `query`, `project_id`, `top_k` | `content`, `source` (id doc), **`document_title`**, `score` |
| `extract_style` | `texts` (array) | `tone`, `sentence_style`, `descriptions`, `dialogue` (LLM JSON) |
| `evaluate_text` | `original_text`, `rewritten_text` | `style_score`, `content_preservation`, `notes` |
| `compute_diff` | `old_text` + `new_text`, **o** `old_version_id` + `new_version_id` + `project_id` | `changes`: `{ type: "replace", old, new }[]` (por líneas) |
| `create_version` | `chapter_id`, `base_version_id`, `new_content`, `project_id`, `metadata?` | `{ version_id }` — persiste vía [`saveProjectToPostgres`](../../lib/storage/postgresProjectStore.ts); **no** actualiza `mainVersionId` |

`get_context` y `rewrite_fragment` — ver Fase 2.

## LLM de herramientas (no orquestador)

- `extract_style` y `evaluate_text` usan [`selectToolJsonLlm`](../../lib/agent/infra/selectToolJsonLlm.ts): con `AGENT_USE_STUB` devuelven JSON fijo; en caso contrario la **misma política** que el orquestador ([`selectAgentOrchestratorLlm`](../../lib/agent/infra/selectAgentOrchestratorLlm.ts)).

## Reescritura (`rewrite_fragment`)

- Política alineada con el orquestador en [`rewriteFragmentProvider`](../../lib/agent/infra/rewriteFragmentProvider.ts): dev + OpenAI → OpenAI; dev sin OpenAI → Ollama; producción → `OLLAMA_BASE_URL` antes que `OPENAI_API_KEY`; sin proveedor válido lanza error.
- Variables opcionales: **`OLLAMA_REWRITE_MODEL`** (fallback a `OLLAMA_AGENT_MODEL`), **`OPENAI_MODEL`**.

## Referencias en código

- Servicio **`createAgentVersion`**: [`lib/agent/application/createAgentVersion.ts`](../../lib/agent/application/createAgentVersion.ts)
- Herramientas nuevas en [`lib/agent/tools/`](../../lib/agent/tools/)
