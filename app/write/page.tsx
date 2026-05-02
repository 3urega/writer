import Link from "next/link";
import { Suspense } from "react";

import { WriteEditorClient } from "./WriteEditorClient";

export default function WritePage() {
  return (
    <div className="flex min-h-dvh min-h-0 w-full flex-1 flex-col bg-cf-bg text-cf-text">
      <header className="shrink-0 border-b border-cf-border px-4 py-2">
        <Link
          href="/"
          className="text-sm text-cf-text-muted hover:text-cf-primary"
        >
          Volver al espacio de trabajo
        </Link>
      </header>
      <Suspense
        fallback={
          <div className="flex min-h-40 flex-1 items-center justify-center text-sm text-cf-text-muted">
            Cargando editor…
          </div>
        }
      >
        <WriteEditorClient />
      </Suspense>
    </div>
  );
}
