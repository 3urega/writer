"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const ChapterEditor = dynamic(
  () => import("../_components/ChapterEditor").then((m) => m.ChapterEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-40 flex-1 items-center justify-center text-sm text-cf-text-muted">
        Cargando editor…
      </div>
    ),
  }
);

export function WriteEditorClient() {
  const sp = useSearchParams();
  const preferredRemoteProjectId = sp.get("project");
  return (
    <ChapterEditor
      preferredRemoteProjectId={preferredRemoteProjectId}
      key={preferredRemoteProjectId ?? "__last__"}
    />
  );
}
