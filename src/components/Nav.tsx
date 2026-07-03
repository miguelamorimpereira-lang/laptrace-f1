import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelect } from "@/components/LanguageSelect";
import logo from "@/assets/lap-trace-f1-logo.png.asset.json";

const links = [
  { to: "/", key: "nav.overview" },
  { to: "/standings", key: "nav.standings" },
  { to: "/races", key: "nav.races" },
] as const;

export function Nav() {
  const t = useT();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logo.url}
            alt="Lap Trace F1"
            className="h-10 w-auto"
            width={60}
            height={40}
          />
          <span className="hidden font-mono text-sm font-semibold uppercase tracking-widest sm:inline">
            Lap Trace <span className="text-primary">F1</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-0.5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-3"
                activeProps={{ className: "text-foreground bg-secondary" }}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-1 flex items-center gap-1.5 border-l border-border pl-2">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
