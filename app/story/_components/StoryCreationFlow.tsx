"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AiMessage,
  OpeningProposal,
  RefinementBlock,
  StartOptions,
  SummaryGrid,
  ThinkingIndicator,
  UserEcho,
} from "@/app/story/_components/AgentConversation";
import { createInitialProject } from "@/lib/domain/versioning";
import { saveNarrativeBootstrap } from "@/lib/story/narrativeBootstrap";
import {
  saveStoryContext,
  seedStoryContextFromBootstrap,
} from "@/lib/story/storyContext";
import { setStoredRemoteProjectId } from "@/lib/storage/remoteProjectId";
import { createProjectOnServer } from "@/lib/storage/serverProjectClient";

type Beat =
  | "invite"
  | "thinking"
  | "summary"
  | "refine"
  | "opening";

const START_OPTIONS = [
  { id: "protagonist", label: "Presentando al protagonista" },
  { id: "mystery", label: "Empezando con un misterio" },
  { id: "tension", label: "Una escena de tensión" },
  { id: "tragedy", label: "Una tragedia que lo cambia todo" },
] as const;

function truncateTitle(raw: string, max = 52): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "Mi historia";
  return `${t.slice(0, max - 1).trim()}…`;
}

function deriveFromPitch(pitch: string): {
  protagonist: string;
  conflict: string;
  tone: string;
  themes: string[];
} {
  const lower = pitch.toLowerCase();
  const snippet = pitch.trim().slice(0, 120) || "tu voz y tu silencio";

  let tone = "Íntimo y reflexivo";
  if (/\b(miedo|oscur|sangre|muerte|horror)\b/.test(lower)) {
    tone = "Tenso, con sombra cerca";
  } else if (/\b(amor|beso|corazón|añor)\b/.test(lower)) {
    tone = "Cálido y vulnerable";
  } else if (/\b(guerra|batalla|espada|trono)\b/.test(lower)) {
    tone = "Épico, con decisiones pesadas";
  }

  const themes: string[] = ["Identidad"];
  if (/\b(familia|madre|padre|hijo)\b/.test(lower)) themes.push("Familia");
  if (/\b(mentira|secreto|verdad)\b/.test(lower)) themes.push("Verdad");
  if (/\b(libertad|justicia|poder)\b/.test(lower)) themes.push("Poder");
  if (themes.length < 2) themes.push("Cambio interior");

  const protagonist = `Alguien que camina entre lo que dice el mundo y lo que susurra tu texto: «${snippet}${snippet.length >= 120 ? "…" : ""}»`;
  const conflict =
    "Un deseo choca con un límite: lo que quieren proteger y lo que no pueden nombrar todavía.";

  return { protagonist, conflict, tone, themes: [...new Set(themes)].slice(0, 4) };
}

function refinementForOption(optionId: string): string {
  switch (optionId) {
    case "protagonist":
      return "¿Qué fragmento de su infancia todavía les pesa en las manos cuando la escena comienza?";
    case "mystery":
      return "¿Qué pregunta pequeña —casi casual— nadie se atreve a formular en voz alta?";
    case "tension":
      return "¿Quién está en la habitación y qué están a punto de perder si esta escena falla?";
    case "tragedy":
      return "¿Qué pierde tu protagonista en el primer instante, y qué se queda a vivir con esa ausencia?";
    default:
      return "¿Qué imagen concreta quieres que el lector vea primero?";
  }
}

function mockOpeningParagraph(
  pitch: string,
  optionId: string,
  refinement: string
): string {
  const seed = pitch.trim().slice(0, 280);
  const closing =
    optionId === "mystery" ? "algo acaba de moverse en la penumbra."
    : optionId === "tension" ? "el aire ya no cabe en el pecho de nadie."
    : optionId === "tragedy" ?
      "lo que ocurre después no tiene vuelta atrás, sólo consecuencias."
    : "el mundo, al fin, empieza donde tú lo enciendes.";

  return [
    seed ?
      seed + (pitch.length > 280 ? "…" : "")
    : "La primera frase aún tiembla, como quien posa la mano sobre una puerta que no sabe si abrir.",
    "",
    refinement.trim() ?
      `Lo que guardas en este detalle lo dice todo: ${refinement.trim().slice(0, 160)}${refinement.length > 160 ? "…" : ""}`
    : "Y en ese instante —demasiado humano para ser heroico— entendimos que no había mapa.",
    "",
    `Hasta aquí llega la brújula del guion; lo demás, ${closing}`,
  ].join("\n");
}

