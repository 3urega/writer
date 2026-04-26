import Link from "next/link";
import { recentProjects } from "@/lib/chapterforge/demo-data";
import { ActionTile } from "./ActionTile";
import { PrimaryLink } from "./PrimaryLink";
import { ProjectCard } from "./ProjectCard";
import { IconFileUp, IconLayers, IconPencil, IconSparkle } from "./icons";

const WRITE_HREF = "/write";

const philosophy = [
  "Your draft evolves in versions — nothing is lost.",
  "The writing assistant refines, it does not replace you.",
  "Structure comes from iteration.",
];

export function WorkspaceHome() {
  const hasProjects = recentProjects.length > 0;
  const mainCta = hasProjects ? "Continue Writing" : "Create New Book";

  return (
    <div
      className={[
        "mx-auto w-full max-w-md flex-1",
        "px-5 pt-4 pb-10",
        "sm:px-6 sm:pt-5 sm:pb-12",
        "md:max-w-2xl md:px-8 md:pt-6 md:pb-14",
        "lg:max-w-4xl lg:px-10 lg:pt-8 lg:pb-16",
        "xl:max-w-5xl xl:px-12",
        "2xl:max-w-6xl",
      ].join(" ")}
    >
      <header
        className={[
          "py-5 text-center sm:py-6 sm:text-left",
          "md:py-7 lg:py-0 lg:pb-8",
        ].join(" ")}
      >
        <h1
          className={[
            "text-2xl font-semibold tracking-tight text-cf-text",
            "md:text-3xl md:tracking-tight",
            "lg:text-4xl",
          ].join(" ")}
        >
          ChapterForge
        </h1>
        <p
          className={[
            "mt-1.5 text-sm text-cf-text-muted",
            "md:mt-2 md:text-base",
            "lg:text-base lg:text-cf-text-muted/90",
          ].join(" ")}
        >
          Write. Iterate. Evolve.
        </p>
      </header>

      <div
        className={[
          "mt-2 space-y-6",
          "md:mt-0 md:space-y-8",
          "lg:space-y-10",
        ].join(" ")}
      >
        <div
          className={[
            "grid grid-cols-1 gap-6",
            "md:gap-8",
            "lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12",
          ].join(" ")}
        >
          <section
            className={[
              "order-1 rounded-2xl border border-cf-border bg-cf-primary-soft",
              "px-4 py-5",
              "md:px-6 md:py-6",
              "lg:px-7 lg:py-7",
            ].join(" ")}
            aria-labelledby="workspace-focus"
          >
            <h2 id="workspace-focus" className="sr-only">
              Start writing
            </h2>
            <p
              className={[
                "mb-4 text-sm leading-relaxed text-cf-text",
                "md:mb-5 md:text-base md:leading-7",
                "lg:mb-6 lg:text-base lg:leading-8",
              ].join(" ")}
            >
              {hasProjects
                ? "Resume where you left off. The text stays under your control, version by version."
                : "Start your first book. Your ideas deserve structure."}
            </p>
            <div
              className={["flex flex-col gap-3", "md:gap-4", "lg:max-w-md"].join(" ")}
            >
              <PrimaryLink
                href={WRITE_HREF}
                className="!py-3.5 text-base font-medium md:!py-4 md:text-base lg:text-base"
              >
                {mainCta}
              </PrimaryLink>
              {hasProjects ? (
                <Link
                  href={WRITE_HREF}
                  className={[
                    "min-h-11 w-full text-center text-sm",
                    "text-cf-text-muted decoration-cf-border underline decoration-1",
                    "underline-offset-4 hover:text-cf-text",
                    "md:min-h-0 md:py-0.5",
                  ].join(" ")}
                >
                  Create New Book
                </Link>
              ) : null}
            </div>
          </section>

          <section className="order-2 min-w-0 px-0 py-0">
            <h2
              className={[
                "text-lg font-medium text-cf-text",
                "md:text-lg md:font-medium",
                "lg:text-xl",
              ].join(" ")}
            >
              Recent projects
            </h2>
            {!hasProjects ? (
              <p
                className={[
                  "mt-2 text-sm text-cf-text-muted",
                  "md:mt-2.5 md:text-base md:leading-6",
                ].join(" ")}
              >
                No open books yet. One focused workspace will appear here.
              </p>
            ) : null}
            {hasProjects ? (
              <ul
                className={[
                  "mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto overscroll-contain",
                  "md:mt-4 md:max-h-80 md:gap-3.5",
                  "lg:max-h-[22rem] lg:gap-4",
                  "xl:max-h-96",
                ].join(" ")}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <ProjectCard project={p} href={WRITE_HREF} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        <section className="order-3 px-0">
          <h2
            className={[
              "text-lg font-medium text-cf-text",
              "md:mb-0.5 md:text-lg",
              "lg:mb-1 lg:text-xl",
            ].join(" ")}
          >
            Quick actions
          </h2>
          <div
            className={[
              "mt-3 grid grid-cols-2 gap-3",
              "md:mt-4 md:gap-4",
              "lg:mt-4 lg:grid-cols-4 lg:gap-4 xl:gap-5",
            ].join(" ")}
          >
            <ActionTile
              href={WRITE_HREF}
              label="New Chapter"
              description="Add to your manuscript"
              icon={<IconPencil />}
            />
            <ActionTile
              href={WRITE_HREF}
              label="Import PDF"
              description="Knowledge base (RAG)"
              icon={<IconFileUp />}
            />
            <ActionTile
              href={WRITE_HREF}
              label="View Versions"
              description="History of snapshots"
              icon={<IconLayers />}
            />
            <ActionTile
              href={WRITE_HREF}
              label="Writing Assistant"
              description="Refine a selection"
              icon={<IconSparkle />}
            />
          </div>
        </section>

        <section
          className={[
            "order-4 rounded-2xl border border-dashed border-cf-border",
            "px-4 py-4",
            "md:px-6 md:py-5",
            "lg:px-7 lg:py-6",
          ].join(" ")}
          aria-label="Principles"
        >
          <ul
            className={[
              "space-y-2 text-xs leading-relaxed text-cf-text-muted",
              "md:space-y-2.5 md:text-sm md:leading-6",
              "lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:text-sm",
            ].join(" ")}
          >
            {philosophy.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-balance md:items-start md:gap-2"
              >
                <span
                  className="mt-0.5 shrink-0 text-cf-success"
                  aria-hidden
                >
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer
        className={[
          "mt-8 flex flex-wrap items-center justify-center gap-4",
          "border-t border-cf-border py-4",
          "md:mt-10 md:gap-6 md:py-5",
          "lg:mt-12 lg:justify-end lg:gap-8 lg:py-6",
        ].join(" ")}
      >
        <Link
          href="/settings"
          className="min-h-11 min-w-[44px] py-2.5 text-sm text-cf-text-muted transition-colors hover:text-cf-text"
        >
          Settings
        </Link>
        <span className="text-cf-border" aria-hidden>
          |
        </span>
        <Link
          href="/agent"
          className="min-h-11 min-w-[44px] py-2.5 text-sm text-cf-text-muted transition-colors hover:text-cf-text"
        >
          Agent profile
        </Link>
      </footer>
    </div>
  );
}
