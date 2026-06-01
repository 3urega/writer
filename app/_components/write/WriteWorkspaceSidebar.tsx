"use client";

import type { ReactNode } from "react";

import { WriteSidebarSection } from "./WriteSidebarSection";

export type SidebarSectionId =
  | "lines"
  | "versions"
  | "details"
  | "compare"
  | "improve"
  | "knowledge"
  | "notes";

type SectionConfig = {
  id: SidebarSectionId;
  title: string;
  badge?: string;
  content: ReactNode;
};

type WriteWorkspaceSidebarProps = {
  openSection: SidebarSectionId | null;
  onOpenSection: (id: SidebarSectionId | null) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  sections: SectionConfig[];
};

function SidebarAccordion({
  openSection,
  onOpenSection,
  sections,
}: Pick<
  WriteWorkspaceSidebarProps,
  "openSection" | "onOpenSection" | "sections"
>) {
  return (
    <div className="flex flex-col rounded-xl border border-cf-border bg-cf-surface/80">
      {sections.map((s) => (
        <WriteSidebarSection
          key={s.id}
          id={s.id}
          title={s.title}
          badge={s.badge}
          expanded={openSection === s.id}
          onToggle={() =>
            onOpenSection(openSection === s.id ? null : s.id)
          }
        >
          {s.content}
        </WriteSidebarSection>
      ))}
    </div>
  );
}

/**
 * Barra lateral unificada: acordeón en desktop, drawer en móvil.
 */
export function WriteWorkspaceSidebar({
  openSection,
  onOpenSection,
  mobileOpen,
  onMobileOpenChange,
  sections,
}: WriteWorkspaceSidebarProps) {
  return (
    <>
      {/* Desktop: sidebar inline */}
      <aside
        className="hidden min-h-0 lg:sticky lg:top-2 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto"
        aria-label="Herramientas del espacio de escritura"
      >
        <SidebarAccordion
          openSection={openSection}
          onOpenSection={onOpenSection}
          sections={sections}
        />
      </aside>

      {/* Mobile: drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Cerrar herramientas"
            onClick={() => onMobileOpenChange(false)}
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-[min(100%,320px)] flex-col border-r border-cf-border bg-cf-surface shadow-xl"
            aria-label="Herramientas del espacio de escritura"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-cf-border px-3 py-2">
              <h2 className="text-sm font-semibold text-cf-text">Herramientas</h2>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                className="rounded-lg border border-cf-border px-2 py-1 text-xs text-cf-text-muted hover:bg-cf-surface-hover"
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <SidebarAccordion
                openSection={openSection}
                onOpenSection={onOpenSection}
                sections={sections}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
