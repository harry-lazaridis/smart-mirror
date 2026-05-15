const rawBase = (import.meta.env.VITE_API_BASE_URL || "").trim();

export function getApiOrigin() {
  if (!rawBase) return "";

  const isLocalhostBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawBase);
  const runningOnLocalhost =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

  if (isLocalhostBase && !runningOnLocalhost) return "";
  if (rawBase === "/api") return "";

  return rawBase.replace(/\/$/, "");
}

export function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiOrigin()}${cleanPath}`;
}
