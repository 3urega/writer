"use client";

import { diffLines } from "diff";

type VersionDiffViewProps = {
  labelA: string;
  labelB: string;
  textA: string;
  textB: string;
};

/**
 * Diferencias línea a línea entre dos snapshots (vista legible, sin términos técnicos de control de versiones).
 */
export function VersionDiffView({
  labelA,
  labelB,
  textA,
  textB,
}: VersionDiffViewProps) {
  const changes = diffLines(textA, textB);
  return (
    <div className="max-h-[min(55vh,520px)] overflow-auto rounded-xl border border-cf-border bg-cf-bg/40">
      <div className="sticky top-0 z-10 border-b border-cf-border bg-cf-surface/95 px-2 py-2 text-xs text-cf-text-muted backdrop-blur-sm">
        <span className="text-cf-success">{labelA} (línea o fragmento)</span>{" "}
        · <span className="text-cf-primary">{labelB} (línea o fragmento)</span>
      </div>
      <pre
        className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-cf-text"
        aria-live="polite"
      >
        {changes.map((part, i) => {
          if (part.added) {
            return (
              <span
                key={i}
                className="block border-l-2 border-rose-500/50 bg-rose-950/25 text-rose-100"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span
                key={i}
                className="block border-l-2 border-emerald-500/50 bg-emerald-950/20 text-emerald-100"
              >
                {part.value}
              </span>
            );
          }
          return <span key={i}>{part.value}</span>;
        })}
      </pre>
    </div>
  );
}
