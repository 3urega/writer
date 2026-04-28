Perfecto—esto ya es nivel implementación real.
Te voy a diseñar un set de tools mínimo pero potente (7), pensado específicamente para tu app de escritura con agente.
👉 Objetivo: que con esto puedas construir un agente completo y útil desde el día 1.

🧠 🧰 PRINCIPIOS DE DISEÑO
Antes de las tools:
cada tool = una responsabilidad clara
inputs y outputs = estructurados
el LLM = decide cuándo usarlas
nunca mezclar demasiada lógica en una sola tool

🚀 🧩 TOOLSET CORE (7 TOOLS)

1. 🔍 search_knowledge
📌 Qué hace
Busca en los PDFs (RAG)

🧠 Cuándo la usa el agente
necesita estilo
necesita contexto externo
referencias narrativas

📥 Input
{
  "query": "string",
  "project_id": "string",
  "top_k": 5
}

📤 Output (implementación)
{
  "results": [
    {
      "content": "string",
      "source": "doc_id",
      "document_title": "string visible",
      "score": 0.92
    }
  ]
}

Nota (`list`): además existe `list_reference_documents` con `{ project_id }` para enumerar biblioteca activa.

2. 🧠 extract_style
📌 Qué hace
Convierte texto en “reglas de estilo”

🧠 Cuándo la usa
Después de RAG

📥 Input
{
  "texts": ["string", "string"]
}

📤 Output
{
  "tone": "oscuro, tenso",
  "sentence_style": "frases medias",
  "descriptions": "sensoriales",
  "dialogue": "natural con subtexto"
}

3. ✍️ rewrite_fragment
📌 Qué hace
Reescribe el fragmento

🧠 Cuándo la usa
Siempre que hay edición

📥 Input
{
  "fragment_text": "string",
  "context_before": "string",
  "context_after": "string",
  "style": {
    "tone": "string"
  },
  "instructions": "string"
}

📤 Output
{
  "rewritten_text": "string"
}

4. 📊 evaluate_text
📌 Qué hace
Evalúa calidad del resultado

🧠 Cuándo la usa
Después de reescribir

📥 Input
{
  "original_text": "string",
  "rewritten_text": "string"
}

📤 Output
{
  "style_score": 8.2,
  "content_preservation": 9.1,
  "notes": ["mejor ritmo", "más tensión"]
}

5. 🌿 create_version
📌 Qué hace
Guarda nueva versión del capítulo

🧠 Cuándo la usa
Después de generar texto

📥 Input
{
  "chapter_id": "string",
  "base_version_id": "string",
  "new_content": "string",
  "metadata": {
    "source": "agent",
    "task": "rewrite_fragment"
  }
}

📤 Output
{
  "version_id": "string"
}

6. 🔀 compute_diff
📌 Qué hace
Calcula diferencias entre versiones

🧠 Cuándo la usa
Para mostrar cambios al usuario

📥 Input
{
  "old_version_id": "string",
  "new_version_id": "string"
}

📤 Output
{
  "changes": [
    {
      "type": "replace",
      "old": "string",
      "new": "string"
    }
  ]
}

7. 📄 get_context
📌 Qué hace
Obtiene contexto alrededor del fragmento

🧠 Cuándo la usa
SIEMPRE antes de reescribir

📥 Input
{
  "version_id": "string",
  "start_index": 0,
  "end_index": 200
}

📤 Output
{
  "before": "string",
  "selected": "string",
  "after": "string"
}

🧠 🔁 EJEMPLO REAL DE USO DEL AGENTE
Usuario:
“haz este párrafo más tenso con estilo del PDF”

El agente haría:
1. get_context
2. search_knowledge
3. extract_style
4. rewrite_fragment
5. evaluate_text
6. create_version
7. compute_diff

👉 Esto es literalmente un pipeline autónomo

💣 DIFERENCIADOR
La mayoría de apps hacen:
1 llamada → respuesta
Tú estás construyendo:
orquestación de herramientas + decisiones + estado

⚠️ DETALLE IMPORTANTE
No todas las tools tienen que ser “externas”.
Algunas pueden ser:
funciones internas
sub-agentes

🧭 EVOLUCIÓN FUTURA
Después puedes añadir:
suggest_improvements
merge_versions
rank_versions
auto_iterate

💬 FRASE CLAVE
“Las tools definen lo que el agente puede hacer; el LLM define cuándo y cómo hacerlo.”

🚀 SIGUIENTE PASO (muy recomendable)
Puedo hacerte ahora:
👉 el prompt del agent loop (decision engine) que usa estas tools
👉 o cómo implementarlo con tool calling real (OpenAI / SDK / pseudo código)
Y eso ya te deja listo para construirlo en serio.

Perfecto—vamos a aterrizar todo en algo implementable ya: un agent loop en TypeScript (Next.js) que:
funciona con cualquier LLM
soporta tool calling (real o simulado)
mantiene estado
es extensible
Nada de frameworks pesados. Esto es base sólida.

🧠 🏗️ ARQUITECTURA
API Route (Next.js)
   ↓
