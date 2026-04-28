# Writing agent — Fase 1 (contrato HTTP y tool RAG)

## Convención

- **Alcance:** primer bucle del agente (`runWritingAgent`): un turno con **una** herramienta productiva `search_knowledge` apoyada en [`lib/knowledge/search.ts`](../../lib/knowledge/search.ts).
- **Entrega HTTP:** `POST /api/agent` con cuerpo JSON validado (Zod); la ruta sólo valida y delega (ver [thin API routes](../backend/thin-api-routes.md)).

## Request

```json
{
  "projectId": "uuid",
  "message": "texto del usuario / objetivo del turno",
  "maxSteps": 5
}
```

- `maxSteps` opcional (1–15, por defecto 5).

## Response

```json
{
  "reply": "string | null",
  "steps": [
    {
      "thought": "string | undefined",
      "toolName": "string | undefined",
      "toolArguments": {},
      "toolResultSummary": "string | undefined"
    }
  ],
  "stoppedReason": "final" | "max_steps"
}
```

## Tool `search_knowledge`

- **Entrada (arguments):** `query` (string), `project_id` (uuid, debe coincidir con el proyecto de la petición), `top_k` (1–20, default 5).
- **Salida:** `{ "results": [ { "content", "source", "document_title", "score" } ] }`; `source` = `document_id` (ver también [phase3](./writing-agent-phase3.md)).

## LLM (orquestador JSON)

Lógica centralizada en [`lib/agent/infra/selectAgentOrchestratorLlm.ts`](../../lib/agent/infra/selectAgentOrchestratorLlm.ts).

- **Desarrollo** (`NODE_ENV=development`): hay **`OPENAI_API_KEY`** → OpenAI; **si no** → Ollama (típ. local, `OLLAMA_BASE_URL` + `OLLAMA_AGENT_MODEL` o `llama3.1:8b`).
- **Producción**: hay **`OLLAMA_BASE_URL`** → Ollama primero; si no, **`OPENAI_API_KEY`** → OpenAI; **si no hay ninguno** → respuesta **503** (no stub).
- **`AGENT_USE_STUB=true`:** stub sin red.

## Siguientes fases (referencia)

- **Fase 2:** [`writing-agent-phase2.md`](writing-agent-phase2.md) (`editorContext`, `get_context`, `rewrite_fragment`).
- **Fase 3:** [`writing-agent-phase3.md`](writing-agent-phase3.md) — herramientas del pipeline completo (`extract_style`, `evaluate_text`, `compute_diff`, `create_version`, `list_reference_documents`, política uniforme para reescritura).
