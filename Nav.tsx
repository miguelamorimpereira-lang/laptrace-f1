import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Overview" },
  { to: "/standings", label: "Standings" },
  { to: "/races", label: "Races" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="LapTrace F1 logo" className="h-8 w-auto" />
          <span className="font-mono text-sm font-semibold uppercase tracking-widest">
            LapTrace <span className="text-primary">F1</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