export function StoryCreationFlow() {
  const router = useRouter();
  const [beat, setBeat] = useState<Beat>("invite");
  const [pitch, setPitch] = useState("");
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [refinementAnswer, setRefinementAnswer] = useState("");
  const [openingParagraph, setOpeningParagraph] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openingLoading, setOpeningLoading] = useState(false);

  const derived = useMemo(() => deriveFromPitch(pitch), [pitch]);

  const onContinueInvite = useCallback(() => {
    if (!pitch.trim()) return;
    setBeat("thinking");
    window.setTimeout(() => setBeat("summary"), 2200);
  }, [pitch]);

  const onPickStart = useCallback((id: string) => {
    setSelectedStartId(id);
    setBeat("refine");
  }, []);

  const onSendRefinement = useCallback(() => {
    if (!selectedStartId || !refinementAnswer.trim()) return;
    setBeat("opening");
    const text = mockOpeningParagraph(
      pitch,
      selectedStartId,
      refinementAnswer
    );
    setOpeningParagraph(text);
  }, [pitch, refinementAnswer, selectedStartId]);

  const onOpenEditor = useCallback(async () => {
    setSubmitError(null);
    setOpeningLoading(true);
    try {
      const title = truncateTitle(pitch.split(/[.\n]/)[0] ?? pitch);
      const { project } = createInitialProject(title);
      const id = await createProjectOnServer(project);
      setStoredRemoteProjectId(id);
      const boot = {
        synopsis: pitch.trim(),
        openingParagraph,
        protagonist: derived.protagonist,
        conflict: derived.conflict,
        tone: derived.tone,
        themes: derived.themes,
        projectTitle: title,
      };
      saveNarrativeBootstrap(id, boot);
      const seeded = seedStoryContextFromBootstrap(id, boot);
      saveStoryContext(id, seeded);
      router.push(`/story/${encodeURIComponent(id)}`);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "No se pudo crear tu historia"
      );
      setOpeningLoading(false);
    }
  }, [derived, openingParagraph, pitch, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-xs text-nm-text-muted transition-colors hover:text-nm-primary sm:text-sm"
        >
          ← Volver al inicio
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-24 pt-2 sm:px-6 sm:pb-28">
        <div className="space-y-10 sm:space-y-12">
          <div className="space-y-4 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-nm-text sm:text-3xl">
              Vamos a construir una historia juntos.
            </h1>
            <p className="text-sm leading-relaxed text-nm-text-muted sm:text-base">
              No necesitas tenerlo todo claro. Respira. Cuéntame lo que llevas
              dentro: personajes, emoción, el tono que te persigue.
            </p>
          </div>

          {beat === "invite" ?
            <section className="space-y-6">
              <AiMessage>
                <p className="text-lg font-medium text-nm-text sm:text-xl">
                  Cuéntame tu historia.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-nm-text-secondary sm:text-[15px]">
                  Describe tu idea con el mayor detalle que puedas: quién la
                  vive, qué mundo la sostiene, qué late cuando cierras los ojos.
                </p>
              </AiMessage>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={8}
                className={[
                  "w-full resize-none rounded-2xl border border-nm-border bg-nm-surface/35",
                  "px-4 py-4 text-[15px] leading-relaxed text-nm-text sm:px-5 sm:text-[17px] sm:leading-8",
                  "placeholder:text-nm-text-muted focus:border-nm-primary focus:outline-none focus:ring-1 focus:ring-nm-primary/35",
                  "font-[family-name:var(--font-editor)]",
                ].join(" ")}
                placeholder="Empieza donde te resulte más honesto…"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onContinueInvite}
                  disabled={!pitch.trim()}
                  className={[
                    "rounded-full bg-nm-primary px-8 py-3 text-sm font-semibold text-white",
                    "transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-35",
                  ].join(" ")}
                >
                  Continuar
                </button>
              </div>
            </section>
          : null}

          {beat !== "invite" && pitch.trim() ?
            <UserEcho text={pitch} />
          : null}

          {beat === "thinking" ? <ThinkingIndicator /> : null}

          {beat === "summary" || beat === "refine" || beat === "opening" ?
            <>
              <AiMessage>
                <p className="text-nm-text">
                  Esto es lo que escucho cuando dejo que tu historia me
                  atraviese. Si algo se siente hueco, lo ajustamos en el
                  camino: aquí no hay examen.
                </p>
              </AiMessage>
              <SummaryGrid
                protagonist={derived.protagonist}
                conflict={derived.conflict}
                tone={derived.tone}
                themes={derived.themes}
              />
            </>
          : null}

          {beat === "summary" ?
            <div className="space-y-4">
              <AiMessage>
                <p className="text-nm-text">
                  ¿Cómo te gustaría empezar? Elige una puerta; también puedes
                  mezclar sensaciones en tu propia voz después.
                </p>
              </AiMessage>
              <StartOptions
                options={START_OPTIONS.map((o) => ({
                  id: o.id,
                  label: o.label,
                }))}
                selectedId={selectedStartId}
                onSelect={onPickStart}
              />
            </div>
          : null}

          {beat === "refine" && selectedStartId ?
            <RefinementBlock
              question={refinementForOption(selectedStartId)}
              answer={refinementAnswer}
              onAnswerChange={setRefinementAnswer}
              onSend={onSendRefinement}
            />
          : null}

          {beat === "opening" ?
            <>
              {submitError ?
                <p className="text-center text-sm text-red-300 sm:text-left">
                  {submitError}
                </p>
              : null}
              <OpeningProposal
                paragraph={openingParagraph}
                onOpenEditor={() => void onOpenEditor()}
                loading={openingLoading}
              />
            </>
          : null}
        </div>
      </main>
    </div>
  );
}