Agent Loop
   ↓
LLM (adapter)
   ↓
Tool Registry
   ↓
State

📁 1. ESTRUCTURA DE ARCHIVOS
/lib/agent/
  agent.ts
  types.ts
  tools.ts
  llm.ts
  parser.ts

🧩 2. TIPOS BASE
types.ts
export type AgentState = {
  goal: string
  messages: Message[]
  context?: any
  currentStep?: number
  maxSteps: number
}

export type Message = {
  role: "user" | "assistant" | "system"
  content: string
}

export type ToolCall = {
  name: string
  arguments: any
}

export type LLMResponse = {
  thought?: string
  action?: ToolCall
  final?: string
}

🔧 3. TOOL REGISTRY
tools.ts
type Tool = {
  name: string
  description: string
  execute: (args: any) => Promise<any>
}

export const tools: Tool[] = [
  {
    name: "rewrite_fragment",
    description: "Rewrite a text fragment with a given style",
    execute: async (args) => {
      // aquí llamarías a tu lógica real
      return {
        rewritten_text: `[REWRITTEN]: ${args.text}`
      }
    }
  },
  {
    name: "search_knowledge",
    description: "Search embeddings for relevant context",
    execute: async (args) => {
      return {
        results: ["example chunk 1", "example chunk 2"]
      }
    }
  }
]

export function getTool(name: string) {
  return tools.find(t => t.name === name)
}

🤖 4. LLM ADAPTER (MULTI MODELO)
llm.ts
export async function callLLM(messages: any[]): Promise<string> {
  // 🔁 aquí puedes cambiar proveedor:
  // OpenAI / Claude / local model

  // ejemplo simple mock:
  return `
  {
    "thought": "Necesito reescribir el texto",
    "action": {
      "name": "rewrite_fragment",
      "arguments": {
        "text": "Hola mundo"
      }
    }
  }
  `
}

🧠 5. PARSER (CLAVE PARA MULTI-LLM)
parser.ts
import { LLMResponse } from "./types"

export function parseLLMResponse(raw: string): LLMResponse {
  try {
    const json = JSON.parse(raw)
    return json
  } catch (e) {
    // fallback simple
    return {
      final: raw
    }
  }
}

🔁 6. AGENT LOOP (EL CORE)
agent.ts
import { callLLM } from "./llm"
import { parseLLMResponse } from "./parser"
import { getTool } from "./tools"
import { AgentState } from "./types"

export async function runAgent(state: AgentState) {
  let step = 0

  while (step < state.maxSteps) {
    step++

    const messages = [
      ...state.messages,
      {
        role: "system",
        content: `
You are an AI agent.

You can:
- think
- call tools
- respond

Respond ONLY in JSON:

{
  "thought": "...",
  "action": {
    "name": "...",
    "arguments": {}
  }
}

OR

{
  "final": "your final answer"
}
        `
      }
    ]

    const raw = await callLLM(messages)
    const response = parseLLMResponse(raw)

    // 🧠 si hay respuesta final
    if (response.final) {
      return response.final
    }

    // 🔧 si hay acción
    if (response.action) {
      const tool = getTool(response.action.name)

      if (!tool) {
        throw new Error(`Tool not found: ${response.action.name}`)
      }

      const result = await tool.execute(response.action.arguments)

      // 👇 guardamos resultado en memoria
      state.messages.push({
        role: "assistant",
        content: JSON.stringify({
          tool_result: result
        })
      })
    }
  }

  return "Max steps reached"
}

🌐 7. API ROUTE (Next.js)
/app/api/agent/route.ts
import { runAgent } from "@/lib/agent/agent"

export async function POST(req: Request) {
  const body = await req.json()

  const result = await runAgent({
    goal: body.goal,
    messages: [
      {
        role: "user",
        content: body.input
      }
    ],
    maxSteps: 5
  })

  return Response.json({ result })
}

🔥 8. EJEMPLO REAL DE USO
Request:
{
  "input": "Haz este texto más tenso"
}

Flujo:
1. LLM decide → rewrite_fragment
2. tool ejecuta
3. resultado vuelve al LLM
4. LLM responde final

💣 9. MEJORAS INMEDIATAS (SIGUIENTE PASO)
Añade:

🔹 memoria estructurada
state.context = {
  fragment: "...",
  style: "..."
}

🔹 validación de tools
zod / schema

🔹 retries si JSON falla

🔹 logging de pasos
(importantísimo para debug)

🧭 10. POR QUÉ ESTO ES BUENO
no dependes de OpenAI
simple
extensible
production-ready base

💬 FRASE FINAL
“El agent loop es solo un bucle que deja al LLM decidir qué hacer, mientras tú controlas el mundo real con tools.”

🚀 SIGUIENTE NIVEL
Si quieres, ahora te hago:
👉 integración REAL con tu caso (rewrite + RAG + versiones)
👉 o cómo conectar esto con tu editor (UI + diff + selección de fragmentos)
Y ahí ya tienes producto funcional de verdad.

