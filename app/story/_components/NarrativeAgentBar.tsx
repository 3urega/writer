"use client";

const CHIPS = [
  "Reescribir",
  "Cambiar tono",
  "Más descriptivo",
  "Más diálogo",
  "Más tensión",
  "Simplificar",
] as const;

export function NarrativeAgentBar({
  value,
  onChange,
  onChip,
  onStar,
}: {
  value: string;
  onChange: (v: string) => void;
  onChip: (label: string) => void;
  onStar: () => void;
}) {
  return (
    <div
      className={[
        "pointer-events-auto mx-auto w-full max-w-3xl px-3 pb-6 pt-2 sm:px-4",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-[1.5rem] border border-nm-border/80 bg-nm-surface/80 px-3 py-3 shadow-xl shadow-black/30",
          "backdrop-blur-md sm:px-4 sm:py-3.5",
        ].join(" ")}
      >
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChip(c)}
              className={[
                "shrink-0 rounded-full border border-nm-border/90 bg-nm-bg/40 px-3 py-1.5 text-xs text-nm-text-secondary",
                "transition-colors hover:border-nm-primary/50 hover:text-nm-text",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={1}
            placeholder="Pregunta a tu editor narrativo…"
            className={[
              "max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-nm-text",
              "placeholder:text-nm-text-muted focus:outline-none",
            ].join(" ")}
          />
          <button
            type="button"
            onClick={onStar}
            aria-label="Enviar al agente"
            className={[
              "mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full",
              "bg-nm-primary text-white shadow-lg shadow-nm-primary/35",
              "transition-transform hover:scale-105 active:scale-95",
            ].join(" ")}
          >
            <span aria-hidden className="text-lg">
              ✦
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
