import type { DiscoveryClientMessage } from "@/lib/agent/application/runNarrativeDiscoveryTurn";

export async function runNarrativeDiscoveryRequest(input: {
  messages: DiscoveryClientMessage[];
}): Promise<{ reply: string }> {
  const r = await fetch("/api/narrative/discovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: input.messages }),
  });
  const data = (await r.json().catch(() => ({}))) as {
    reply?: string;
    error?: string;
  };
  if (!r.ok) {
    throw new Error(data.error ?? `Error ${r.status}`);
  }
  if (!data.reply?.trim()) {
    throw new Error("Respuesta vacía del compañero narrativo");
  }
  return { reply: data.reply };
}
