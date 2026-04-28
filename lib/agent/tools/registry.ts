import type { AgentTool, AgentToolRegistry } from "../ports/agentTool";

import { computeDiffTool } from "./computeDiffTool";
import { createVersionTool } from "./createVersionTool";
import { evaluateTextTool } from "./evaluateTextTool";
import { extractStyleTool } from "./extractStyleTool";
import { getContextTool } from "./getContextTool";
import { listReferenceDocumentsTool } from "./listReferenceDocumentsTool";
import { rewriteFragmentTool } from "./rewriteFragmentTool";
import { searchKnowledgeTool } from "./searchKnowledgeTool";

export function createDefaultToolRegistry(): AgentToolRegistry {
  const tools = [
    searchKnowledgeTool,
    listReferenceDocumentsTool,
    getContextTool,
    extractStyleTool,
    rewriteFragmentTool,
    evaluateTextTool,
    computeDiffTool,
    createVersionTool,
  ] as const;
  return {
    get: (name: string): AgentTool | undefined =>
      tools.find((t) => t.name === name),
    list: (): readonly AgentTool[] => tools,
  };
}
