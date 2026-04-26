import Link from "next/link";
import { ChapterEditor } from "../_components/ChapterEditor";

export default function WritePage() {
  return (
    <div className="flex min-h-dvh min-h-0 w-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Back to workspace
        </Link>
      </header>
      <ChapterEditor />
    </div>
  );
}

