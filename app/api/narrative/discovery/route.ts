import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { RunNarrativeDiscoveryTurn } from "@/lib/agent/application/runNarrativeDiscoveryTurn";
import {
  NARRATIVE_DISCOVERY_UNAVAILABLE_MESSAGE,
  selectNarrativeDiscoveryLlm,
} from "@/lib/agent/infra/selectNarrativeDiscoveryLlm";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12_000),
});

const postBodySchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(24),
  })
  .strict();

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "cuerpo inválido", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const llm = selectNarrativeDiscoveryLlm();
    const useCase = new RunNarrativeDiscoveryTurn(llm);
    const result = await useCase.execute({
      messages: parsed.data.messages,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === NARRATIVE_DISCOVERY_UNAVAILABLE_MESSAGE) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    console.error("[api/narrative/discovery]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
