import type { DriverStanding, ConstructorStanding } from "@/lib/jolpica";
import { constructorColor } from "@/lib/jolpica";

export function DriverStandingsTable({
  standings,
  limit,
}: {
  standings: DriverStanding[];
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Team</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((s) => (
            <tr key={s.Driver.driverId} className="transition-colors hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-muted-foreground">
                {s.position.padStart(2, "0")}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-1 rounded-full"
                    style={{ backgroundColor: constructorColor(s.Constructors[0]?.constructorId) }}
                  />
                  <span className="font-medium">
                    {s.Driver.givenName} {s.Driver.familyName}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {s.Driver.code}
                  </span>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {s.Constructors[0]?.name}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">{s.wins}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConstructorStandingsList({
  standings,
  limit,
}: {
  standings: ConstructorStanding[];
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  const max = Math.max(...standings.map((s) => Number(s.points)), 1);
  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <div
          key={s.Constructor.constructorId}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {s.position.padStart(2, "0")}
              </span>
              <span className="text-sm font-medium">{s.Constructor.name}</span>
            </div>
            <span className="font-mono text-sm font-semibold">{s.points}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(Number(s.points) / max) * 100}%`,
                backgroundColor: constructorColor(s.Constructor.constructorId),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
