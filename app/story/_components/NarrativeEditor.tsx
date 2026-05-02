"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  type NarrativeSelectionActionId,
  NarrativeSelectionToolbar,
} from "@/app/story/_components/NarrativeSelectionToolbar";

export type NarrativeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  onWordCount?: (n: number) => void;
  onToast?: (message: string) => void;
  onRequestExploration?: (selectedSnippet: string) => void;
  onSelectionChange?: (start: number, end: number) => void;
  /** Si existe, las acciones de toolbar (salvo explorar) llaman al agente en lugar del mock local. */
  onAgentInstruction?: (instruction: string, selectedFragment: string) => void;
};

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function replaceRange(
  full: string,
  start: number,
  end: number,
  insert: string
): string {
  return full.slice(0, start) + insert + full.slice(end);
}

const AGENT_INSTR: Record<
  Exclude<NarrativeSelectionActionId, "explore">,
  string
> = {
  rewrite:
    "Reescribe el siguiente fragmento conservando la voz y el sentido. Propón texto sustituto listo para pegar:",
  tension:
    "Aumenta la tensión dramática y el peso emocional de este fragmento sin volverlo melodramático:",
  dialogue:
    "Enriquece el diálogo y el subtexto; mantén ritmo natural en español:",
  expand:
    "Expande con detalle sensorial y matiz narrativo pertinente al tono del libro:",
  shorten: "Haz este fragmento más breve y preciso, sin perder la esencia:",
  tone: "Ajusta el tono según la intención del autor; no cambies hechos implícitos:",
};

export function NarrativeEditor({
  value,
  onChange,
  onWordCount,
  onToast,
  onRequestExploration,
  onSelectionChange,
  onAgentInstruction,
}: NarrativeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [selStart, setSelStart] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [anchorTop, setAnchorTop] = useState(48);

  const syncSelection = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const a = ta.selectionStart;
    const b = ta.selectionEnd;
    setSelStart(a);
    setSelEnd(b);
    onSelectionChange?.(a, b);
    if (a !== b && ta.value.slice(a, b).trim()) {
      const lh = Number.parseInt(getComputedStyle(ta).lineHeight, 10) || 28;
      const lines = ta.value.slice(0, a).split("\n").length;
      const rowTop = (lines - 1) * lh - ta.scrollTop;
      setAnchorTop(Math.max(12, rowTop));
      setToolbarOpen(true);
    } else {
      setToolbarOpen(false);
    }
  }, [onSelectionChange]);

  useEffect(() => {
    onWordCount?.(countWords(value));
  }, [onWordCount, value]);

  const applyAction = useCallback(
    (action: NarrativeSelectionActionId) => {
      const ta = taRef.current;
      if (!ta) return;
      const a = ta.selectionStart;
      const b = ta.selectionEnd;
      const slice = value.slice(a, b);
      if (a === b || !slice.trim()) {
        setToolbarOpen(false);
        return;
      }

      if (action === "explore") {
        onRequestExploration?.(slice);
        setToolbarOpen(false);
        return;
      }

      if (onAgentInstruction) {
        onAgentInstruction(AGENT_INSTR[action], slice);
        setToolbarOpen(false);
        onToast?.("Tu colaborador narrativo está trabajando en ese fragmento…");
        requestAnimationFrame(() => {
          ta.focus();
        });
        return;
      }

      let next = value;
      let msg = "";

      switch (action) {
        case "rewrite":
          next = replaceRange(value, a, b, `«${slice}»`);
          msg = "Marcamos el fragmento para repensarlo (demo).";
          break;
        case "tension":
          next = replaceRange(
            value,
            b,
            b,
            "\n\nAlgo en el aire se tensó, como un hilo invisible."
          );
          msg = "Añadimos un latido de tensión cerca de lo elegido.";
          break;
        case "dialogue":
          next = replaceRange(value, a, b, `— ${slice}\n— …`);
          msg = "Abriendo espacio para voz y respuesta.";
          break;
        case "expand":
          next = replaceRange(
            value,
            b,
            b,
            "\n\nY lo que no se dijo ahí pesó tanto como lo visible."
          );
          msg = "Un detalle más, como boceto narrativo.";
          break;
        case "shorten": {
          const first = slice.split(/[.!?]/)[0]?.trim() ?? slice;
          const cut =
            first.length > 0 && first.length < slice.length ?
              first
            : slice.slice(0, Math.max(20, Math.ceil(slice.length / 2)));
          next = replaceRange(
            value,
            a,
            b,
            cut + (cut.endsWith(".") ? "" : "…")
          );
          msg = "Versión más breve, suave.";
          break;
        }
        case "tone":
          next = replaceRange(
            value,
            b,
            b,
            "\n\n(El tono respira más cerca de la piel del lector.)"
          );
          msg = "Un recordatorio de tono — la IA fina llegará después.";
          break;
        default:
          break;
      }

      onChange(next);
      if (msg) onToast?.(msg);
      setToolbarOpen(false);
      requestAnimationFrame(() => {
        ta.focus();
      });
    },
    [
      onChange,
      onAgentInstruction,
      onRequestExploration,
      onToast,
      value,
    ]
  );

  return (
    <div ref={wrapRef} className="relative mx-auto max-w-3xl">
      <label htmlFor={id} className="sr-only">
        Texto de la historia
      </label>
      <NarrativeSelectionToolbar
        open={toolbarOpen}
        anchorTop={anchorTop}
        onAction={applyAction}
        onDismiss={() => setToolbarOpen(false)}
      />
      <textarea
        ref={taRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setToolbarOpen(false);
        }}
        onMouseUp={syncSelection}
        onKeyUp={syncSelection}
        onSelect={syncSelection}
        spellCheck
        className={[
          "min-h-[50dvh] w-full max-w-3xl resize-none bg-transparent",
          "px-2 py-6 text-[18px] leading-8 text-nm-text sm:px-4 sm:py-10",
          "placeholder:text-nm-text-muted focus:outline-none",
          "font-[family-name:var(--font-editor)]",
        ].join(" ")}
        placeholder="Tu historia respira aquí. Escribe con calma."
      />
    </div>
  );
}
