"use client";

import type { StoryContext } from "@/lib/story/storyContext";

export function NarrativeContextPanel({
  synopsis,
  themes,
  toneLabel,
  tonePercent,
  references,
  onToggleReference,
  storyContext,
}: {
  synopsis: string;
  themes: string[];
  toneLabel: string;
  tonePercent: number;
  references: { id: string; name: string; active: boolean }[];
  onToggleReference: (id: string) => void;
  storyContext?: StoryContext | null;
}) {
  const ctxThemes =
    storyContext && storyContext.themes.length > 0 ?
      storyContext.themes
    : themes;
  const synopsisBody =
    synopsis ||
    storyContext?.tone.notes ||
    "Cuando escribas más, aquí vivirá el hilo que guía al agente.";
  const toneDisplay =
    storyContext?.tone.label?.trim() ? storyContext.tone.label : toneLabel;

  return (
    <aside
      className={[
        "flex h-full min-h-0 w-full flex-col border-l border-nm-border/60 bg-nm-surface/25",
        "backdrop-blur-md",
      ].join(" ")}
      aria-label="Contexto narrativo"
    >
      <div className="shrink-0 border-b border-nm-border/50 px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-nm-text-muted">
          Contexto narrativo
        </h2>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="text-xs font-medium text-nm-text-muted">Sinopsis</h3>
          <p className="mt-2 text-sm leading-relaxed text-nm-text-secondary">
            {synopsisBody}
          </p>
        </section>
        {storyContext && storyContext.characters.length > 0 ?
          <section>
            <h3 className="text-xs font-medium text-nm-text-muted">
              Quiénes importan
            </h3>
            <ul className="mt-2 space-y-2">
              {storyContext.characters.slice(0, 6).map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg bg-nm-surface-glass px-3 py-2 text-xs text-nm-text-secondary"
                >
                  <span className="font-medium text-nm-text">{c.name}</span>
                  {c.notes ?
                    <span className="mt-0.5 block text-nm-text-muted">
                      {c.notes.slice(0, 120)}
                      {c.notes.length > 120 ? "…" : ""}
                    </span>
                  : null}
                </li>
              ))}
            </ul>
          </section>
        : null}
        {storyContext && storyContext.open_threads.length > 0 ?
          <section>
            <h3 className="text-xs font-medium text-nm-text-muted">
              Hilos abiertos
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-nm-text-secondary">
              {storyContext.open_threads.slice(0, 5).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        : null}
        <section>
          <h3 className="text-xs font-medium text-nm-text-muted">
            Temas principales
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {ctxThemes.length ?
              ctxThemes.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-nm-primary-soft px-3 py-1 text-xs text-nm-text"
                >
                  {t}
                </span>
              ))
            : <span className="text-xs text-nm-text-muted">—</span>}
          </div>
        </section>
        <section>
          <h3 className="text-xs font-medium text-nm-text-muted">
            Tono detectado
          </h3>
          <p className="mt-1 text-xs text-nm-text-muted">{toneDisplay}</p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-nm-bg"
            role="progressbar"
            aria-valuenow={tonePercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-nm-primary to-nm-accent transition-all duration-500"
              style={{ width: `${tonePercent}%` }}
            />
          </div>
        </section>
        <section>
          <h3 className="text-xs font-medium text-nm-text-muted">
            Referencias activas
          </h3>
          <ul className="mt-3 space-y-2">
            {references.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-nm-surface-glass px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs text-nm-text-secondary">
                  {r.name}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.active}
                  onClick={() => onToggleReference(r.id)}
                  className={[
                    "relative h-7 w-11 shrink-0 rounded-full transition-colors",
                    r.active ? "bg-nm-primary" : "bg-nm-bg",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
                      r.active ? "left-4" : "left-0.5",
                    ].join(" ")}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
