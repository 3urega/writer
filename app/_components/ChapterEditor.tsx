"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChapterNotesPanel } from "@/app/_components/write/ChapterNotesPanel";
import { ContextPanel } from "@/app/_components/write/ContextPanel";
import { EditorHeader } from "@/app/_components/write/EditorHeader";
import { EditorMarkdownToolbar } from "@/app/_components/write/EditorMarkdownToolbar";
import { EditorStatsFooter } from "@/app/_components/write/EditorStatsFooter";
import { FloatingSelectionToolbar } from "@/app/_components/write/FloatingSelectionToolbar";
import { ImprovePanel } from "@/app/_components/write/ImprovePanel";
import { NarrativeCompareView } from "@/app/_components/write/NarrativeCompareView";
import { NewVariationModal } from "@/app/_components/write/NewVariationModal";
import { RestoreDraftDialog } from "@/app/_components/write/RestoreDraftDialog";
import {
  WorkspaceBottomPanel,
  type WorkspaceTabId,
} from "@/app/_components/write/WorkspaceBottomPanel";
import { VariationSidebar } from "@/app/_components/write/VariationSidebar";
import { KnowledgeLibrary } from "@/app/_components/KnowledgeLibrary";
import { splitIntoBlocks } from "@/lib/domain/blocks";
import type { Fragment, Version } from "@/lib/domain/types";
import {
  amendLoneEmptyBranchTip,
  clampSelectionRange,
  createIntentVariation,
  createMergedVersion,
  createVersionSnapshot,
  findBranch,
  findChapter,
  findMainBranchForChapter,
  findVersion,
  replaceChapter,
  saveNewVersionInChapter,
  setChapterMainVersion,
} from "@/lib/domain/versioning";
import { narrativePairHints } from "@/lib/narrative/diffIntelligence";
import {
  clearDraft,
  clearDraftsForProject,
  loadDraft,
  saveDraft,
} from "@/lib/storage/draftStore";
import {
  getDefaultProjectState,
  localProjectStore,
  projectStateFromRemoteProject,
  type ProjectState,
} from "@/lib/storage/projectStore";
import {
  clearStoredRemoteProjectId,
  getDefaultRemoteProjectIdFromEnv,
  getStoredRemoteProjectId,
  setStoredRemoteProjectId,
} from "@/lib/storage/remoteProjectId";
import {
  createProjectOnServer,
  fetchProjectFromServer,
  putProjectToServer,
} from "@/lib/storage/serverProjectClient";

/** Fecha estable entre SSR y cliente: locale y zona fijos (evita hydration mismatch). */
function formatVersionTimestamp(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "?";
  return t.toLocaleString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatVersionLabel(v: Version, index: number, isMain: boolean): string {
  const time = formatVersionTimestamp(v.createdAt);
  return `${isMain ? "◆ " : ""}#${index + 1} · ${v.createdBy === "agent" ? "IA" : "Autor"} · ${time} UTC`;
}

/** Primera línea del contenido para identificar la versión en listas y comparador. */
function versionFirstLinePreview(content: string, maxLen = 52): string {
  const raw = content.trim().split(/\n/)[0]?.trim() ?? "";
  if (!raw) return "Sin texto";
  const oneLine = raw.replace(/\s+/g, " ");
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen)}…`;
}

function formatCompareVersionSelectLabel(
  v: Version,
  chronologyIndex: number,
  isMain: boolean,
  branchLabel: string | null
): string {
  const preview = versionFirstLinePreview(v.content);
  const crown = isMain ? "◆ " : "";
  const who = v.createdBy === "agent" ? "IA" : "Autor";
  const when = formatVersionTimestamp(v.createdAt);
  const branch = branchLabel ? `${branchLabel} · ` : "";
  return `${crown}#${chronologyIndex + 1} · «${preview}» · ${branch}${who} · ${when} UTC`;
}

const SYNC_DEBOUNCE_MS = 1500;
const DRAFT_DEBOUNCE_MS = 450;

export type ChapterEditorProps = {
  /** Si viene de `/write?project=…`, tiene prioridad sobre el id guardado en el navegador. */
  preferredRemoteProjectId?: string | null;
};

