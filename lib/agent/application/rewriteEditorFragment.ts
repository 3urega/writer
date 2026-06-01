import { getPrismaClient } from "@/lib/db/prisma";

import { rewriteFragmentWithConfiguredProvider } from "../infra/rewriteFragmentProvider";

export type RewriteEditorFragmentInput = {
  projectId: string;
  instructions: string;
  editorContext: {
    versionId: string;
    startIndex: number;
    endIndex: number;
    versionText: string;
  };
};

export type RewriteEditorFragmentResult = {
  rewrittenText: string;
};

/**
 * Reescribe un fragmento del editor usando el proveedor LLM configurado (sin bucle de agente).
 */
export async function rewriteEditorFragment(
  input: RewriteEditorFragmentInput
): Promise<RewriteEditorFragmentResult> {
  const project = await getPrismaClient().project.findUnique({
    where: { id: input.projectId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Proyecto no encontrado");
  }

  const { versionText, startIndex, endIndex } = input.editorContext;
  if (endIndex <= startIndex) {
    throw new Error("La selección del fragmento es inválida");
  }
  if (endIndex > versionText.length) {
    throw new Error("Los índices de selección no coinciden con el texto del editor");
  }

  const fragment_text = versionText.slice(startIndex, endIndex);
  const context_before = versionText.slice(0, startIndex);
  const context_after = versionText.slice(endIndex);

  const rewrittenText = await rewriteFragmentWithConfiguredProvider({
    fragment_text,
    context_before,
    context_after,
    instructions: input.instructions.trim(),
  });

  return { rewrittenText };
}
