"use client";

import { useState } from "react";

import type { Fragment, Version } from "@/lib/domain/types";

import { VersionTimeline } from "./VersionTimeline";

type ContextTab = "versions" | "details";

type ContextPanelProps = {
  versions: Version[];
  activeVersionId: string;
  mainVersionId: string | null | undefined;
  onSelectVersion: (id: string) => void;
  onSetOfficial: (id: string) => void;
  formatVersionLabel: (v: Version, index: number, isMain: boolean) => string;
  fragment: Fragment | null;
  activeDocsSummary: string;
  onOpenKnowledgeTab: () => void;
  chapterId: string;
  chapterTitle: string;
  onChapterTitleBlur: (next: string) => void;
};

export function ContextPanel({
  versions,
  activeVersionId,
  mainVersionId,
  onSelectVersion,
  onSetOfficial,
  formatVersionLabel,
  fragment,
  activeDocsSummary,
  onOpenKnowledgeTab,
  chapterId,
  chapterTitle,
  onChapterTitleBlur,
}: ContextPanelProps) {
  const [tab, setTab] = useState<ContextTab>("versions");

  const tabCls = (active: boolean) =>
    `flex-1 rounded-t-lg px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
      active
        ? "bg-cf-surface text-cf-text border border-b-0 border-cf-border"
        : "text-cf-text-muted hover:text-cf-text"
    }`;

  return (
    <aside className="flex min-h-0 max-h-[40vh] flex-col rounded-xl border border-cf-border bg-cf-surface/80 lg:max-h-[calc(100vh-11rem)]">
      <div className="flex shrink-0 border-b border-cf-border bg-cf-bg/30 p-1">
        <button
          type="button"
          className={tabCls(tab === "versions")}
          onClick={() => setTab("versions")}
        >
          Versiones
        </button>
        <button
          type="button"
          className={tabCls(tab === "details")}
          onClick={() => setTab("details")}
        >
          Detalles
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "versions" ? (
          <VersionTimeline
            versions={versions}
            activeVersionId={activeVersionId}
            mainVersionId={mainVersionId}
            onSelectVersion={onSelectVersion}
            onSetOfficial={onSetOfficial}
            formatVersionLabel={formatVersionLabel}
          />
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-semibold text-cf-text-muted">
                Título del capítulo
              </label>
              <input
                type="text"
                key={chapterId}
                defaultValue={chapterTitle}
                onBlur={(e) => onChapterTitleBlur(e.target.value)}
                placeholder="Ej. El umbral"
                className="mt-1 w-full rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-sm text-cf-text"
              />
              <p className="mt-1 text-[10px] text-cf-text-muted">
                Se guarda con el proyecto al sincronizar.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-cf-text-muted">
                Fragmento seleccionado
              </h3>
              {fragment == null || fragment.end <= fragment.start ? (
                <p className="mt-1 text-xs text-cf-text-muted">
                  Selecciona texto en el editor para verlo aquí.
                </p>
              ) : (
                <div className="mt-2 rounded-lg border border-cf-border bg-cf-bg/50 p-2 text-xs">
                  <p className="text-[10px] text-cf-text-muted">
                    {fragment.start}–{fragment.end} · {fragment.text.length} caracteres
                  </p>
                  <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-cf-text">
                    {fragment.text}
                  </p>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-cf-text-muted">
                Fuentes para la IA
              </h3>
              <p className="mt-1 text-xs text-cf-text-muted">{activeDocsSummary}</p>
              <button
                type="button"
                onClick={onOpenKnowledgeTab}
                className="mt-2 text-xs font-medium text-cf-primary underline"
              >
                Gestionar en Conocimiento
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
