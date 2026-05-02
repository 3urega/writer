type DraftStatusBadgeProps = {
  isDirty: boolean;
  className?: string;
};

/**
 * Estado visible permanente del borrador respecto a la versión activa.
 */
export function DraftStatusBadge({ isDirty, className = "" }: DraftStatusBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isDirty
          ? "border-cf-warning/40 bg-cf-warning/10 text-cf-warning"
          : "border-cf-success/30 bg-cf-success/10 text-cf-success"
      } ${className}`}
      role="status"
    >
      {isDirty ? (
        <>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cf-warning" aria-hidden />
          Cambios en el editor: pulsa <strong className="font-semibold">Guardar</strong> para
          fijarlos en el historial del libro
        </>
      ) : (
        <>
          <span className="text-cf-success" aria-hidden>
            ✓
          </span>
          Última versión del historial cargada en el editor
        </>
      )}
    </div>
  );
}
