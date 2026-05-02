"use client";

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function readingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

type EditorStatsFooterProps = {
  text: string;
  lastChangeLabel: string;
  lastLocalSaveLabel: string | null;
};

export function EditorStatsFooter({
  text,
  lastChangeLabel,
  lastLocalSaveLabel,
}: EditorStatsFooterProps) {
  const words = countWords(text);
  const chars = text.length;
  const mins = readingMinutes(words);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cf-border pt-2 text-[11px] text-cf-text-muted">
      <span>
        {words.toLocaleString("es-ES")} palabras · {chars.toLocaleString("es-ES")}{" "}
        caracteres · ~{mins} min de lectura
      </span>
      <span className="text-right">
        Último cambio: {lastChangeLabel}
        {lastLocalSaveLabel ?
          <> · Autoguardado local: {lastLocalSaveLabel}</>
        : null}
      </span>
    </div>
  );
}
