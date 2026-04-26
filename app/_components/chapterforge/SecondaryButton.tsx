"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type SecondaryButtonProps = {
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  className?: string;
};

export function SecondaryButton({
  children,
  className = "",
  ...rest
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex w-full min-h-11 items-center justify-center rounded-xl border border-cf-border",
        "bg-transparent px-4 py-3.5 text-sm font-medium text-cf-text",
        "hover:bg-cf-surface-hover",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-border",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:enabled:scale-[0.99]",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
