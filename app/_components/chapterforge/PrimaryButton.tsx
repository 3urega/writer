"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  loading?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  className?: string;
};

export function PrimaryButton({
  children,
  loading = false,
  disabled,
  className = "",
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <button
      type="button"
      className={[
        "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-cf-primary px-4 py-3.5",
        "text-sm font-medium text-white transition-colors",
        "hover:enabled:brightness-110",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:enabled:scale-[0.99]",
        className,
      ].join(" ")}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
