# Writing agent — Fase 2 (contexto editor + reescritura)

## Convención

- **Extiende Fase 1** ([writing-agent-phase1.md](./writing-agent-phase1.md)): mismo `POST /api/agent` con campo opcional **`editorContext`** para anclar `get_context`.
- **`get_context`:** resuelve el texto completo desde **Postgres** (`versions.content` dentro del proyecto) o desde **`editorContext.versionText`** si coincide `versionId` (snapshot enviado por el cliente antes de sincronizar).
- **`rewrite_fragment`:** LLM texto plano (sin JSON-orquestador); política Dev/Prod igual que el orquestador — ver **[Fase 3](writing-agent-phase3.md)** y [`rewriteFragmentProvider`](../../lib/agent/infra/rewriteFragmentProvider.ts).

## Request (ampliación)

Además de `projectId`, `message`, `maxSteps`:

```json
{
  "editorContext": {
    "versionId": "uuid",
    "startIndex": 0,
    "endIndex": 200,
    "versionText": "opcional: contenido UTF-16 completo de esa versión"
  }
}
```

- `startIndex` / `endIndex`: índices **UTF-16** en el contenido cerrado (`String.length`-compatible).
- **`versionText`:** permite probar desde la UI cuando el texto aún solo vive en el cliente (`localStorage`).

## Tools

| Tool | Arguments (JSON del modelo / validación Zod en servidor) | Resultado |
|------|------------------------------------------------------------|-----------|
| `search_knowledge` | `query`, `project_id`, `top_k` | lista `content` / `source` / **`document_title`** / `score` |
| `get_context` | `version_id`, `start_index`, `end_index` | `before`, `selected`, `after`, `version_id` |
| `rewrite_fragment` | `fragment_text`, `context_before`, `context_after`, `instructions`; `style` opcional | `rewritten_text` (+ `note` si `AGENT_USE_STUB`) |

## Referencias en código

- Registro: [`lib/agent/tools/registry.ts`](../../lib/agent/tools/registry.ts)
- Contrato servidor: [`app/api/agent/route.ts`](../../app/api/agent/route.ts)
- UI mínima: [`app/agent/AgentConsole.tsx`](../../app/agent/AgentConsole.tsx)

## Fase 3

Lista completa (`extract_style`, `evaluate_text`, `compute_diff`, `create_version`, `list_reference_documents`, reintentos JSON): [writing-agent-phase3.md](./writing-agent-phase3.md).
