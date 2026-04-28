import Link from "next/link";

import { AgentConsole } from "./AgentConsole";

export default function AgentPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 text-cf-text">
      <Link
        href="/"
        className="text-sm text-cf-text-muted hover:text-cf-text"
      >
        Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Agente de escritura</h1>
      <p className="mt-2 text-sm text-cf-text-muted">
        Llama a <code className="font-mono text-xs">POST /api/agent</code> con
        el proyecto remoto guardado en localStorage o un UUID válido.
        Opcionalmente envía{" "}
        <code className="font-mono text-xs">editorContext</code>.         Sin <code className="font-mono text-xs">OPENAI_API_KEY</code>, en
        desarrollo se usa Ollama; en producción hace falta{" "}
        <code className="font-mono text-xs">OLLAMA_BASE_URL</code> u OpenAI.
      </p>
      <AgentConsole />
    </div>
  );
}
