import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "pt" | "sv" | "fr" | "es" | "de";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

export const LOCALES: Record<Lang, string> = {
  en: "en-GB",
  pt: "pt-PT",
  sv: "sv-SE",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
};

type Dict = Record<string, string>;

const en: Dict = {
  "nav.overview": "Overview",
  "nav.standings": "Standings",
  "nav.races": "Races",

  "home.eyebrow": "{season} Formula 1 World Championship",
  "home.title": "F1 news, the calendar, and every lap — visualized.",
  "home.subtitle":
    "Catch the latest headlines, then pick a Grand Prix to explore race and qualifying results, lap-time analysis and in-car telemetry.",

  "stat.leader": "Championship Leader",
  "stat.top_constructor": "Top Constructor",
  "stat.rounds": "Rounds",
  "stat.this_season": "this season",
  "stat.next_race": "Next Race",
  "stat.final_round": "Final Round",
  "unit.pts": "pts",

  "section.race_calendar": "Race Calendar",
  "section.latest_news": "Latest F1 News",
  "section.standings": "Standings",
  "section.full_calendar": "Full calendar →",
  "section.full_table": "Full table →",
  "news.via": "via Autosport",
  "news.loading": "Loading news…",
  "news.unavailable":
    "F1 news is temporarily unavailable. Please check back shortly.",
  "news.top_story": "Top Story",

  "race.round": "Round {n}",
  "race.finished": "Finished",
  "race.upcoming": "Upcoming",

  "races.title": "Race Calendar",
  "standings.title": "Championship Standings",
  "standings.drivers": "Drivers",
  "standings.constructors": "Constructors",

  "gp.back": "← {season} Calendar",
  "tab.race": "Race",
  "tab.qualifying": "Qualifying",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Sprint Qualifying",

  "time.just_now": "just now",
  "time.m_ago": "{n}m ago",
  "time.h_ago": "{n}h ago",
  "time.d_ago": "{n}d ago",

  "control.theme": "Toggle theme",
  "control.language": "Language",
  "common.season": "Season",
};

const pt: Dict = {
  "nav.overview": "Visão geral",
  "nav.standings": "Classificação",
  "nav.races": "Corridas",

  "home.eyebrow": "Campeonato Mundial de Fórmula 1 de {season}",
  "home.title": "Notícias de F1, o calendário e cada volta — visualizados.",
  "home.subtitle":
    "Acompanhe as últimas notícias e depois escolha um Grande Prémio para explorar resultados de corrida e qualificação, análise de tempos por volta e telemetria de bordo.",

  "stat.leader": "Líder do Campeonato",
  "stat.top_constructor": "Melhor Construtor",
  "stat.rounds": "Rondas",
  "stat.this_season": "esta temporada",
  "stat.next_race": "Próxima Corrida",
  "stat.final_round": "Última Ronda",
  "unit.pts": "pts",

  "section.race_calendar": "Calendário de Corridas",
  "section.latest_news": "Últimas Notícias de F1",
  "section.standings": "Classificação",
  "section.full_calendar": "Calendário completo →",
  "section.full_table": "Tabela completa →",
  "news.via": "via Autosport",
  "news.loading": "A carregar notícias…",
  "news.unavailable":
    "As notícias de F1 estão temporariamente indisponíveis. Volte em breve.",
  "news.top_story": "Destaque",

  "race.round": "Ronda {n}",
  "race.finished": "Concluída",
  "race.upcoming": "Por disputar",

  "races.title": "Calendário de Corridas",
  "standings.title": "Classificação do Campeonato",
  "standings.drivers": "Pilotos",
  "standings.constructors": "Construtores",

  "gp.back": "← Calendário {season}",
  "tab.race": "Corrida",
  "tab.qualifying": "Qualificação",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Qualificação Sprint",

  "time.just_now": "agora mesmo",
  "time.m_ago": "há {n}m",
  "time.h_ago": "há {n}h",
  "time.d_ago": "há {n}d",

  "control.theme": "Alternar tema",
  "control.language": "Idioma",
  "common.season": "Temporada",
};

