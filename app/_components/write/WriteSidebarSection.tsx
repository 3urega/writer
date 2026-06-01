"use client";

import type { ReactNode } from "react";

type WriteSidebarSectionProps = {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: ReactNode;
};

/**
 * Sección acordeón reutilizable para la barra lateral del espacio de escritura.
 */
export function WriteSidebarSection({
  id,
  title,
  expanded,
  onToggle,
  badge,
  children,
}: WriteSidebarSectionProps) {
  const panelId = `sidebar-section-${id}`;

  return (
    <div className="border-b border-cf-border last:border-b-0">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
          expanded
            ? "bg-cf-primary-soft/60 text-cf-text"
            : "text-cf-text-muted hover:bg-cf-surface-hover hover:text-cf-text"
        }`}
      >
        <span
          className={`shrink-0 text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        {badge ? (
          <span className="shrink-0 rounded-full border border-cf-border bg-cf-bg/80 px-1.5 py-0.5 text-[10px] text-cf-text-muted">
            {badge}
          </span>
        ) : null}
      </button>
      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className="max-h-[min(50vh,420px)] overflow-y-auto border-t border-cf-border/60 bg-cf-bg/30 px-3 py-2"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
