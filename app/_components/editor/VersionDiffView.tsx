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
    <div className="max-h-[min(55vh,520px)] overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300">
        <span className="text-emerald-700 dark:text-emerald-400">
          {labelA} (línea o fragmento)
        </span>{" "}
        ·{" "}
        <span className="text-rose-700 dark:text-rose-400">
          {labelB} (línea o fragmento)
        </span>
      </div>
      <pre
        className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200"
        aria-live="polite"
      >
        {changes.map((part, i) => {
          if (part.added) {
            return (
              <span
                key={i}
                className="block border-l-2 border-rose-500/50 bg-rose-50/90 text-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span
                key={i}
                className="block border-l-2 border-emerald-500/50 bg-emerald-50/90 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
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
