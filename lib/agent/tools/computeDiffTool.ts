import { diffLines } from "diff";
import { z } from "zod";

import { findVersion } from "@/lib/domain/versioning";
import { loadProjectFromPostgres } from "@/lib/storage/postgresProjectStore";

import type { AgentTool } from "../ports/agentTool";
import type { AgentToolContext } from "../ports/types";

const argsSchema = z
  .object({
    old_text: z.string().max(500_000).optional(),
    new_text: z.string().max(500_000).optional(),
    old_version_id: z.string().uuid().optional(),
    new_version_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    const hasText = v.old_text != null && v.new_text != null;
    const hasIds =
      v.old_version_id != null &&
      v.new_version_id != null &&
      v.project_id != null;
    if (hasText === hasIds) {
      ctx.addIssue({
        code: "custom",
        message:
          "Debes pasar old_text + new_text, o bien old_version_id + new_version_id + project_id.",
      });
    }
  });

export type ComputeDiffChange = {
  type: "replace";
  old: string;
  new: string;
};

function lineDiffToReplaceChanges(oldStr: string, newStr: string): ComputeDiffChange[] {
  const parts = diffLines(oldStr, newStr);
  const out: ComputeDiffChange[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    if (p.removed && next?.added) {
      out.push({ type: "replace", old: p.value, new: next.value });
      i++;
    } else if (p.removed) {
      out.push({ type: "replace", old: p.value, new: "" });
    } else if (p.added) {
      out.push({ type: "replace", old: "", new: p.value });
    }
  }
  return out;
}

/**
 * Diff por líneas entre dos textos o entre dos snapshots de versión del proyecto.
 */
export const computeDiffTool: AgentTool = {
  name: "compute_diff",
  description:
    "Compara dos textos y devuelve cambios tipo reemplazo por bloques de líneas. " +
    "O bien { old_text, new_text }, o { old_version_id, new_version_id, project_id } (uuid del proyecto de la sesión).",

  async execute(
    args: unknown,
    ctx: AgentToolContext
  ): Promise<{ changes: ComputeDiffChange[] }> {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`compute_diff: ${z.treeifyError(parsed.error)}`);
    }
    const v = parsed.data;
    let oldStr: string;
    let newStr: string;

    if (v.old_text != null && v.new_text != null) {
      oldStr = v.old_text;
      newStr = v.new_text;
    } else {
      const projectId = v.project_id!;
      if (projectId !== ctx.projectId) {
        throw new Error("compute_diff: project_id no coincide con el proyecto de la sesión");
      }
      const project = await loadProjectFromPostgres(projectId);
      if (!project) {
        throw new Error("compute_diff: proyecto no encontrado");
      }
      let oldV: ReturnType<typeof findVersion> | undefined;
      let newV: ReturnType<typeof findVersion> | undefined;
      for (const ch of project.chapters) {
        const o = findVersion(ch, v.old_version_id!);
        const n = findVersion(ch, v.new_version_id!);
        if (o) oldV = o;
        if (n) newV = n;
      }
      if (!oldV || !newV) {
        throw new Error(
          "compute_diff: no se encontraron ambas versiones en el mismo proyecto"
        );
      }
      oldStr = oldV.content;
      newStr = newV.content;
    }

    return { changes: lineDiffToReplaceChanges(oldStr, newStr) };
  },
};