const sv: Dict = {
  "nav.overview": "Översikt",
  "nav.standings": "Ställning",
  "nav.races": "Lopp",

  "home.eyebrow": "Formel 1-VM {season}",
  "home.title": "F1-nyheter, kalendern och varje varv — visualiserat.",
  "home.subtitle":
    "Håll koll på de senaste rubrikerna och välj sedan ett Grand Prix för att utforska lopp- och kvalresultat, varvtidsanalys och telemetri från bilen.",

  "stat.leader": "Mästerskapsledare",
  "stat.top_constructor": "Bästa stall",
  "stat.rounds": "Deltävlingar",
  "stat.this_season": "denna säsong",
  "stat.next_race": "Nästa lopp",
  "stat.final_round": "Sista deltävlingen",
  "unit.pts": "p",

  "section.race_calendar": "Tävlingskalender",
  "section.latest_news": "Senaste F1-nyheterna",
  "section.standings": "Ställning",
  "section.full_calendar": "Hela kalendern →",
  "section.full_table": "Hela tabellen →",
  "news.via": "via Autosport",
  "news.loading": "Laddar nyheter…",
  "news.unavailable":
    "F1-nyheter är tillfälligt otillgängliga. Kom tillbaka snart.",
  "news.top_story": "Toppnyhet",

  "race.round": "Deltävling {n}",
  "race.finished": "Avslutat",
  "race.upcoming": "Kommande",

  "races.title": "Tävlingskalender",
  "standings.title": "Mästerskapsställning",
  "standings.drivers": "Förare",
  "standings.constructors": "Stall",

  "gp.back": "← {season} Kalender",
  "tab.race": "Lopp",
  "tab.qualifying": "Kval",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Sprintkval",

  "time.just_now": "just nu",
  "time.m_ago": "{n} min sedan",
  "time.h_ago": "{n} tim sedan",
  "time.d_ago": "{n} dgr sedan",

  "control.theme": "Växla tema",
  "control.language": "Språk",
  "common.season": "Säsong",
};

const fr: Dict = {
  "nav.overview": "Aperçu",
  "nav.standings": "Classement",
  "nav.races": "Courses",

  "home.eyebrow": "Championnat du Monde de Formule 1 {season}",
  "home.title": "L'actu F1, le calendrier et chaque tour — en images.",
  "home.subtitle":
    "Suivez les dernières actualités, puis choisissez un Grand Prix pour explorer les résultats de course et de qualification, l'analyse des temps au tour et la télémétrie embarquée.",

  "stat.leader": "Leader du championnat",
  "stat.top_constructor": "Meilleure écurie",
  "stat.rounds": "Manches",
  "stat.this_season": "cette saison",
  "stat.next_race": "Prochaine course",
  "stat.final_round": "Dernière manche",
  "unit.pts": "pts",

  "section.race_calendar": "Calendrier des courses",
  "section.latest_news": "Dernières actualités F1",
  "section.standings": "Classement",
  "section.full_calendar": "Calendrier complet →",
  "section.full_table": "Tableau complet →",
  "news.via": "via Autosport",
  "news.loading": "Chargement des actualités…",
  "news.unavailable":
    "Les actualités F1 sont momentanément indisponibles. Revenez bientôt.",
  "news.top_story": "À la une",

  "race.round": "Manche {n}",
  "race.finished": "Terminée",
  "race.upcoming": "À venir",

  "races.title": "Calendrier des courses",
  "standings.title": "Classement du championnat",
  "standings.drivers": "Pilotes",
  "standings.constructors": "Écuries",

  "gp.back": "← Calendrier {season}",
  "tab.race": "Course",
  "tab.qualifying": "Qualifications",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Qualifications Sprint",

  "time.just_now": "à l'instant",
  "time.m_ago": "il y a {n} min",
  "time.h_ago": "il y a {n} h",
  "time.d_ago": "il y a {n} j",

  "control.theme": "Changer de thème",
  "control.language": "Langue",
  "common.season": "Saison",
};

