"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { NarrativeWorkspace } from "@/app/story/_components/NarrativeWorkspace";
import type { NarrativeBootstrap } from "@/lib/story/narrativeBootstrap";
import { loadNarrativeBootstrap } from "@/lib/story/narrativeBootstrap";

export default function StoryIdPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [bootstrap, setBootstrap] = useState<NarrativeBootstrap | null>(null);

  useEffect(() => {
    if (!id) return;
    setBootstrap(loadNarrativeBootstrap(id));
  }, [id]);

  if (!id) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-nm-text-muted">
        Historia no encontrada.
      </div>
    );
  }

  return <NarrativeWorkspace projectId={id} bootstrap={bootstrap} />;
}
