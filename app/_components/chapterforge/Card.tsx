import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
};

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={[
        "rounded-2xl border border-cf-border bg-cf-surface p-4",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
