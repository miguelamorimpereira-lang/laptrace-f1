import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useT();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("control.theme")}
      title={t("control.theme")}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-primary/50"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
