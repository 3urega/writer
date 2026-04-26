import Link from "next/link";
import { type ReactNode } from "react";

const linkPrimaryBase =
  "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-cf-primary px-4 py-3.5 " +
  "text-sm font-medium text-white no-underline transition-colors hover:brightness-110 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-primary " +
  "active:scale-[0.99]";

type PrimaryLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
};

/**
 * CTA con estilo de PrimaryButton, como enlace (Next.js).
 */
export function PrimaryLink({
  href,
  children,
  className = "",
  prefetch = true,
}: PrimaryLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} className={`${linkPrimaryBase} ${className}`}>
      {children}
    </Link>
  );
}
