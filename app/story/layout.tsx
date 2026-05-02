import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Narrative Mode — ChapterForge",
  description:
    "Un espacio calmado para construir tu historia, paso a paso, con tu voz al centro.",
};

export default function StoryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={[
        "nm-root",
        "min-h-dvh min-h-0 w-full flex-1 flex flex-col",
        "bg-gradient-to-b from-nm-bg-deep via-nm-bg to-nm-bg-deep",
        "text-nm-text font-sans antialiased",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