const es: Dict = {
  "nav.overview": "Resumen",
  "nav.standings": "Clasificación",
  "nav.races": "Carreras",

  "home.eyebrow": "Campeonato Mundial de Fórmula 1 {season}",
  "home.title": "Noticias de F1, el calendario y cada vuelta — visualizados.",
  "home.subtitle":
    "Sigue los últimos titulares y luego elige un Gran Premio para explorar resultados de carrera y clasificación, análisis de tiempos por vuelta y telemetría de a bordo.",

  "stat.leader": "Líder del campeonato",
  "stat.top_constructor": "Mejor escudería",
  "stat.rounds": "Rondas",
  "stat.this_season": "esta temporada",
  "stat.next_race": "Próxima carrera",
  "stat.final_round": "Última ronda",
  "unit.pts": "pts",

  "section.race_calendar": "Calendario de carreras",
  "section.latest_news": "Últimas noticias de F1",
  "section.standings": "Clasificación",
  "section.full_calendar": "Calendario completo →",
  "section.full_table": "Tabla completa →",
  "news.via": "vía Autosport",
  "news.loading": "Cargando noticias…",
  "news.unavailable":
    "Las noticias de F1 no están disponibles por ahora. Vuelve pronto.",
  "news.top_story": "Destacado",

  "race.round": "Ronda {n}",
  "race.finished": "Finalizada",
  "race.upcoming": "Próxima",

  "races.title": "Calendario de carreras",
  "standings.title": "Clasificación del campeonato",
  "standings.drivers": "Pilotos",
  "standings.constructors": "Escuderías",

  "gp.back": "← Calendario {season}",
  "tab.race": "Carrera",
  "tab.qualifying": "Clasificación",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Clasificación Sprint",

  "time.just_now": "ahora mismo",
  "time.m_ago": "hace {n} min",
  "time.h_ago": "hace {n} h",
  "time.d_ago": "hace {n} d",

  "control.theme": "Cambiar tema",
  "control.language": "Idioma",
  "common.season": "Temporada",
};

const de: Dict = {
  "nav.overview": "Übersicht",
  "nav.standings": "Wertung",
  "nav.races": "Rennen",

  "home.eyebrow": "Formel-1-Weltmeisterschaft {season}",
  "home.title": "F1-News, der Kalender und jede Runde — visualisiert.",
  "home.subtitle":
    "Verfolgen Sie die aktuellen Schlagzeilen und wählen Sie dann einen Grand Prix, um Rennen- und Qualifyingergebnisse, Rundenzeitanalysen und Bord-Telemetrie zu erkunden.",

  "stat.leader": "WM-Führender",
  "stat.top_constructor": "Bestes Team",
  "stat.rounds": "Rennen",
  "stat.this_season": "diese Saison",
  "stat.next_race": "Nächstes Rennen",
  "stat.final_round": "Letztes Rennen",
  "unit.pts": "Pkt",

  "section.race_calendar": "Rennkalender",
  "section.latest_news": "Aktuelle F1-News",
  "section.standings": "Wertung",
  "section.full_calendar": "Ganzer Kalender →",
  "section.full_table": "Ganze Tabelle →",
  "news.via": "via Autosport",
  "news.loading": "News werden geladen…",
  "news.unavailable":
    "F1-News sind vorübergehend nicht verfügbar. Bitte später erneut versuchen.",
  "news.top_story": "Topmeldung",

  "race.round": "Rennen {n}",
  "race.finished": "Beendet",
  "race.upcoming": "Anstehend",

  "races.title": "Rennkalender",
  "standings.title": "Meisterschaftswertung",
  "standings.drivers": "Fahrer",
  "standings.constructors": "Teams",

  "gp.back": "← Kalender {season}",
  "tab.race": "Rennen",
  "tab.qualifying": "Qualifying",
  "tab.sprint": "Sprint",
  "tab.sprint-qualifying": "Sprint-Qualifying",

  "time.just_now": "gerade eben",
  "time.m_ago": "vor {n} Min.",
  "time.h_ago": "vor {n} Std.",
  "time.d_ago": "vor {n} T.",

  "control.theme": "Design wechseln",
  "control.language": "Sprache",
  "common.season": "Saison",
};

const DICTS: Record<Lang, Dict> = { en, pt, sv, fr, es, de };

const STORAGE_KEY = "laptrace-lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && stored in DICTS) return stored as Lang;
  const nav = window.navigator.language?.slice(0, 2).toLowerCase();
  if (nav && nav in DICTS) return nav as Lang;
  return "en";
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translator;
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with "en" on both server and first client render to avoid hydration
  // mismatch, then correct to the stored/browser language after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  };

  const t: Translator = (key, vars) => {
    const dict = DICTS[lang] ?? en;
    let str = dict[key] ?? en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, locale: LOCALES[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}

export function useT(): Translator {
  return useI18n().t;
}
