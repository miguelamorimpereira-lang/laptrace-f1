export interface ChipDriver {
  id: string;
  code: string;
  color: string;
  name?: string;
}

export function DriverChips({
  drivers,
  selected,
  onToggle,
  max,
}: {
  drivers: ChipDriver[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Optional cap; when reached, unselected chips are disabled. */
  max?: number;
}) {
  const atMax = max != null && selected.size >= max;
  return (
    <div className="flex flex-wrap gap-1.5">
      {drivers.map((d) => {
        const on = selected.has(d.id);
        const disabled = !on && atMax;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id)}
            disabled={disabled}
            title={d.name ?? d.code}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              on
                ? "border-transparent bg-secondary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: on ? d.color : "transparent",
                border: on ? "none" : `1px solid ${d.color}`,
              }}
            />
            {d.code}
          </button>
        );
      })}
    </div>
  );
}