export function ChapterEditor({
  preferredRemoteProjectId = null,
}: ChapterEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [state, setState] = useState<ProjectState>(getDefaultProjectState);
  const editorContentRef = useRef(state.editorContent);

  useEffect(() => {
    editorContentRef.current = state.editorContent;
  });

  const [fragment, setFragment] = useState<Fragment | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [remoteProjectId, setRemoteProjectId] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastPushedRef = useRef<string>("");

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>("improve");
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [improvePanelNonce, setImprovePanelNonce] = useState(0);
  const [improveInitialMessage, setImproveInitialMessage] = useState("");

  const bumpImprovePanel = useCallback((initialMessage: string) => {
    setImproveInitialMessage(initialMessage);
    setImprovePanelNonce((n) => n + 1);
  }, []);

  const [pendingRestore, setPendingRestore] = useState<
    import("@/lib/storage/draftStore").DraftRecord | null
  >(null);
  const restoreSettledKeyRef = useRef<string>("");
  const [focusMode, setFocusMode] = useState(false);
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState<string | null>(null);
  const [lastEditAt, setLastEditAt] = useState<string | null>(null);

  useEffect(() => {
    const fromStorage = localProjectStore.load();
    const run = () => {
      if (fromStorage) setState(fromStorage);
      setHydrated(true);
    };
    queueMicrotask(run);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      setRemoteLoading(true);
      setRemoteError(null);
      const envId = getDefaultRemoteProjectIdFromEnv();
      const storedId = getStoredRemoteProjectId();
      const preferred =
        preferredRemoteProjectId && preferredRemoteProjectId.trim() ?
          preferredRemoteProjectId.trim()
        : null;
      let id: string | null = preferred ?? envId ?? storedId;

      if (id) {
        setRemoteProjectId(id);
        try {
          const p = await fetchProjectFromServer(id);
          if (cancelled) return;
          restoreSettledKeyRef.current = "";
          setPendingRestore(null);
          setState(projectStateFromRemoteProject(p));
          setStoredRemoteProjectId(p.id);
          setRemoteProjectId(p.id);
          lastPushedRef.current = JSON.stringify(p);
        } catch (e) {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : "Error al cargar";
          if (msg.includes("no encontr") || msg.includes("404")) {
            clearStoredRemoteProjectId();
            if (preferred) {
              setRemoteError("No se encontró ese libro en el servidor.");
              setRemoteLoading(false);
              return;
            }
            id = null;
            setRemoteProjectId(null);
          } else {
            setRemoteError(msg);
            setRemoteLoading(false);
            return;
          }
        }
      }

      if (!id && !cancelled) {
        try {
          const local = localProjectStore.load();
          if (local) {
            const newId = await createProjectOnServer(local.project);
            if (cancelled) return;
            setStoredRemoteProjectId(newId);
            setRemoteProjectId(newId);
            if (newId === local.project.id) {
              restoreSettledKeyRef.current = "";
              setPendingRestore(null);
              setState(local);
              lastPushedRef.current = JSON.stringify(local.project);
            } else {
              const p = await fetchProjectFromServer(newId);
              if (cancelled) return;
              restoreSettledKeyRef.current = "";
              setPendingRestore(null);
              setState(projectStateFromRemoteProject(p));
              lastPushedRef.current = JSON.stringify(p);
            }
          } else {
            const newId = await createProjectOnServer();
            if (cancelled) return;
            setStoredRemoteProjectId(newId);
            setRemoteProjectId(newId);
            const p = await fetchProjectFromServer(newId);
            if (cancelled) return;
            restoreSettledKeyRef.current = "";
            setPendingRestore(null);
            setState(projectStateFromRemoteProject(p));
            lastPushedRef.current = JSON.stringify(p);
          }
        } catch (e) {
          if (cancelled) return;
          setRemoteError(
            e instanceof Error ? e.message : "Error con el servidor"
          );
        }
      }

      if (!cancelled) setRemoteLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, preferredRemoteProjectId]);

  useEffect(() => {
    if (!hydrated) return;
    localProjectStore.save(state);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const key = {
      projectId: state.project.id,
      chapterId: state.activeChapterId,
      branchId: state.activeBranchId ?? null,
    };
    const t = window.setTimeout(() => {
      void saveDraft({
        ...key,
        content: state.editorContent,
        baseVersionId: state.activeVersionId,
        updatedAt: new Date().toISOString(),
      }).then(() => {
        setLastLocalSaveAt(new Date().toISOString());
      });
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    state.editorContent,
    state.project.id,
    state.activeChapterId,
    state.activeBranchId,
    state.activeVersionId,
    hydrated,
    preferredRemoteProjectId,
  ]);

  useEffect(() => {
    if (!hydrated || remoteLoading) return;
    const sk = `${state.project.id}\0${state.activeChapterId}\0${state.activeBranchId ?? ""}\0${state.activeVersionId}`;
    if (restoreSettledKeyRef.current === sk) return;
    restoreSettledKeyRef.current = sk;
    let cancelled = false;
    const key = {
      projectId: state.project.id,
      chapterId: state.activeChapterId,
      branchId: state.activeBranchId ?? null,
    };
    void (async () => {
      const d = await loadDraft(key);
      if (cancelled || !d) return;
      // El borrador es por rama, no por versión: ignorar restos de otra versión de la misma rama.
      if (d.baseVersionId !== state.activeVersionId) {
        void clearDraft(key);
        return;
      }
      if (d.content === editorContentRef.current) return;
      setPendingRestore(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    remoteLoading,
    state.project.id,
    state.activeChapterId,
    state.activeBranchId,
    state.activeVersionId,
  ]);

  useEffect(() => {
    if (!remoteProjectId || !hydrated || remoteLoading) return;
    const s = JSON.stringify(state.project);
    if (s === lastPushedRef.current) return;
    const t = window.setTimeout(() => {
      (async () => {
        setSyncing(true);
        setSyncError(null);
        try {
          await putProjectToServer(remoteProjectId, state.project);
          lastPushedRef.current = s;
        } catch (e) {
          setSyncError(
            e instanceof Error ? e.message : "Error al guardar en servidor"
          );
        } finally {
          setSyncing(false);
        }
      })();
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [state.project, remoteProjectId, hydrated, remoteLoading]);

  const refreshProjectFromServer = useCallback(async () => {
    if (!remoteProjectId) return;
    try {
      const p = await fetchProjectFromServer(remoteProjectId);
      restoreSettledKeyRef.current = "";
      setPendingRestore(null);
      setState((prev) => {
        const ch = findChapter(p, prev.activeChapterId);
        if (!ch) return projectStateFromRemoteProject(p);
        const bid = prev.activeBranchId;
        const branchVersions = ch.versions
          .filter((v) => v.branchId === bid)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        const tip = branchVersions[0];
        if (!tip) {
          return { ...prev, project: p };
        }
        return {
          ...prev,
          project: p,
          activeVersionId: tip.id,
          editorContent: tip.content,
        };
      });
      lastPushedRef.current = JSON.stringify(p);
    } catch {
      /* ignore refresh errors en panel IA */
    }
  }, [remoteProjectId]);

  const onSync = async () => {
    if (!remoteProjectId) {
      setSyncError("Aún no hay proyecto en el servidor");
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      await putProjectToServer(remoteProjectId, state.project);
      lastPushedRef.current = JSON.stringify(state.project);
    } catch (e) {
      setSyncError(
        e instanceof Error ? e.message : "Error al guardar en servidor"
      );
    } finally {
      setSyncing(false);
    }
  };

  const activeChapter = findChapter(state.project, state.activeChapterId);
  const versionsInActiveBranch = useMemo(() => {
    const ch = findChapter(state.project, state.activeChapterId);
    if (!ch) return [];
    const all = ch.versions;
    const bid = state.activeBranchId;
    if (bid == null) return all;
    return all.filter((v) => v.branchId === bid);
  }, [state.project, state.activeChapterId, state.activeBranchId]);

  const branches = activeChapter?.branches ?? [];
  const mainBranch = activeChapter
    ? findMainBranchForChapter(activeChapter)
    : undefined;
  const activeVersion = activeChapter
    ? findVersion(activeChapter, state.activeVersionId)
    : undefined;
  const mainVersionId = activeChapter?.mainVersionId ?? null;

  const activeBranchEntity =
    state.activeBranchId && activeChapter
      ? findBranch(activeChapter, state.activeBranchId)
      : null;
  const mainBranchIdForSidebar = mainBranch?.id ?? null;
  const isOnMainBranch = Boolean(
    mainBranchIdForSidebar && state.activeBranchId === mainBranchIdForSidebar
  );

  const versionCountByBranchId = useMemo(() => {
    const ch = findChapter(state.project, state.activeChapterId);
    const list = ch?.versions ?? [];
    const m: Record<string, number> = {};
    for (const v of list) {
      const bid = v.branchId ?? "";
      if (!bid) continue;
      m[bid] = (m[bid] ?? 0) + 1;
    }
    return m;
  }, [state.project, state.activeChapterId]);

  const chapterOptions = useMemo(() => {
    return [...state.project.chapters]
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        id: ch.id,
        label:
          ch.title.trim() ?
            `${ch.order + 1}. ${ch.title.trim()}`
          : `Capítulo ${ch.order + 1}`,
      }));
  }, [state.project.chapters]);

  const chapterSubtitle =
    activeChapter ?
      activeChapter.title.trim() ?
        `${activeChapter.order + 1}. ${activeChapter.title.trim()}`
      : `Capítulo ${activeChapter.order + 1}`
    : "";

  const variationLabel = activeBranchEntity?.name ?? mainBranch?.name ?? "Principal";

  const isDirty =
    activeVersion != null && state.editorContent !== activeVersion.content;

  const readSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      setFragment(null);
      return;
    }
    const { start: a, end: b } = clampSelectionRange(
      start,
      end,
      state.editorContent.length
    );
    setFragment({
      start: a,
      end: b,
      text: state.editorContent.slice(a, b),
    });
  }, [state.editorContent]);

  const onChangeContent = (value: string) => {
    setLastEditAt(new Date().toISOString());
    setState((s) => ({ ...s, editorContent: value }));
  };

  const insertMarkdown = useCallback((before: string, after: string) => {
    const el = textareaRef.current;
    setState((s) => {
      const v = s.editorContent;
      if (!el) {
        return { ...s, editorContent: v + before + after };
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const sel = v.slice(start, end);
      const next = v.slice(0, start) + before + sel + after + v.slice(end);
      const caret = start + before.length + sel.length + after.length;
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
      return { ...s, editorContent: next };
    });
  }, []);

  const confirmLoseDirty = (): boolean => {
    if (!isDirty) return true;
    return window.confirm(
      "Tienes cambios que aún no has guardado en el historial (Guardar). ¿Seguir sin guardar?"
    );
  };

  const onSelectVersion = (versionId: string) => {
    if (versionId === state.activeVersionId) return;
    if (!confirmLoseDirty()) return;
    void clearDraft({
      projectId: state.project.id,
      chapterId: state.activeChapterId,
      branchId: state.activeBranchId ?? null,
    });
    setPendingRestore(null);
    const ch = findChapter(state.project, state.activeChapterId);
    if (!ch) return;
    const v = findVersion(ch, versionId);
    if (!v) return;
    setState((s) => ({
      ...s,
      activeVersionId: versionId,
      activeBranchId: v.branchId ?? s.activeBranchId,
      editorContent: v.content,
    }));
    setFragment(null);
    restoreSettledKeyRef.current = "";
  };

  const onSelectBranch = (branchId: string) => {
    if (branchId === state.activeBranchId) return;
    if (!confirmLoseDirty()) return;
    void clearDraft({
      projectId: state.project.id,
      chapterId: state.activeChapterId,
      branchId: state.activeBranchId ?? null,
    });
    setPendingRestore(null);
    const ch = findChapter(state.project, state.activeChapterId);
    if (!ch) return;
    const b = findBranch(ch, branchId);
    if (!b) return;
    const inBranch = ch.versions
      .filter((v) => v.branchId === branchId)
      .sort(
        (a, c) =>
          new Date(c.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    if (inBranch) {
      setState((s) => ({
        ...s,
        activeBranchId: branchId,
        activeVersionId: inBranch.id,
        editorContent: inBranch.content,
        compareVersionA: null,
        compareVersionB: null,
      }));
    } else {
      setState((s) => ({
        ...s,
        activeBranchId: branchId,
        compareVersionA: null,
        compareVersionB: null,
      }));
    }
    setFragment(null);
    restoreSettledKeyRef.current = "";
  };

  const onChapterChange = (chapterId: string) => {
    if (chapterId === state.activeChapterId) return;
    if (!confirmLoseDirty()) return;
    void clearDraft({
      projectId: state.project.id,
      chapterId: state.activeChapterId,
      branchId: state.activeBranchId ?? null,
    });
    setPendingRestore(null);
    const ch = findChapter(state.project, chapterId);
    if (!ch) return;
    const sorted = [...ch.versions].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const mainId = ch.mainVersionId;
    const mainV =
      (mainId && ch.versions.find((v) => v.id === mainId)) ?? sorted[0];
    const mainBr = findMainBranchForChapter(ch);
    if (!mainV) return;
    setState((s) => ({
      ...s,
      activeChapterId: chapterId,
      activeVersionId: mainV.id,
      activeBranchId: mainV.branchId ?? mainBr?.id ?? null,
      editorContent: mainV.content,
      compareVersionA: null,
      compareVersionB: null,
    }));
    setFragment(null);
    restoreSettledKeyRef.current = "";
  };

  const onChapterTitleBlur = (next: string) => {
    const t = next.trim();
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      if ((ch.title ?? "") === t) return s;
      const nextCh = { ...ch, title: t };
      return { ...s, project: replaceChapter(s.project, nextCh) };
    });
  };

  const onAdoptToMainLine = () => {
    if (!activeChapter || !mainBranch) return;
    if (isOnMainBranch) {
      window.alert("Ya estás en la línea principal.");
      return;
    }
    if (
      !confirm(
        "Se creará una nueva versión en la línea principal con el texto actual del editor y se marcará como versión oficial. ¿Continuar?"
      )
    ) {
      return;
    }
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const mainBr = findMainBranchForChapter(ch);
      if (!mainBr) return s;
      const tip = ch.versions
        .filter((v) => v.branchId === mainBr.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      if (!tip) return s;
      const newVersion = createVersionSnapshot({
        content: s.editorContent,
        parentVersionId: tip.id,
        createdBy: "user",
        branchId: mainBr.id,
      });
      const { chapter: nextCh, newVersionId } = saveNewVersionInChapter(
        ch,
        newVersion
      );
      const withMain = setChapterMainVersion(nextCh, newVersionId);
      void clearDraft({
        projectId: s.project.id,
        chapterId: s.activeChapterId,
        branchId: mainBr.id,
      });
      restoreSettledKeyRef.current = "";
      const nv = findVersion(withMain, newVersionId);
      return {
        ...s,
        project: replaceChapter(s.project, withMain),
        activeVersionId: newVersionId,
        activeBranchId: mainBr.id,
        editorContent: nv?.content ?? newVersion.content,
      };
    });
  };

  const onSaveVersion = () => {
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const fromVer = findVersion(ch, s.activeVersionId);
      if (!fromVer) return s;
      const mainBr = findMainBranchForChapter(ch);
      const bid =
        s.activeBranchId ?? fromVer?.branchId ?? mainBr?.id ?? null;
      if (bid == null) return s;

      const amendedChapter = amendLoneEmptyBranchTip(
        ch,
        s.activeVersionId,
        bid,
        s.editorContent
      );
      if (amendedChapter) {
        void clearDraft({
          projectId: s.project.id,
          chapterId: s.activeChapterId,
          branchId: s.activeBranchId ?? null,
        });
        restoreSettledKeyRef.current = "";
        return {
          ...s,
          project: replaceChapter(s.project, amendedChapter),
          activeVersionId: s.activeVersionId,
          editorContent: s.editorContent,
          activeBranchId: bid,
        };
      }

      const newVersion = createVersionSnapshot({
        content: s.editorContent,
        parentVersionId: s.activeVersionId,
        createdBy: "user",
        branchId: bid,
      });
      const { chapter: nextChapter, newVersionId } = saveNewVersionInChapter(
        ch,
        newVersion
      );
      void clearDraft({
        projectId: s.project.id,
        chapterId: s.activeChapterId,
        branchId: s.activeBranchId ?? null,
      });
      restoreSettledKeyRef.current = "";
      return {
        ...s,
        project: replaceChapter(s.project, nextChapter),
        activeVersionId: newVersionId,
        editorContent: newVersion.content,
        activeBranchId: bid,
      };
    });
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (isDirty) onSaveVersion();
    }
  };

  const onCreateVariationSubmit = (name: string, intention: string) => {
    setVariationModalOpen(false);
    setState((s) => {
      const ch0 = findChapter(s.project, s.activeChapterId);
      if (!ch0) return s;
      const from = findVersion(ch0, s.activeVersionId);
      if (!from) return s;
      const { chapter, newVersion, newVersionId, newBranchId } =
        createIntentVariation(ch0, {
          intentLabel: name,
          description: intention || undefined,
          fromVersion: from,
        });
      restoreSettledKeyRef.current = "";
      return {
        ...s,
        project: replaceChapter(s.project, chapter),
        activeVersionId: newVersionId,
        activeBranchId: newBranchId,
        editorContent: newVersion.content,
        viewMode: "edit",
      };
    });
  };

  const onSetOfficial = (versionId: string) => {
    if (!activeChapter) return;
    if (
      !confirm(
        "Esta será la versión oficial del capítulo (referencia principal). ¿Continuar?"
      )
    ) {
      return;
    }
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const next = setChapterMainVersion(ch, versionId);
      return { ...s, project: replaceChapter(s.project, next) };
    });
  };

  const textCompareA =
    !activeChapter || state.compareVersionA == null ?
      ""
    : findVersion(activeChapter, state.compareVersionA)?.content ?? "";

  const textCompareB =
    !activeChapter || state.compareVersionB == null ?
      ""
    : findVersion(activeChapter, state.compareVersionB)?.content ?? "";

  const vA =
    activeChapter && state.compareVersionA ?
      findVersion(activeChapter, state.compareVersionA)
    : undefined;
  const vB =
    activeChapter && state.compareVersionB ?
      findVersion(activeChapter, state.compareVersionB)
    : undefined;

  const versionsChronological = [...versionsInActiveBranch].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const hints = vA && vB ? narrativePairHints(vA.content, vB.content) : null;

  const ensureComparePair = useCallback((): void => {
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const bid = s.activeBranchId;
      const branchVers =
        bid != null ?
          ch.versions.filter((v) => v.branchId === bid)
        : [...ch.versions];
      const sorted = [...branchVers].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      if (sorted.length === 0) return s;

      const mainId = ch.mainVersionId;
      const mainVer = mainId ?
        branchVers.find((v) => v.id === mainId)
      : undefined;
      const refDefault = mainVer?.id ?? sorted[0].id;

      const pickOtherThan = (avoid: string): string => {
        const others = sorted.filter((v) => v.id !== avoid);
        return others.length ? others[others.length - 1].id : avoid;
      };

      const a = s.compareVersionA ?? refDefault;
      let b =
        s.compareVersionB ??
        (s.activeVersionId !== a ? s.activeVersionId : pickOtherThan(a));

      if (a === b && sorted.length > 1) {
        b = pickOtherThan(a);
      }

      if (a === s.compareVersionA && b === s.compareVersionB) return s;
      return { ...s, compareVersionA: a, compareVersionB: b };
    });
  }, []);

  const onWorkspaceTabChange = useCallback(
    (t: WorkspaceTabId) => {
      setWorkspaceTab(t);
      if (t === "compare") {
        ensureComparePair();
      }
    },
    [ensureComparePair]
  );

  const onApplySuggestedText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setLastEditAt(new Date().toISOString());
    setState((s) => ({
      ...s,
      editorContent:
        s.editorContent.trim() ?
          `${s.editorContent.trim()}\n\n${t}`
        : t,
    }));
  }, []);

  const onMerge = (mode: "keepA" | "keepB" | "smart") => {
    if (!vA || !vB || !activeChapter) return;
    const merged = createMergedVersion(vA, vB, mode, {});
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const { chapter: next, newVersionId } = saveNewVersionInChapter(ch, merged);
      void clearDraft({
        projectId: s.project.id,
        chapterId: s.activeChapterId,
        branchId: s.activeBranchId ?? null,
      });
      restoreSettledKeyRef.current = "";
      return {
        ...s,
        project: replaceChapter(s.project, next),
        activeVersionId: newVersionId,
        editorContent: merged.content,
        viewMode: "edit",
      };
    });
  };

  const onResetLocal = () => {
    if (
      !confirm(
        "Borrar datos locales, desvincular el proyecto remoto y crear uno nuevo en el servidor?"
      )
    ) {
      return;
    }
    const pid = state.project.id;
    void clearDraftsForProject(pid);
    localProjectStore.clear();
    clearStoredRemoteProjectId();
    setFragment(null);
    setRemoteError(null);
    setSyncError(null);
    restoreSettledKeyRef.current = "";
    (async () => {
      setRemoteLoading(true);
      try {
        const newId = await createProjectOnServer();
        setStoredRemoteProjectId(newId);
        setRemoteProjectId(newId);
        const p = await fetchProjectFromServer(newId);
        setState(projectStateFromRemoteProject(p));
        lastPushedRef.current = JSON.stringify(p);
      } catch (e) {
        setRemoteError(
          e instanceof Error ? e.message : "Error al reiniciar en servidor"
        );
        setState(getDefaultProjectState());
        setRemoteProjectId(null);
      } finally {
        setRemoteLoading(false);
      }
    })();
  };

  const openImprove = useCallback(() => {
    setWorkspaceTab("improve");
  }, []);

  if (!activeChapter) {
    return <p className="p-4 text-cf-text-muted">No hay capítulo activo.</p>;
  }

  const blocks = showBlocks ? splitIntoBlocks(state.editorContent) : [];

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-3 pb-20 pt-2 sm:px-4 sm:pb-6 lg:max-w-[min(96rem,100%)] lg:px-6">
      {remoteError ? (
        <p className="rounded-lg border border-cf-warning/40 bg-cf-warning/10 p-2 text-sm text-cf-warning">
          Servidor: {remoteError} (puedes seguir con el borrador local.)
        </p>
      ) : null}
      {syncError ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30 p-2 text-sm text-red-200">
          <span>Sincronización: {syncError}</span>
          <button
            type="button"
            onClick={onSync}
            className="rounded-md border border-red-300/50 px-2 py-1 text-xs text-red-100 hover:bg-red-900/40"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <EditorHeader
        projectName={state.project.name}
        chapterOptions={chapterOptions}
        activeChapterId={state.activeChapterId}
        onChapterChange={onChapterChange}
        chapterSubtitle={chapterSubtitle}
        variationLabel={variationLabel}
        isDirty={isDirty}
        lastLocalSaveAt={lastLocalSaveAt}
        remoteLoading={remoteLoading}
        remoteProjectIdHasRemote={Boolean(remoteProjectId)}
        syncing={syncing}
        syncError={syncError}
        onCreateVersion={onSaveVersion}
        onImprove={openImprove}
        onSync={onSync}
        onResetLocal={onResetLocal}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((f) => !f)}
      />

      <p className="text-xs text-cf-text-muted">
        Lo que ves en el editor es <strong className="text-cf-text">borrador</strong>: forma parte del libro en
        cuanto pulsas <strong className="text-cf-text">Guardar</strong> (pasa al{" "}
        <strong className="text-cf-text">historial del capítulo</strong>). La primera vez que guardas texto en un
        capítulo nuevo, se rellena la primera entrada del historial (no se deja una versión vacía colgando). El
        rescate en navegador no sustituye a Guardar. «Sincronizado» indica que el proyecto llegó al servidor.
      </p>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-3 lg:gap-4 ${
          focusMode ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(260px,280px)_minmax(0,1fr)_minmax(300px,340px)]"
        }`}
      >
        {focusMode ? null : (
          <VariationSidebar
            branches={branches}
            activeBranchId={state.activeBranchId}
            mainBranchId={mainBranchIdForSidebar}
            versionCountByBranchId={versionCountByBranchId}
            onSelectBranch={onSelectBranch}
            onOpenNewVariation={() => setVariationModalOpen(true)}
          />
        )}

        <div className="flex min-h-[min(48vh,440px)] min-w-0 flex-col gap-2 lg:min-h-[min(52vh,560px)]">
          <FloatingSelectionToolbar
            fragment={fragment}
            onImprove={() => {
              setWorkspaceTab("improve");
              bumpImprovePanel(
                "Mejora el fragmento seleccionado manteniendo la intención y la voz del narrador."
              );
            }}
            onRewrite={() => {
              setWorkspaceTab("improve");
              bumpImprovePanel(
                "Reescribe el fragmento seleccionado con mayor precisión y claridad, sin alargar innecesariamente."
              );
            }}
            onChangeTone={() => {
              setWorkspaceTab("improve");
              bumpImprovePanel(
                "Ajusta el tono del fragmento seleccionado (más contenido, más cercano al lector) sin cambiar los hechos."
              );
            }}
            onCompare={() => onWorkspaceTabChange("compare")}
            onNewVariation={() => setVariationModalOpen(true)}
          />

          <EditorMarkdownToolbar onInsert={insertMarkdown} />

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-cf-text-muted">
                  Texto
                </label>
                <button
                  type="button"
                  onClick={onSaveVersion}
                  disabled={!isDirty}
                  className={
                    isDirty
                      ? "rounded-lg bg-cf-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                      : "cursor-not-allowed rounded-lg border border-cf-border bg-cf-bg/40 px-3 py-1.5 text-xs font-medium text-cf-text-muted"
                  }
                  title={
                    isDirty
                      ? "Guarda el texto en el historial del libro (Ctrl+S o ⌘S)"
                      : "No hay cambios nuevos respecto a la última versión"
                  }
                >
                  Guardar
                </button>
                <span className="hidden text-[10px] text-cf-text-muted sm:inline">
                  Ctrl+S · ⌘S
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-cf-text-muted">
                <input
                  type="checkbox"
                  checked={showBlocks}
                  onChange={(e) => setShowBlocks(e.target.checked)}
                />
                Vista por bloques
              </label>
            </div>
            <textarea
              ref={textareaRef}
              value={state.editorContent}
              onChange={(e) => onChangeContent(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              onSelect={readSelection}
              onMouseUp={readSelection}
              onKeyUp={readSelection}
              spellCheck
              className="min-h-[min(42vh,400px)] w-full flex-1 resize-y rounded-xl border border-cf-border bg-cf-bg/80 p-4 text-base leading-relaxed text-cf-text shadow-inner [font-family:var(--font-editor-serif),ui-serif,Georgia,serif]"
              placeholder="Escribe aquí…"
            />
            <EditorStatsFooter
              text={state.editorContent}
              lastChangeLabel={
                lastEditAt ?
                  new Date(lastEditAt).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "sin cambios aún"
              }
              lastLocalSaveLabel={lastLocalSaveAt}
            />
          </div>

          {showBlocks && blocks.length > 0 ? (
            <div>
              <h3 className="mb-1 text-xs font-medium text-cf-text-muted">
                Bloques (se doble salto de línea)
              </h3>
              <ol className="max-h-40 space-y-1 overflow-y-auto text-xs text-cf-text-muted">
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="rounded border border-cf-border p-1"
                  >
                    <span className="text-[10px] text-cf-text-muted">
                      {b.index + 1}
                    </span>{" "}
                    {b.text.slice(0, 120)}
                    {b.text.length > 120 ? "…" : ""}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        {focusMode ? null : (
          <ContextPanel
            versions={versionsInActiveBranch}
            activeVersionId={state.activeVersionId}
            mainVersionId={mainVersionId}
            onSelectVersion={onSelectVersion}
            onSetOfficial={onSetOfficial}
            formatVersionLabel={formatVersionLabel}
            fragment={fragment}
            activeDocsSummary="Activa PDFs en la pestaña Conocimiento (inferior); solo los que estén en ON influyen en la IA."
            onOpenKnowledgeTab={() => setWorkspaceTab("knowledge")}
            chapterId={state.activeChapterId}
            chapterTitle={activeChapter.title ?? ""}
            onChapterTitleBlur={onChapterTitleBlur}
          />
        )}
      </div>

      <WorkspaceBottomPanel
        active={workspaceTab}
        onTabChange={onWorkspaceTabChange}
        compare={
          <div className="space-y-4">
            <p className="text-sm text-cf-text-muted">
              Compara dos versiones en paralelo. Por defecto:{" "}
              <strong className="text-cf-text">oficial</strong> frente a la versión{" "}
              <strong className="text-cf-text">activa</strong> en tu sesión. Las acciones inferiores
              crean una <strong className="text-cf-text">nueva versión</strong> en la rama actual.
            </p>
            {!isOnMainBranch ? (
              <div className="rounded-xl border border-cf-primary/30 bg-cf-primary-soft/40 p-3 text-sm text-cf-text">
                <p className="font-medium text-cf-primary">Llevar esto a la línea principal</p>
                <p className="mt-1 text-xs leading-relaxed text-cf-text-muted">
                  Si esta variación ya es la dirección que quieres conservar, puedes grabar el texto
                  del editor como nueva versión en la <strong className="text-cf-text">rama principal</strong>{" "}
                  y dejarla como referencia oficial del capítulo.
                </p>
                <button
                  type="button"
                  onClick={onAdoptToMainLine}
                  className="mt-2 rounded-lg bg-cf-primary px-3 py-2 text-xs font-medium text-white"
                >
                  Adoptar en línea principal
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-end gap-3 text-xs">
              {state.compareVersionA === state.compareVersionB &&
              versionsChronological.length > 1 ? (
                <p className="w-full text-[11px] text-cf-warning">
                  A y B coinciden; elige otra versión en uno de los desplegables para comparar.
                </p>
              ) : null}
              {versionsChronological.length < 2 ? (
                <p className="w-full text-[11px] text-cf-text-muted">
                  Necesitas al menos dos versiones en el capítulo para comparar textos distintos.
                </p>
              ) : null}
              <div>
                <span className="mb-0.5 block text-cf-text-muted">
                  Versión A (referencia)
                </span>
                <select
                  value={state.compareVersionA ?? ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      compareVersionA: e.target.value || null,
                    }))
                  }
                  className="max-w-full min-w-[min(100%,28rem)] rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-cf-text"
                >
                  {versionsChronological.map((v, i) => {
                    const isMain = v.id === mainVersionId;
                    const branchLabel =
                      v.branchId && activeChapter ?
                        findBranch(activeChapter, v.branchId)?.name ?? null
                      : null;
                    return (
                      <option key={v.id} value={v.id}>
                        {formatCompareVersionSelectLabel(
                          v,
                          i,
                          isMain,
                          branchLabel
                        )}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <span className="mb-0.5 block text-cf-text-muted">
                  Versión B (actual)
                </span>
                <select
                  value={state.compareVersionB ?? ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      compareVersionB: e.target.value || null,
                    }))
                  }
                  className="max-w-full min-w-[min(100%,28rem)] rounded-lg border border-cf-border bg-cf-bg px-2 py-1.5 text-cf-text"
                >
                  {versionsChronological.map((v, i) => {
                    const isMain = v.id === mainVersionId;
                    const branchLabel =
                      v.branchId && activeChapter ?
                        findBranch(activeChapter, v.branchId)?.name ?? null
                      : null;
                    return (
                      <option key={v.id} value={v.id}>
                        {formatCompareVersionSelectLabel(
                          v,
                          i,
                          isMain,
                          branchLabel
                        )}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            {hints && state.compareVersionA && state.compareVersionB ? (
              <div className="rounded-xl border border-cf-border bg-cf-bg/40 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-cf-text-muted">
                  Ideas
                </h3>
                <p className="mt-1 text-[11px] text-cf-text-muted">
                  Pistas automáticas (no sustituyen tu lectura); úsalas como checklist breve.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-cf-text">
                  {hints.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {state.compareVersionA && state.compareVersionB ? (
              <NarrativeCompareView
                labelOriginal="Versión A (referencia)"
                labelRevision="Versión B (actual)"
                textOriginal={textCompareA}
                textRevision={textCompareB}
              />
            ) : null}
            {vA && vB ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => onMerge("keepA")}
                  className="rounded-lg bg-emerald-800/90 px-3 py-2 text-sm text-white"
                >
                  Conservar A (referencia)
                </button>
                <button
                  type="button"
                  onClick={() => onMerge("keepB")}
                  className="rounded-lg bg-rose-900/80 px-3 py-2 text-sm text-white"
                >
                  Conservar B (actual)
                </button>
                <button
                  type="button"
                  onClick={() => onMerge("smart")}
                  className="rounded-lg border border-cf-primary px-3 py-2 text-sm text-cf-primary"
                >
                  Combinar ambas (nueva versión)
                </button>
              </div>
            ) : null}
          </div>
        }
        improve={
          <ImprovePanel
            key={improvePanelNonce}
            projectId={remoteProjectId}
            activeVersionId={state.activeVersionId}
            fullDocumentText={state.editorContent}
            fragment={fragment}
            onRefreshProjectFromServer={refreshProjectFromServer}
            onApplySuggestedText={onApplySuggestedText}
            initialMessage={improveInitialMessage}
          />
        }
        knowledge={
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-cf-text">Fuentes de conocimiento</h3>
            <p className="text-xs text-cf-text-muted">
              Solo los documentos activos influyen en la IA (reescritura y búsqueda contextual).
            </p>
            <KnowledgeLibrary projectId={remoteProjectId} />
          </div>
        }
        notes={
          remoteProjectId ?
            <ChapterNotesPanel
              key={`${remoteProjectId}:${state.activeChapterId}`}
              projectId={remoteProjectId}
              chapterId={state.activeChapterId}
            />
          : <p className="text-sm text-cf-text-muted">Conecta el proyecto para guardar notas locales por capítulo.</p>
        }
      />

      <NewVariationModal
        open={variationModalOpen}
        onClose={() => setVariationModalOpen(false)}
        onSubmit={onCreateVariationSubmit}
      />

      {pendingRestore ?
        <RestoreDraftDialog
          draft={pendingRestore}
          onRestore={() => {
            const rec = pendingRestore;
            setPendingRestore(null);
            void clearDraft({
              projectId: rec.projectId,
              chapterId: rec.chapterId,
              branchId: rec.branchId,
            });
            setState((s) => {
              const ch = findChapter(s.project, s.activeChapterId);
              const stillHas =
                ch && rec ? findVersion(ch, rec.baseVersionId) : null;
              return {
                ...s,
                editorContent: rec.content,
                activeVersionId: stillHas ? rec.baseVersionId : s.activeVersionId,
              };
            });
          }}
          onDiscard={() => {
            const rec = pendingRestore;
            setPendingRestore(null);
            if (rec) {
              void clearDraft({
                projectId: rec.projectId,
                chapterId: rec.chapterId,
                branchId: rec.branchId,
              });
            }
          }}
        />
      : null}

      {showBlocks && blocks.length === 0 && state.editorContent.length > 0 ? (
        <p className="text-xs text-cf-text-muted">
          Añade un salto de línea doble para ver bloques.
        </p>
      ) : null}
    </div>
  );
}
