"use client";

import { useMemo, useState } from "react";

import type { Branch } from "@/lib/domain/types";

type VariationSidebarProps = {
  branches: Branch[];
  activeBranchId: string | null | undefined;
  mainBranchId: string | null | undefined;
  versionCountByBranchId: Record<string, number>;
  onSelectBranch: (branchId: string) => void;
  onOpenNewVariation: () => void;
};

export function VariationSidebar({
  branches,
  activeBranchId,
  mainBranchId,
  versionCountByBranchId,
  onSelectBranch,
  onOpenNewVariation,
}: VariationSidebarProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(s));
  }, [branches, q]);

  return (
    <aside className="flex min-h-0 max-h-[40vh] flex-col gap-2 overflow-hidden rounded-xl border border-cf-border bg-cf-surface/80 p-3 lg:max-h-[calc(100vh-11rem)]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-cf-text-muted">
        Líneas narrativas
      </h2>
      <div className="flex gap-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="min-w-0 flex-1 rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-xs text-cf-text"
          aria-label="Buscar variación"
        />
        <button
          type="button"
          onClick={onOpenNewVariation}
          className="shrink-0 rounded-lg border border-cf-primary/40 px-2 py-1 text-lg font-medium leading-none text-cf-primary hover:bg-cf-primary-soft"
          title="Nueva variación"
        >
          +
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto text-sm">
        {filtered.map((b) => {
          const active = b.id === activeBranchId;
          const official = b.id === mainBranchId;
          const n = versionCountByBranchId[b.id] ?? 0;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelectBranch(b.id)}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  active
                    ? "bg-cf-primary-soft text-cf-text ring-1 ring-cf-primary/40"
                    : "text-cf-text-muted hover:bg-cf-surface-hover"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 font-medium">
                    {official ? <span className="mr-1 text-cf-warning" title="Línea principal">👑 </span> : null}
                    {b.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-cf-text-muted">v.{n}</span>
                </div>
                {b.status !== "active" ? (
                  <span className="mt-0.5 block text-[10px] text-cf-text-muted/80">
                    {b.status}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onOpenNewVariation}
        className="w-full shrink-0 rounded-lg border border-dashed border-cf-border py-2 text-xs text-cf-text-muted hover:border-cf-primary/40 hover:text-cf-primary"
      >
        + Nueva variación
      </button>
      <p className="text-[10px] text-cf-text-muted/70">
        <kbd className="rounded border border-cf-border px-1">?</kbd> Atajos (próximamente)
      </p>
    </aside>
  );
}
