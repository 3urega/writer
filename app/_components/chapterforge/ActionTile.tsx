import Link from "next/link";
import { type ReactNode } from "react";
import { Card } from "./Card";

type ActionTileProps = {
  href: string;
  label: string;
  description?: string;
  icon: ReactNode;
};

export function ActionTile({ href, label, description, icon }: ActionTileProps) {
  return (
    <Link
      href={href}
      className="min-h-11 w-full no-underline"
    >
      <Card className="flex h-full min-h-[88px] flex-col items-start justify-between gap-2 p-4 transition-colors hover:border-cf-primary/30 hover:bg-cf-surface-hover md:min-h-[100px] md:gap-3 md:p-5 lg:min-h-[112px] lg:gap-3 lg:px-5 lg:py-6">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-cf-primary md:size-10 lg:size-10"
          style={{ background: "var(--cf-primary-soft)" }}
          aria-hidden
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-cf-text md:text-base">{label}</p>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-cf-text-muted md:line-clamp-3 md:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
