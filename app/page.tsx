import { ChapterEditor } from "./_components/ChapterEditor";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <ChapterEditor />
    </div>
  );
}
