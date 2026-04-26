"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clampSelectionRange,
  createVersionSnapshot,
  findChapter,
  findVersion,
  replaceChapter,
  saveNewVersionInChapter,
} from "@/lib/domain/versioning";
import type { Fragment, Version } from "@/lib/domain/types";
import {
  getDefaultProjectState,
  localProjectStore,
  type ProjectState,
} from "@/lib/storage/projectStore";

function formatVersionLabel(v: Version, index: number): string {
  const t = new Date(v.createdAt);
  const time = Number.isNaN(t.getTime()) ? "?" : t.toLocaleString();
  return `#${index + 1} · ${v.createdBy} · ${time}`;
}

export function ChapterEditor() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [state, setState] = useState<ProjectState>(getDefaultProjectState);
  const [fragment, setFragment] = useState<Fragment | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
    localProjectStore.save(state);
  }, [state, hydrated]);

  const activeChapter = findChapter(state.project, state.activeChapterId);
  const versions = activeChapter?.versions ?? [];

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
      editorContent: v.content,
    }));
    setFragment(null);
  };

  const onSaveVersion = () => {
    setState((s) => {
      const ch = findChapter(s.project, s.activeChapterId);
      if (!ch) return s;

      const newVersion = createVersionSnapshot({
        content: s.editorContent,
        parentVersionId: s.activeVersionId,
        createdBy: "user",
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
      };
    });
  };

  const onResetLocal = () => {
    if (
      !confirm(
        "Borrar el borrador guardado en el navegador y empezar de nuevo?"
      )
    ) {
      return;
    }
    localProjectStore.clear();
    const fresh = getDefaultProjectState();
    setState(fresh);
    setFragment(null);
  };

  if (!activeChapter) {
    return <p className="p-4 text-zinc-600">No hay capítulo activo.</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {state.project.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSaveVersion}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Guardar versión
          </button>
          <button
            type="button"
            onClick={onResetLocal}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
          >
            Reiniciar
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-0 flex-col gap-2">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
            className="min-h-[min(50vh,480px)] w-full flex-1 resize-y rounded-md border border-zinc-200 bg-white p-3 font-mono text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Escribe aquí…"
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Versiones
            </h2>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
              {versions.map((v, i) => (
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
                    {formatVersionLabel(v, i)}
                    <br />
                    <span className="line-clamp-1 font-mono text-[10px] text-zinc-500">
                      {v.content.length} caracteres
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Fragmento seleccionado
            </h2>
            {fragment == null || fragment.end <= fragment.start ? (
              <p className="text-xs text-zinc-500">Nada seleccionado</p>
            ) : (
              <div className="space-y-1 rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                <p className="font-mono text-zinc-600 dark:text-zinc-400">
                  start: {fragment.start} · end: {fragment.end} · len:{" "}
                  {fragment.text.length}
                </p>
                <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">
                  {fragment.text}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
