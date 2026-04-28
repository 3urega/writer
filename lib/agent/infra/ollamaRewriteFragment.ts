import type { RewriteFragmentInput } from "./openaiRewriteFragment";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

/**
 * Reescribe un fragmento vía Ollama `/api/chat` (respuesta texto plano).
 */
export async function rewriteFragmentWithOllama(
  input: RewriteFragmentInput
): Promise<string> {
  const baseUrl = normalizeBaseUrl(
    process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
  );
  const model =
    process.env.OLLAMA_REWRITE_MODEL?.trim() ??
    process.env.OLLAMA_AGENT_MODEL?.trim() ??
    "llama3.1:8b";

  const styleLine =
    input.style && Object.keys(input.style).length > 0
      ? `Estilo (pistas): ${JSON.stringify(input.style)}`
      : "";

  const userPayload = [
    "Contexto ANTES del fragmento:",
    "```",
    input.context_before || "(vacío)",
    "```",
    "",
    "Fragmento a reescribir:",
    "```",
    input.fragment_text,
    "```",
    "",
    "Contexto DESPUÉS del fragmento:",
    "```",
    input.context_after || "(vacío)",
    "```",
    "",
    styleLine,
    "",
    "Instrucciones del usuario o del editor:",
    input.instructions,
    "",
    "Devuelve únicamente el texto reescrito del fragmento, sin comillas ni explicaciones.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Eres un editor literario profesional en español. Respetas voz narrativa cuando el contexto la sugiere. Respondes solo con el texto pedido.",
        },
        { role: "user", content: userPayload },
      ],
      stream: false,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Ollama rewrite ${res.status}: ${body.slice(0, 400)}`);
  }

  let data: OllamaChatResponse;
  try {
    data = JSON.parse(body) as OllamaChatResponse;
  } catch {
    throw new Error("Ollama devolvió respuesta no JSON");
  }
  if (data.error) {
    throw new Error(`Ollama: ${data.error}`);
  }
  const text = data.message?.content?.trim();
  if (!text) {
    throw new Error("Ollama devolvió reescritura vacía");
  }
  return text;
}
