"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NarrativeAgentBar } from "@/app/story/_components/NarrativeAgentBar";
import { NarrativeContextPanel } from "@/app/story/_components/NarrativeContextPanel";
import { NarrativeEditor } from "@/app/story/_components/NarrativeEditor";
import {
  AssistantOverlay,
  SaveMomentOverlay,
  SavedMomentsOverlay,
  VariationOverlay,
} from "@/app/story/_components/NarrativeOverlays";
import {
  NarrativeWorkspaceChrome,
  NarrativeWorkspaceNav,
  type NarrativeDraftStatus,
} from "@/app/story/_components/NarrativeWorkspaceChrome";
import {
  findChapter,
  findMainBranchForChapter,
  findVersion,
  replaceChapter,
  setChapterMainVersion,
} from "@/lib/domain/versioning";
import type { Project } from "@/lib/domain/types";
import type { NarrativeBootstrap } from "@/lib/story/narrativeBootstrap";
import { runNarrativeAgentRequest } from "@/lib/story/narrativeAgentClient";
import type { NarrativeSession } from "@/lib/story/narrativeSession";
import {
  buildEditorialTimeline,
  listMomentLabelsFromMetadata,
  loadLocalMoments,
  recordNarrativeExploration,
  recordNarrativeMoment,
} from "@/lib/story/narrativeLayer";
import {
  loadStoryContext,
  saveStoryContext,
  seedStoryContextFromBootstrap,
  type StoryContext,
} from "@/lib/story/storyContext";
import { loadDraft, saveDraft } from "@/lib/storage/draftStore";
import {
  fetchProjectFromServer,
  putProjectToServer,
} from "@/lib/storage/serverProjectClient";

type OverlayKey = "assistant" | "variation" | "moments" | null;

const MOCK_REFS = [
  { id: "1", name: "Ambiente de terror (PDF)", active: true },
  { id: "2", name: "Notas de personaje — Lia", active: false },
] as const;

const DRAFT_DEBOUNCE_MS = 640;

function narrativeAgentModeFromUi(mode: string): NarrativeSession["agentMode"] {
  if (mode === "collab" || mode === "gentle" || mode === "bold") return mode;
  return "collab";
}

