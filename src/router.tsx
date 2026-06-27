import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Clean, human-readable search params (e.g. ?season=2024 instead of ?season=%222024%22).
function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null) continue;
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr.replace(/^\?/, ""));
  const out: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    try {
      out[key] = JSON.parse(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    stringifySearch,
    parseSearch,
  });

  return router;
};
