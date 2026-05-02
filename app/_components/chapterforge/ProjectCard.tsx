import Link from "next/link";
import { Card } from "./Card";
import type { ProjectSummary } from "@/lib/chapterforge/types";

type ProjectCardProps = {
  project: ProjectSummary;
  href: string;
};

export function ProjectCard({ project, href }: ProjectCardProps) {
  const percent = Math.round(project.progress * 100);
  return (
    <Link
      href={href}
      className="block min-h-11 w-full min-w-0 text-left no-underline"
    >
      <Card
        as="article"
        className="p-4 transition-colors hover:border-cf-primary/30 hover:bg-cf-surface-hover md:p-5 lg:p-5"
      >
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <h3 className="truncate text-sm font-medium text-cf-text md:text-base">
            {project.name}
          </h3>
          <span className="shrink-0 text-xs text-cf-text-muted md:text-sm">
            {project.lastEdited}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-cf-text-muted md:mt-2 md:text-sm">
          {project.chapterCount}{" "}
          {project.chapterCount === 1 ? "capítulo" : "capítulos"}
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-cf-bg md:mt-4 md:h-2"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-cf-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-cf-text-muted md:mt-2 md:text-sm">
          {percent}% con texto en versión principal
        </p>
      </Card>
    </Link>
  );
}
