"use client";

import { useState } from "react";

import {
  loadChapterNote,
  saveChapterNote,
} from "@/lib/storage/notesStore";

type ChapterNotesPanelProps = {
  projectId: string;
  chapterId: string;
};

export function ChapterNotesPanel({ projectId, chapterId }: ChapterNotesPanelProps) {
  const [text, setText] = useState(() => loadChapterNote(projectId, chapterId));

  return (
    <div className="space-y-2">
      <p className="text-xs text-cf-text-muted">
        Notas personales del capítulo. Solo en este navegador; no se sincronizan con el servidor.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => saveChapterNote(projectId, chapterId, text)}
        rows={14}
        placeholder="Ideas, TODOs, referencias…"
        className="w-full rounded-lg border border-cf-border bg-cf-bg px-3 py-2 text-sm text-cf-text"
      />
    </div>
  );
}
