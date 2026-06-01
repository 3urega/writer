import type { Version } from "@/lib/domain/types";

type VersionTimelineProps = {
  versions: Version[];
  activeVersionId: string;
  mainVersionId: string | null | undefined;
  onSelectVersion: (versionId: string) => void;
  onSetOfficial: (versionId: string) => void;
  formatVersionLabel: (v: Version, index: number, isMain: boolean) => string;
};

export function VersionTimeline({
  versions,
  activeVersionId,
  mainVersionId,
  onSelectVersion,
  onSetOfficial,
  formatVersionLabel,
}: VersionTimelineProps) {
  const sorted = [...versions].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      <ul className="space-y-2">
        {sorted.map((v, i) => {
          const isMain = v.id === mainVersionId;
          const active = v.id === activeVersionId;
          return (
            <li key={v.id} className="rounded-lg border border-cf-border bg-cf-bg/50 p-2">
              <button
                type="button"
                onClick={() => onSelectVersion(v.id)}
                className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "bg-cf-primary-soft text-cf-text"
                    : "text-cf-text-muted hover:bg-cf-surface-hover"
                }`}
              >
                {formatVersionLabel(v, i, isMain)}
                {active && !isMain ? (
                  <span className="ml-1 text-[10px] text-cf-warning">(editando)</span>
                ) : null}
                <span className="mt-1 block text-[10px] text-cf-text-muted">
                  {v.content.length.toLocaleString("es-ES")} caracteres ·{" "}
                  {v.createdBy === "agent" ? "IA" : "Autor"}
                </span>
                {isMain ? (
                  <span className="mt-1 block text-[10px] font-medium text-cf-success">
                    Versión oficial
                  </span>
                ) : null}
              </button>
              {!isMain ? (
                <button
                  type="button"
                  onClick={() => onSetOfficial(v.id)}
                  className="mt-1 w-full rounded border border-cf-border py-1 text-[10px] text-cf-text-muted hover:bg-cf-surface-hover"
                >
                  Marcar como versión oficial
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
