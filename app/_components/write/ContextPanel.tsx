"use client";

import { useState } from "react";

import type { Fragment, Version } from "@/lib/domain/types";

import { ContextDetailsPanel } from "./ContextDetailsPanel";
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

/** Panel legacy con tabs; preferir WriteWorkspaceSidebar en /write. */
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
          <ContextDetailsPanel
            fragment={fragment}
            activeDocsSummary={activeDocsSummary}
            onOpenKnowledgeTab={onOpenKnowledgeTab}
            chapterId={chapterId}
            chapterTitle={chapterTitle}
            onChapterTitleBlur={onChapterTitleBlur}
          />
        )}
      </div>
    </aside>
  );
}
