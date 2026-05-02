"use client";

import type { ReactNode } from "react";

export function AiMessage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl bg-nm-surface-glass px-5 py-4 text-[15px] leading-relaxed",
        "text-nm-text-secondary transition-opacity duration-300",
        "sm:text-base sm:leading-relaxed",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function UserEcho({ text }: { text: string }) {
  return (
    <div
      className={[
        "rounded-2xl border border-nm-border/80 bg-nm-surface/40",
        "px-5 py-4 text-[15px] leading-relaxed text-nm-text sm:text-base",
      ].join(" ")}
    >
      <p className="whitespace-pre-wrap font-[family-name:var(--font-editor)] text-nm-text-secondary">
        {text}
      </p>
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div
      className="flex flex-col items-center gap-6 py-8"
      role="status"
      aria-live="polite"
    >
      <p className="text-center text-sm font-medium text-nm-primary sm:text-base">
        La IA está analizando tu historia…
      </p>
      <div className="flex h-8 w-48 items-center justify-center gap-1.5 sm:w-56">
        <span
          className={[
            "nm-analyze-wave h-2 flex-1 max-w-14 rounded-full bg-nm-primary/90",
            "origin-center",
          ].join(" ")}
        />
        <span
          className={[
            "nm-analyze-wave-delayed h-2 flex-1 max-w-14 rounded-full bg-nm-primary/70",
            "origin-center",
          ].join(" ")}
        />
        <span
          className={[
            "nm-analyze-wave-delayed-2 h-2 flex-1 max-w-14 rounded-full bg-nm-primary/50",
            "origin-center",
          ].join(" ")}
        />
      </div>
      <p className="max-w-md text-center text-xs text-nm-text-muted sm:text-sm">
        Dame un momento. Quiero entender el latido de tu relato antes de
        proponerte nada.
      </p>
    </div>
  );
}

export function SummaryGrid({
  protagonist,
  conflict,
  tone,
  themes,
}: {
  protagonist: string;
  conflict: string;
  tone: string;
  themes: string[];
}) {
  const cells = [
    { label: "Protagonista", body: protagonist },
    { label: "Conflicto", body: conflict },
    { label: "Tono", body: tone },
    {
      label: "Temas",
      body: themes.join(" · "),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className={[
            "rounded-2xl bg-nm-surface-glass px-4 py-4",
            "backdrop-blur-sm transition-transform duration-300 hover:scale-[1.01]",
          ].join(" ")}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-nm-text-muted">
            {c.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-nm-text sm:text-[15px]">
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function StartOptions({
  options,
  selectedId,
  onSelect,
}: {
  options: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selectedId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            className={[
              "rounded-full border px-4 py-2.5 text-left text-sm transition-all duration-200",
              "min-h-11",
              active ?
                "border-nm-primary bg-nm-primary-soft text-nm-text"
              : "border-nm-border bg-nm-surface/30 text-nm-text-secondary hover:border-nm-primary/50 hover:text-nm-text",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RefinementBlock({
  question,
  answer,
  onAnswerChange,
  onSend,
  disabled,
}: {
  question: string;
  answer: string;
  onAnswerChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <AiMessage>
        <p className="text-nm-text">{question}</p>
      </AiMessage>
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={3}
        disabled={disabled}
        className={[
          "w-full resize-none rounded-2xl border border-nm-border bg-nm-surface/40",
          "px-4 py-3 text-[15px] leading-relaxed text-nm-text",
          "placeholder:text-nm-text-muted focus:border-nm-primary focus:outline-none focus:ring-1 focus:ring-nm-primary/40",
          "font-[family-name:var(--font-editor)]",
          "disabled:opacity-60",
        ].join(" ")}
        placeholder="Escribe con libertad…"
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled || !answer.trim()}
          onClick={onSend}
          className={[
            "rounded-full bg-nm-primary px-6 py-2.5 text-sm font-medium text-white",
            "transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export function OpeningProposal({
  paragraph,
  onOpenEditor,
  loading,
}: {
  paragraph: string;
  onOpenEditor: () => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-5">
      <AiMessage>
        <p className="mb-3 text-nm-text">
          Aquí tienes una posible apertura. Léela como una invitación, no como
          una sentencia: puedes cambiar cada coma.
        </p>
        <p
          className={[
            "whitespace-pre-wrap font-[family-name:var(--font-editor)] text-lg leading-8 text-nm-text",
            "sm:text-[18px]",
          ].join(" ")}
        >
          {paragraph}
        </p>
      </AiMessage>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={loading || !paragraph.trim()}
          onClick={onOpenEditor}
          className={[
            "rounded-full bg-nm-primary px-8 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-nm-primary/25",
            "transition-transform hover:scale-[1.02] active:scale-[0.99]",
            "disabled:cursor-wait disabled:opacity-70",
          ].join(" ")}
        >
          {loading ? "Abriendo tu espacio…" : "Abrir en el editor"}
        </button>
      </div>
    </div>
  );
}
