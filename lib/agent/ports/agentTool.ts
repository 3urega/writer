import type { AgentToolContext } from "./types";

/** Herramienta ejecutable por nombre (contrato estable para registro del agente). */
export type AgentTool = {
  readonly name: string;
  readonly description: string;
  readonly execute: (
    args: unknown,
    ctx: AgentToolContext
  ) => Promise<unknown>;
};

export type AgentToolRegistry = {
  get(name: string): AgentTool | undefined;
  list(): readonly AgentTool[];
};
