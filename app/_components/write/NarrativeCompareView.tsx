"use client";

import { VersionDiffView } from "@/app/_components/editor/VersionDiffView";

type NarrativeCompareViewProps = {
  labelOriginal: string;
  labelRevision: string;
  textOriginal: string;
  textRevision: string;
};

/**
 * Comparación narrativa: lectura lado a lado + resaltado contextual debajo.
 */
export function NarrativeCompareView({
  labelOriginal,
  labelRevision,
  textOriginal,
  textRevision,
}: NarrativeCompareViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-h-[min(40vh,320px)] gap-3 overflow-hidden md:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-cf-border bg-cf-bg/40">
          <div className="shrink-0 border-b border-cf-border px-3 py-2 text-xs font-medium text-cf-success">
            {labelOriginal}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm leading-relaxed text-cf-text">
            {splitPreviewLines(textOriginal).map((line, i) => (
              <p key={i} className="mb-2 whitespace-pre-wrap last:mb-0">
                {line || "\u00a0"}
              </p>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-cf-border bg-cf-bg/40">
          <div className="shrink-0 border-b border-cf-border px-3 py-2 text-xs font-medium text-cf-primary">
            {labelRevision}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm leading-relaxed text-cf-text">
            {splitPreviewLines(textRevision).map((line, i) => (
              <p key={i} className="mb-2 whitespace-pre-wrap last:mb-0">
                {line || "\u00a0"}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs text-cf-text-muted">Cambios entre ambos textos</p>
        <VersionDiffView
          labelA={labelOriginal}
          labelB={labelRevision}
          textA={textOriginal}
          textB={textRevision}
        />
      </div>
    </div>
  );
}

function splitPreviewLines(t: string): string[] {
  return t.split(/\n/);
}
