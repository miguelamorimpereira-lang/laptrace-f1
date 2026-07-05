const FLAG_BACKGROUNDS: Record<string, string> = {
  australia:
    "linear-gradient(135deg, #012169 0 46%, #ffffff 46% 50%, #c8102e 50% 54%, #012169 54% 100%)",
  austria: "linear-gradient(to bottom, #ed2939 0 33%, #ffffff 33% 66%, #ed2939 66%)",
  azerbaijan:
    "linear-gradient(to bottom, #00b5e2 0 33%, #ef3340 33% 66%, #509e2f 66%)",
  bahrain: "linear-gradient(110deg, #ffffff 0 28%, #ce1126 28%)",
  belgium: "linear-gradient(to right, #000000 0 33%, #ffd90c 33% 66%, #ef3340 66%)",
  brazil:
    "radial-gradient(circle at 50% 50%, #002776 0 14%, transparent 15%), conic-gradient(from 45deg at 50% 50%, #ffdf00 0 25%, transparent 25% 50%, #ffdf00 50% 75%, transparent 75%), linear-gradient(#009c3b, #009c3b)",
  canada: "linear-gradient(to right, #d80621 0 25%, #ffffff 25% 75%, #d80621 75%)",
  china:
    "radial-gradient(circle at 24% 32%, #ffde00 0 7%, transparent 8%), linear-gradient(#de2910, #de2910)",
  france: "linear-gradient(to right, #0055a4 0 33%, #ffffff 33% 66%, #ef4135 66%)",
  germany: "linear-gradient(to bottom, #000000 0 33%, #dd0000 33% 66%, #ffce00 66%)",
  hungary: "linear-gradient(to bottom, #ce2939 0 33%, #ffffff 33% 66%, #477050 66%)",
  italy: "linear-gradient(to right, #009246 0 33%, #ffffff 33% 66%, #ce2b37 66%)",
  japan:
    "radial-gradient(circle at 50% 50%, #bc002d 0 20%, transparent 21%), linear-gradient(#ffffff, #ffffff)",
  mexico: "linear-gradient(to right, #006847 0 33%, #ffffff 33% 66%, #ce1126 66%)",
  monaco: "linear-gradient(to bottom, #ce1126 0 50%, #ffffff 50%)",
  netherlands: "linear-gradient(to bottom, #ae1c28 0 33%, #ffffff 33% 66%, #21468b 66%)",
  portugal: "linear-gradient(to right, #006600 0 40%, #ff0000 40%)",
  qatar: "linear-gradient(110deg, #ffffff 0 28%, #8a1538 28%)",
  "saudi arabia": "linear-gradient(#006c35, #006c35)",
  singapore: "linear-gradient(to bottom, #ef3340 0 50%, #ffffff 50%)",
  spain: "linear-gradient(to bottom, #aa151b 0 25%, #f1bf00 25% 75%, #aa151b 75%)",
  uae: "linear-gradient(to right, #ff0000 0 25%, transparent 25%), linear-gradient(to bottom, #009a44 0 33%, #ffffff 33% 66%, #000000 66%)",
  uk: "linear-gradient(90deg, transparent 42%, #ffffff 42% 58%, transparent 58%), linear-gradient(0deg, transparent 40%, #ffffff 40% 60%, transparent 60%), linear-gradient(90deg, transparent 46%, #c8102e 46% 54%, transparent 54%), linear-gradient(0deg, transparent 44%, #c8102e 44% 56%, transparent 56%), linear-gradient(#012169, #012169)",
  usa: "repeating-linear-gradient(to bottom, #b22234 0 8%, #ffffff 8% 16%)",
};

const COUNTRY_ALIASES: Record<string, string> = {
  "united kingdom": "uk",
  greatbritain: "uk",
  britain: "uk",
  "united states": "usa",
  "united states of america": "usa",
  america: "usa",
  "abu dhabi": "uae",
  "united arab emirates": "uae",
};

function normalizeCountry(country: string): string {
  const key = country.trim().toLowerCase();
  const compact = key.replace(/[^a-z]/g, "");
  return COUNTRY_ALIASES[key] ?? COUNTRY_ALIASES[compact] ?? key;
}

export function countryFlagBackground(country?: string): string | undefined {
  if (!country) return undefined;
  return FLAG_BACKGROUNDS[normalizeCountry(country)];
}