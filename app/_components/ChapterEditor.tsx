"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { VersionDiffView } from "@/app/_components/editor/VersionDiffView";
import { splitIntoBlocks } from "@/lib/domain/blocks";
import type { Version } from "@/lib/domain/types";
import {
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
import type { Fragment } from "@/lib/domain/types";
import { narrativePairHints } from "@/lib/narrative/diffIntelligence";
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

function formatVersionLabel(v: Version, index: number, isMain: boolean): string {
  const t = new Date(v.createdAt);
  const time = Number.isNaN(t.getTime()) ? "?" : t.toLocaleString();
  return `${isMain ? "◆ " : ""}#${index + 1} · ${v.createdBy} · ${time}`;
}

const SYNC_DEBOUNCE_MS = 1500;

type ViewKey = "edit" | "diff" | "ai";

export function ChapterEditor() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [state, setState] = useState<ProjectState>(getDefaultProjectState);
  const [fragment, setFragment] = useState<Fragment | null>(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [intentName, setIntentName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [remoteProjectId, setRemoteProjectId] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastPushedRef = useRef<string>("");

  const viewMode: ViewKey = state.viewMode;

  const setViewMode = (m: ViewKey) => {
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return { ...s, viewMode: m };
      if (
        (m === "diff" || m === "ai") &&
        (s.compareVersionA == null || s.compareVersionB == null)
      ) {
        const mainId = ch.mainVersionId;
        const sorted = [...ch.versions].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const mainVer = mainId
          ? ch.versions.find((v) => v.id === mainId)
          : undefined;
        const a =
          mainVer?.id ?? sorted[0]?.id ?? s.activeVersionId;
        const b = s.activeVersionId !== a ? s.activeVersionId : sorted[1]?.id ?? a;
        return {
          ...s,
          viewMode: m,
          compareVersionA: s.compareVersionA ?? a,
          compareVersionB: s.compareVersionB ?? b,
        };
      }
      return { ...s, viewMode: m };
    });
  };

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
      let id: string | null = envId ?? storedId;

      if (id) {
        setRemoteProjectId(id);
        try {
          const p = await fetchProjectFromServer(id);
          if (cancelled) return;
          setState(projectStateFromRemoteProject(p));
          setStoredRemoteProjectId(p.id);
          setRemoteProjectId(p.id);
          lastPushedRef.current = JSON.stringify(p);
        } catch (e) {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : "Error al cargar";
          if (msg.includes("no encontr") || msg.includes("404")) {
            clearStoredRemoteProjectId();
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
              setState(local);
              lastPushedRef.current = JSON.stringify(local.project);
            } else {
              const p = await fetchProjectFromServer(newId);
              if (cancelled) return;
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
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localProjectStore.save(state);
  }, [state, hydrated]);

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
  const versions = activeChapter?.versions ?? [];
  const branches = activeChapter?.branches ?? [];
  const mainBranch = activeChapter
    ? findMainBranchForChapter(activeChapter)
    : undefined;
  const activeVersion = activeChapter
    ? findVersion(activeChapter, state.activeVersionId)
    : undefined;
  const mainVersionId = activeChapter?.mainVersionId ?? null;

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
    setState((s) => ({ ...s, editorContent: value }));
  };

  const onSelectVersion = (versionId: string) => {
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
  };

  const onSelectBranch = (branchId: string) => {
    const ch = findChapter(state.project, state.activeChapterId);
    if (!ch) return;
    const b = findBranch(ch, branchId);
    if (!b) return;
    const inBranch = ch.versions
      .filter((v) => v.branchId === branchId)
      .sort(
        (a, c) => new Date(c.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    if (inBranch) {
      setState((s) => ({
        ...s,
        activeBranchId: branchId,
        activeVersionId: inBranch.id,
        editorContent: inBranch.content,
      }));
    } else {
      setState((s) => ({ ...s, activeBranchId: branchId }));
    }
    setFragment(null);
  };

  const onSaveVersion = () => {
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const fromVer = findVersion(ch, s.activeVersionId);
      const mainBr = findMainBranchForChapter(ch);
      const bid =
        s.activeBranchId ??
        fromVer?.branchId ??
        mainBr?.id ??
        null;
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
      return {
        ...s,
        project: replaceChapter(s.project, nextChapter),
        activeVersionId: newVersionId,
        editorContent: newVersion.content,
        activeBranchId: bid,
      };
    });
  };

  const onCreateVariation = () => {
    const name = (intentName || window.prompt("Nombre de la intención (p. ej. “más oscuro”)", "Nueva intención") || "").trim();
    if (!name) return;
    setIntentName("");
    setState((s) => {
      const ch0 = findChapter(s.project, s.activeChapterId);
      if (!ch0) return s;
      const from = findVersion(ch0, s.activeVersionId);
      if (!from) return s;
      const { chapter, newVersion, newVersionId, newBranchId } =
        createIntentVariation(ch0, { intentLabel: name, fromVersion: from });
      return {
        ...s,
        project: replaceChapter(s.project, chapter),
        activeVersionId: newVersionId,
        activeBranchId: newBranchId,
        editorContent: newVersion.content,
        viewMode: "edit" as const,
      };
    });
  };

  const onSetOfficial = (versionId: string) => {
    if (!activeChapter) return;
    if (!confirm("Esta será la versión leída como “oficial” del capítulo. ¿Seguir?")) {
      return;
    }
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const next = setChapterMainVersion(ch, versionId);
      return { ...s, project: replaceChapter(s.project, next) };
    });
  };

  const textCompareA = (() => {
    if (!activeChapter || state.compareVersionA == null) return "";
    return findVersion(activeChapter, state.compareVersionA)?.content ?? "";
  })();
  const textCompareB = (() => {
    if (!activeChapter || state.compareVersionB == null) return "";
    return findVersion(activeChapter, state.compareVersionB)?.content ?? "";
  })();

  const vA = activeChapter && state.compareVersionA
    ? findVersion(activeChapter, state.compareVersionA)
    : undefined;
  const vB = activeChapter && state.compareVersionB
    ? findVersion(activeChapter, state.compareVersionB)
    : undefined;

  const hints =
    vA && vB ? narrativePairHints(vA.content, vB.content) : null;

  const onMerge = (mode: "keepA" | "keepB" | "smart") => {
    if (!vA || !vB || !activeChapter) return;
    const merged = createMergedVersion(vA, vB, mode, {});
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;
      const { chapter: next, newVersionId } = saveNewVersionInChapter(
        ch,
        merged
      );
      return {
        ...s,
        project: replaceChapter(s.project, next),
        activeVersionId: newVersionId,
        editorContent: merged.content,
        viewMode: "edit" as const,
      };
    });
  };

  const onResetLocal = () => {
    if (
      !confirm(
        "Borrar el borrador en el navegador, desvincular el id remoto y crear un proyecto nuevo en el servidor?"
      )
    ) {
      return;
    }
    localProjectStore.clear();
    clearStoredRemoteProjectId();
    setFragment(null);
    setRemoteError(null);
    setSyncError(null);
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

  if (!activeChapter) {
    return <p className="p-4 text-zinc-600">No hay capítulo activo.</p>;
  }

  const blocks = showBlocks ? splitIntoBlocks(state.editorContent) : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 pb-24 lg:pb-4">
      {remoteError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Servidor: {remoteError} (puedes seguir con el borrador local.)
        </p>
      ) : null}
      {syncError ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Sincronización: {syncError}
        </p>
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {state.project.name}
          </h1>
          <p className="text-xs text-zinc-500">
            {remoteLoading
              ? "Conectando con el servidor…"
              : remoteProjectId
                ? `Proyecto: ${remoteProjectId.slice(0, 8)}…`
                : "Sin conexión al servidor"}
            {syncing ? " · Guardando…" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewMode === "edit" ? (
            <button
              type="button"
              onClick={onSaveVersion}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Nuevo snapshot
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            disabled={!remoteProjectId || syncing}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
          >
            Sincronizar
          </button>
          <button
            type="button"
            onClick={onResetLocal}
            disabled={remoteLoading}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
          >
            Reiniciar
          </button>
        </div>
      </header>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        La versión oficial no se reescribe en el sitio: cada cambio guarda un
        <strong className="font-medium text-zinc-600 dark:text-zinc-300"> snapshot</strong> en la variante
        activa. El puntero “oficial” solo cambia con tu confirmación.
      </p>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,15rem)] lg:items-start">
        <aside className="order-1 flex flex-col gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800 lg:order-none lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Variantes
          </h2>
          <ul className="space-y-1 text-xs">
            {branches.map((b) => {
              const active = b.id === state.activeBranchId;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelectBranch(b.id)}
                    className={`w-full rounded px-2 py-1.5 text-left ${
                      active
                        ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="line-clamp-2 font-medium">{b.name}</span>
                    {b.status !== "active" ? (
                      <span className="block text-[10px] text-zinc-500">
                        {b.status}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <input
              type="text"
              value={intentName}
              onChange={(e) => setIntentName(e.target.value)}
              placeholder="Intención (p. ej. más tensión)"
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={onCreateVariation}
              className="w-full rounded-md border border-dashed border-zinc-400 px-2 py-1.5 text-xs text-zinc-700 dark:border-zinc-500 dark:text-zinc-200"
            >
              Crear variante desde la versión activa
            </button>
          </div>
        </aside>

        <div className="order-2 flex min-h-0 flex-col gap-3">
          <div className="hidden items-center justify-between gap-2 lg:flex">
            <div className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
              {(
                [
                  ["edit", "Escribir"],
                  ["diff", "Comparar"],
                  ["ai", "Ideas + fusión"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setViewMode(k)}
                  className={`rounded px-3 py-1.5 text-sm ${
                    viewMode === k
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {viewMode === "edit" ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={showBlocks}
                  onChange={(e) => setShowBlocks(e.target.checked)}
                />
                Vista por bloques
              </label>
            ) : null}
          </div>

          {viewMode === "edit" ? (
            <div className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-2 lg:hidden">
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Texto
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={showBlocks}
                    onChange={(e) => setShowBlocks(e.target.checked)}
                  />
                  Bloques
                </label>
              </div>
              <label className="hidden text-sm font-medium text-zinc-600 dark:text-zinc-400 lg:block">
                Texto
              </label>
              <textarea
                ref={textareaRef}
                value={state.editorContent}
                onChange={(e) => onChangeContent(e.target.value)}
                onSelect={readSelection}
                onMouseUp={readSelection}
                onKeyUp={readSelection}
                spellCheck
                className="min-h-[min(45vh,420px)] w-full flex-1 resize-y rounded-md border border-zinc-200 bg-white p-3 font-mono text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Escribe aquí…"
              />
            </div>
          ) : null}

          {viewMode === "diff" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2 text-xs">
                <div>
                  <span className="mb-0.5 block text-zinc-500">A (referencia)</span>
                  <select
                    value={state.compareVersionA ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        compareVersionA: e.target.value || null,
                      }))
                    }
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {versions.map((v) => {
                      const isMain = v.id === mainVersionId;
                      return (
                        <option key={v.id} value={v.id}>
                          {isMain ? "◆ " : ""}
                          {v.id.slice(0, 6)}…
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <span className="mb-0.5 block text-zinc-500">B (variante)</span>
                  <select
                    value={state.compareVersionB ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        compareVersionB: e.target.value || null,
                      }))
                    }
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {versions.map((v) => {
                      const isMain = v.id === mainVersionId;
                      return (
                        <option key={v.id} value={v.id}>
                          {isMain ? "◆ " : ""}
                          {v.id.slice(0, 6)}…
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              {state.compareVersionA && state.compareVersionB ? (
                <VersionDiffView
                  labelA="Texto A"
                  labelB="Texto B"
                  textA={textCompareA}
                  textB={textCompareB}
                />
              ) : null}
            </div>
          ) : null}

          {viewMode === "ai" ? (
            <div className="space-y-4 rounded-lg border border-violet-200/80 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                El par de versiones A y B (abajo) alimenta las pistas y la fusión;
                siempre se crea un <strong>snapshot</strong> nuevo, sin sustituir
                el historial.
              </p>
              <div className="flex flex-wrap items-end gap-2 text-xs">
                <div>
                  <span className="mb-0.5 block text-zinc-500">A (referencia)</span>
                  <select
                    value={state.compareVersionA ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        compareVersionA: e.target.value || null,
                      }))
                    }
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 dark:border-violet-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {versions.map((v) => {
                      const isMain = v.id === mainVersionId;
                      return (
                        <option key={v.id} value={v.id}>
                          {isMain ? "◆ " : ""}
                          {v.id.slice(0, 6)}…
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <span className="mb-0.5 block text-zinc-500">B (variante)</span>
                  <select
                    value={state.compareVersionB ?? ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        compareVersionB: e.target.value || null,
                      }))
                    }
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900 dark:border-violet-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {versions.map((v) => {
                      const isMain = v.id === mainVersionId;
                      return (
                        <option key={v.id} value={v.id}>
                          {isMain ? "◆ " : ""}
                          {v.id.slice(0, 6)}…
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              {hints ? (
                <ul className="list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                  {hints.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Selecciona un par de versiones en Comparar.</p>
              )}
              {vA && vB ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => onMerge("keepA")}
                    className="rounded-md bg-emerald-800 px-3 py-2 text-sm text-white"
                  >
                    Llevar A al siguiente snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => onMerge("keepB")}
                    className="rounded-md bg-rose-800 px-3 py-2 text-sm text-white"
                  >
                    Llevar B al siguiente snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => onMerge("smart")}
                    className="rounded-md border border-violet-500 px-3 py-2 text-sm text-violet-900 dark:text-violet-200"
                  >
                    Fusión compuesta (nuevo snapshot)
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {viewMode === "edit" && showBlocks && blocks.length > 0 ? (
            <div>
              <h3 className="mb-1 text-xs font-medium text-zinc-500">
                Bloques (separación por línea en blanco)
              </h3>
              <ol className="max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300">
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="rounded border border-zinc-200 p-1 dark:border-zinc-800"
                  >
                    <span className="text-[10px] text-zinc-400">
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

        <aside className="order-3 flex flex-col gap-4 max-lg:order-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Snapshots
            </h2>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
              {versions.map((v, i) => {
                const isMain = v.id === mainVersionId;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => onSelectVersion(v.id)}
                      className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                        v.id === state.activeVersionId
                          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      {formatVersionLabel(v, i, isMain)}
                      {v.id === state.activeVersionId && !isMain ? (
                        <span className="ml-1 text-[10px] text-amber-700">
                          (editando)
                        </span>
                      ) : null}
                      <br />
                      <span className="line-clamp-1 font-mono text-[10px] text-zinc-500">
                        {v.content.length} caracteres
                      </span>
                      {isMain ? (
                        <span className="mt-0.5 block text-[10px] text-emerald-600">
                          Versión oficial
                        </span>
                      ) : null}
                    </button>
                    {!isMain ? (
                      <button
                        type="button"
                        onClick={() => onSetOfficial(v.id)}
                        className="mt-0.5 w-full rounded border border-zinc-200 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800/60"
                      >
                        Hacer oficial esta versión
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {viewMode === "edit" ? (
            <div>
              <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Fragmento seleccionado
              </h2>
              {fragment == null || fragment.end <= fragment.start ? (
                <p className="text-xs text-zinc-500">Nada seleccionado</p>
              ) : (
                <div className="space-y-1 rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                  <p className="font-mono text-zinc-600 dark:text-zinc-400">
                    inicio: {fragment.start} · fin: {fragment.end} · len:{" "}
                    {fragment.text.length}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">
                    {fragment.text}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      {viewMode === "edit" && showBlocks && blocks.length === 0 && state.editorContent.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Añade un salto de doble línea en el texto para ver bloques.
        </p>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-zinc-200 bg-zinc-50/95 p-1 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
        {(
          [
            ["edit", "Escribir"],
            ["diff", "Comparar"],
            ["ai", "Ideas"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setViewMode(k)}
            className={`flex-1 rounded py-2 text-sm font-medium ${
              viewMode === k
                ? "bg-zinc-900 text-white"
                : "text-zinc-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
