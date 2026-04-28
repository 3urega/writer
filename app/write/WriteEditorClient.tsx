"use client";

import dynamic from "next/dynamic";

const ChapterEditor = dynamic(
  () => import("../_components/ChapterEditor").then((m) => m.ChapterEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-40 flex-1 items-center justify-center text-sm text-zinc-500">
        Cargando editor…
      </div>
    ),
  }
);

export function WriteEditorClient() {
  return <ChapterEditor />;
}
