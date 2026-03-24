/**
 * API routes are mounted at /auth, /workspaces, etc. on the Express server.
 * - Local dev: Vite proxies /api → http://127.0.0.1:4000 (path rewrite strips /api).
 * - Production: set VITE_API_BASE_URL to your deployed API origin (no trailing slash).
 */
export function apiUrl(resourcePath: string): string {
  const path = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (base) {
    return `${base}${path}`;
  }
  return `/api${path}`;
}