export function NarrativeWorkspace({
  projectId,
  bootstrap,
}: {
  projectId: string;
  bootstrap: NarrativeBootstrap | null;
}) {
  const [overlay, setOverlay] = useState<OverlayKey>(null);
  const [saveMomentOpen, setSaveMomentOpen] = useState(false);
  const [contextOpenDesktop, setContextOpenDesktop] = useState(true);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [referencesActive, setReferencesActive] = useState(true);
  const [agentMode, setAgentMode] = useState("collab");
  const [agentInput, setAgentInput] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [refs, setRefs] = useState(
    () =>
      MOCK_REFS.map((r) => ({
        id: r.id,
        name: r.name,
        active: r.active,
      }))
  );

  const [remoteProject, setRemoteProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");
  const [storyCtx, setStoryCtx] = useState<StoryContext | null>(null);
  const [draftStatus, setDraftStatus] = useState<NarrativeDraftStatus>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [editorHydrated, setEditorHydrated] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [revertMainVersionId, setRevertMainVersionId] = useState<string | null>(
    null
  );
  const [undoBusy, setUndoBusy] = useState(false);

  const initEditorRef = useRef(false);

  const bookTitle = bootstrap?.projectTitle ?? remoteProject?.name ?? "Tu historia";

  const activeChapter = remoteProject?.chapters[0];
  const activeChapterId = activeChapter?.id ?? null;
  const activeVersionId =
    activeChapter?.mainVersionId ?? activeChapter?.versions[0]?.id ?? null;
  const mainBranch = activeChapter ?
    findMainBranchForChapter(activeChapter)
  : undefined;
  const activeBranchId = mainBranch?.id ?? null;

  const chapterTitle = useMemo(() => {
    if (!activeChapter) return "Capítulo 1";
    return (
      activeChapter.title?.trim() ||
      `Capítulo ${activeChapter.order + 1}`
    );
  }, [activeChapter]);

  const synopsis = bootstrap?.synopsis ?? "";
  const themesBoot = bootstrap?.themes ?? [];
  const toneLabel = bootstrap?.tone ?? "En equilibrio";

  const tonePercent = useMemo(() => {
    const raw = storyCtx?.tone.notes ?? synopsis;
    const base = raw.length;
    return Math.min(100, 38 + Math.min(40, Math.floor(base / 12)));
  }, [storyCtx?.tone.notes, synopsis.length]);

  const chapterObjective = useMemo(() => {
    if (bootstrap?.conflict) {
      return bootstrap.conflict.length > 90
        ? `${bootstrap.conflict.slice(0, 87)}…`
        : bootstrap.conflict;
    }
    return "Sostener la escena con claridad emocional.";
  }, [bootstrap?.conflict]);

  const persistProject = useCallback(
    async (p: Project) => {
      await putProjectToServer(projectId, p);
      setRemoteProject(p);
    },
    [projectId]
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = (): void => {
      setContextOpenDesktop(mq.matches);
      if (mq.matches) setContextDrawerOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const p = await fetchProjectFromServer(projectId);
        if (c) return;
        setRemoteProject(p);
        setProjectError(null);
      } catch (e) {
        if (c) return;
        setProjectError(
          e instanceof Error ? e.message : "No se pudo cargar el libro"
        );
      }
    })();
    return () => {
      c = true;
    };
  }, [projectId]);

  useEffect(() => {
    initEditorRef.current = false;
    setEditorHydrated(false);
    setEditorText("");
    setRevertMainVersionId(null);
  }, [projectId]);

  useEffect(() => {
    setStoryCtx(loadStoryContext(projectId));
    if (bootstrap) {
      const seeded = seedStoryContextFromBootstrap(projectId, bootstrap);
      saveStoryContext(projectId, seeded);
      setStoryCtx(seeded);
    }
  }, [projectId, bootstrap]);

  useEffect(() => {
    if (!remoteProject || !activeChapterId || !activeVersionId) return;
    if (initEditorRef.current) return;
    initEditorRef.current = true;
    let cancelled = false;
    void (async () => {
      const ch = findChapter(remoteProject, activeChapterId);
      if (!ch || cancelled) return;
      const ver = findVersion(ch, activeVersionId);
      const base = ver?.content ?? "";
      const key = {
        projectId,
        chapterId: activeChapterId,
        branchId: activeBranchId,
      };
      const draft = await loadDraft(key);
      let next = base;
      if (
        draft &&
        draft.baseVersionId === activeVersionId &&
        draft.content
      ) {
        next = draft.content;
      } else if (!base.trim() && bootstrap?.openingParagraph) {
        next = bootstrap.openingParagraph;
      }
      if (!cancelled) {
        setEditorText(next);
        setEditorHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    remoteProject,
    activeChapterId,
    activeVersionId,
    activeBranchId,
    projectId,
    bootstrap?.openingParagraph,
  ]);

  useEffect(() => {
    if (!editorHydrated || !activeChapterId || !activeVersionId) return;
    const key = {
      projectId,
      chapterId: activeChapterId,
      branchId: activeBranchId,
    };
    setDraftStatus("saving");
    const t = window.setTimeout(() => {
      void saveDraft({
        ...key,
        content: editorText,
        baseVersionId: activeVersionId,
        updatedAt: new Date().toISOString(),
      })
        .then(() => {
          setDraftStatus("saved");
          window.setTimeout(() => setDraftStatus("idle"), 1200);
        })
        .catch(() => setDraftStatus("error"));
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    editorText,
    editorHydrated,
    projectId,
    activeChapterId,
    activeBranchId,
    activeVersionId,
  ]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const toggleRef = useCallback((id: string) => {
    setRefs((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      )
    );
  }, []);

  const onChip = useCallback((label: string) => {
    setAgentInput((prev) =>
      prev.trim() ? `${prev.trim()} · ${label}` : label
    );
  }, []);

  const undoLastAgentVariation = useCallback(async () => {
    if (!revertMainVersionId || !activeChapterId) return;
    setUndoBusy(true);
    try {
      const p = await fetchProjectFromServer(projectId);
      const ch = findChapter(p, activeChapterId);
      if (!ch) throw new Error("No encontramos el capítulo.");
      const ch2 = setChapterMainVersion(ch, revertMainVersionId);
      const p2 = replaceChapter(p, ch2);
      await persistProject(p2);
      const v = findVersion(ch2, revertMainVersionId);
      setEditorText(v?.content ?? "");
      setRevertMainVersionId(null);
      setToast("Volviste a la versión anterior del capítulo.");
      setOverlay(null);
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "No se pudo deshacer la variación."
      );
    } finally {
      setUndoBusy(false);
    }
  }, [activeChapterId, persistProject, projectId, revertMainVersionId]);

  const invokeNarrativeAgent = useCallback(
    async (userMessage: string) => {
      if (!activeChapterId || !activeVersionId) {
        setToast("Espera a que cargue el capítulo.");
        return;
      }
      const mainBeforeApply = activeVersionId;
      setOverlay("assistant");
      setAssistantBusy(true);
      setAssistantReply(null);
      const hasSelection = selectionStart < selectionEnd;
      const session: NarrativeSession = {
        projectId,
        chapterId: activeChapterId,
        branchId: activeBranchId ?? null,
        versionId: activeVersionId,
        chapterText: editorText,
        selectionStart: hasSelection ? selectionStart : undefined,
        selectionEnd: hasSelection ? selectionEnd : undefined,
        activeReferenceIds: refs.filter((r) => r.active).map((r) => r.id),
        agentMode: narrativeAgentModeFromUi(agentMode),
        storyMemorySnapshot: storyCtx ?? undefined,
      };
      try {
        const res = await runNarrativeAgentRequest({
          userMessage,
          session,
          maxSteps: 10,
        });
        const lastId = res.lastCreatedVersionId ?? null;
        if (lastId && lastId !== mainBeforeApply && activeChapterId) {
          try {
            const p = await fetchProjectFromServer(projectId);
            const ch = findChapter(p, activeChapterId);
            if (!ch) {
              throw new Error("No encontramos el capítulo en el servidor.");
            }
            if (!findVersion(ch, lastId)) {
              throw new Error(
                "La nueva versión aún no está disponible; recarga la página o reintenta."
              );
            }
            const ch2 = setChapterMainVersion(ch, lastId);
            const p2 = replaceChapter(p, ch2);
            await persistProject(p2);
            const vNew = findVersion(ch2, lastId);
            if (vNew) setEditorText(vNew.content);
            setRevertMainVersionId(mainBeforeApply);
            setToast("Texto actualizado; puedes deshacer desde el asistente.");
          } catch (e) {
            setRevertMainVersionId(null);
            setToast(
              e instanceof Error ?
                e.message
              : "No se pudo fijar la nueva versión como la activa."
            );
          }
        }
        setAssistantReply(
          res.reply?.trim() ?
            res.reply
          : "La respuesta no trajo texto visible. Puedes reformular la petición o ampliar la selección."
        );
      } catch (e) {
        setAssistantReply(
          e instanceof Error ? e.message : "No se pudo contactar al asistente."
        );
      } finally {
        setAssistantBusy(false);
      }
    },
    [
      activeBranchId,
      activeChapterId,
      activeVersionId,
      agentMode,
      editorText,
      projectId,
      persistProject,
      refs,
      selectionEnd,
      selectionStart,
      storyCtx,
    ]
  );

  const timelineLines = useMemo(() => {
    if (!remoteProject || !activeChapterId) return [];
    return buildEditorialTimeline(remoteProject, activeChapterId);
  }, [remoteProject, activeChapterId]);

  const namedMoments = useMemo(() => {
    if (!remoteProject || !activeChapterId) return [];
    const fromMeta = listMomentLabelsFromMetadata(
      remoteProject,
      activeChapterId
    );
    if (fromMeta.length > 0) return fromMeta;
    return loadLocalMoments(projectId).map((m) => ({
      label: m.label,
      hint: new Date(m.savedAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
    }));
  }, [remoteProject, activeChapterId, projectId]);

  const onCreateVariation = useCallback(
    (name: string) => {
      if (!remoteProject || !activeChapterId) {
        setToast("Aún cargamos tu libro; inténtalo en un momento.");
        return;
      }
      try {
        const { project, userMessage } = recordNarrativeExploration({
          project: remoteProject,
          chapterId: activeChapterId,
          intentLabel: name,
          editorContent: editorText,
        });
        void persistProject(project).then(() => setToast(userMessage));
      } catch (e) {
        setToast(
          e instanceof Error ? e.message : "No se pudo crear la exploración"
        );
      }
    },
    [remoteProject, activeChapterId, editorText, persistProject]
  );

  const onConfirmSaveMoment = useCallback(
    (title: string) => {
      if (!remoteProject || !activeChapterId) {
        setToast("Aún cargamos tu libro; inténtalo en un momento.");
        return;
      }
      try {
        const { project, userMessage } = recordNarrativeMoment({
          project: remoteProject,
          chapterId: activeChapterId,
          title,
          editorContent: editorText,
        });
        void persistProject(project).then(() => setToast(userMessage));
      } catch (e) {
        setToast(
          e instanceof Error ? e.message : "No se pudo guardar el momento"
        );
      }
    },
    [remoteProject, activeChapterId, editorText, persistProject]
  );

  const showRightPanel = contextOpenDesktop || contextDrawerOpen;

  return (
    <div
      className="flex min-h-dvh min-h-0 flex-col lg:flex-row"
      data-project-id={projectId}
    >
      {toast ?
        <div
          className={[
            "fixed bottom-24 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-2xl border border-nm-border",
            "bg-nm-surface/95 px-4 py-3 text-center text-sm text-nm-text shadow-xl sm:bottom-28",
          ].join(" ")}
          role="status"
        >
          {toast}
        </div>
      : null}

      <div className="shrink-0 lg:h-auto">
        <NarrativeWorkspaceNav
          onMoments={() => setOverlay("moments")}
          onExplore={() => setOverlay("variation")}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {projectError ?
          <p className="px-4 py-3 text-sm text-red-300">{projectError}</p>
        : null}

        <NarrativeWorkspaceChrome
          bookTitle={bookTitle}
          chapterTitle={chapterTitle}
          referencesActive={referencesActive}
          onReferencesActiveChange={setReferencesActive}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          contextPanelHidden={!showRightPanel}
          draftStatus={draftStatus}
          onSaveMoment={() => setSaveMomentOpen(true)}
          onOpenContext={() => {
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(min-width: 1024px)").matches
            ) {
              setContextOpenDesktop(true);
            } else {
              setContextDrawerOpen(true);
            }
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-2 sm:px-6">
              <NarrativeEditor
                value={editorText}
                onChange={setEditorText}
                onWordCount={setWordCount}
                onToast={setToast}
                onSelectionChange={(a, b) => {
                  setSelectionStart(a);
                  setSelectionEnd(b);
                }}
                onAgentInstruction={(instruction, fragment) => {
                  void invokeNarrativeAgent(
                    `${instruction}\n\n--- Fragmento ---\n\n${fragment}`
                  );
                }}
                onRequestExploration={() => {
                  setOverlay("variation");
                  setToast(
                    "Elige un nombre humano para esta otra posibilidad narrativa."
                  );
                }}
              />
            </div>

            <div className="sticky bottom-0 z-30 mt-auto bg-gradient-to-t from-nm-bg-deep via-nm-bg-deep/95 to-transparent pt-4">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-3 pb-2 text-xs text-nm-text-muted sm:px-4">
                <span>{wordCount} palabras</span>
                <span className="max-w-[70%] truncate text-right text-nm-text-secondary sm:max-w-none">
                  Objetivo: {chapterObjective}
                </span>
              </div>
              <NarrativeAgentBar
                value={agentInput}
                onChange={setAgentInput}
                onChip={onChip}
                onStar={() => {
                  const msg = agentInput.trim();
                  if (!msg) {
                    setOverlay("assistant");
                    return;
                  }
                  void invokeNarrativeAgent(msg);
                }}
              />
            </div>
          </div>

          {contextOpenDesktop ?
            <div
              className={[
                "hidden h-full w-[min(100%,var(--nm-context-width))] shrink-0 lg:block",
              ].join(" ")}
            >
              <NarrativeContextPanel
                synopsis={synopsis}
                themes={themesBoot}
                toneLabel={toneLabel}
                tonePercent={tonePercent}
                references={refs}
                onToggleReference={toggleRef}
                storyContext={storyCtx}
              />
            </div>
          : null}
        </div>
      </div>

      {contextDrawerOpen ?
        <div
          className={[
            "fixed inset-0 z-40 flex justify-end lg:hidden",
          ].join(" ")}
        >
          <button
            type="button"
            aria-label="Cerrar contexto"
            className="absolute inset-0 bg-black/50"
            onClick={() => setContextDrawerOpen(false)}
          />
          <div className="relative h-full w-[min(100%,20rem)] shadow-2xl">
            <NarrativeContextPanel
              synopsis={synopsis}
              themes={themesBoot}
              toneLabel={toneLabel}
              tonePercent={tonePercent}
              references={refs}
              onToggleReference={toggleRef}
              storyContext={storyCtx}
            />
            <button
              type="button"
              onClick={() => setContextDrawerOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-nm-surface px-3 py-1 text-xs text-nm-text-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      : null}

      <AssistantOverlay
        open={overlay === "assistant"}
        onClose={() => {
          setOverlay(null);
          setAssistantReply(null);
          setAssistantBusy(false);
        }}
        reply={assistantReply}
        busy={assistantBusy}
        variationUndoable={revertMainVersionId !== null}
        onUndoVariation={() => void undoLastAgentVariation()}
        undoBusy={undoBusy}
      />
      <VariationOverlay
        open={overlay === "variation"}
        onClose={() => setOverlay(null)}
        onCreate={onCreateVariation}
      />
      <SavedMomentsOverlay
        open={overlay === "moments"}
        onClose={() => setOverlay(null)}
        timeline={timelineLines}
        namedMoments={namedMoments}
      />
      <SaveMomentOverlay
        open={saveMomentOpen}
        onClose={() => setSaveMomentOpen(false)}
        onConfirm={onConfirmSaveMoment}
      />
    </div>
  );
}
