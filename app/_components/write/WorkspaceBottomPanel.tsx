"use client";

import { useState } from "react";

export type WorkspaceTabId = "compare" | "improve" | "knowledge" | "notes";

const TABS: { id: WorkspaceTabId; label: string }[] = [
  { id: "compare", label: "Comparar" },
  { id: "improve", label: "Mejorar con IA" },
  { id: "knowledge", label: "Conocimiento" },
  { id: "notes", label: "Notas" },
];

const tabBtn = (active: boolean) =>
  `flex-1 rounded-lg px-2 py-2 text-[10px] font-medium sm:px-3 sm:text-sm sm:flex-none ${
    active
      ? "bg-cf-primary text-white"
      : "text-cf-text-muted hover:bg-cf-surface-hover"
  }`;

type WorkspaceBottomPanelProps = {
  active: WorkspaceTabId;
  onTabChange: (t: WorkspaceTabId) => void;
  /** Panel expandido por defecto; el usuario puede colapsar. */
  defaultExpanded?: boolean;
  compare: React.ReactNode;
  improve: React.ReactNode;
  knowledge: React.ReactNode;
  notes: React.ReactNode;
};

export function WorkspaceBottomPanel({
  active,
  onTabChange,
  defaultExpanded = true,
  compare,
  improve,
  knowledge,
  notes,
}: WorkspaceBottomPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const content = {
    compare,
    improve,
    knowledge,
    notes,
  }[active];

  return (
    <>
      <div className="mt-2 flex shrink-0 items-center justify-between gap-2 lg:mt-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded-lg border border-cf-border px-3 py-1.5 text-xs text-cf-text-muted hover:bg-cf-surface-hover"
        >
          {expanded ? "Ocultar herramientas inferiores" : "Mostrar herramientas inferiores"}
        </button>
      </div>
      {expanded ?
        <>
          <section className="flex max-h-[min(42vh,480px)] min-h-[12rem] shrink-0 flex-col overflow-hidden rounded-xl border border-cf-border bg-cf-surface/80 backdrop-blur-sm lg:max-h-[min(46vh,560px)]">
            <div className="hidden shrink-0 flex-wrap gap-1 border-b border-cf-border p-2 sm:flex">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tabBtn(active === t.id)}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{content}</div>
          </section>
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 flex gap-0.5 border-t border-cf-border bg-cf-surface/95 p-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
            aria-label="Panel del espacio de trabajo"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tabBtn(active === t.id)}
                onClick={() => onTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </>
      : null}
    </>
  );
}
