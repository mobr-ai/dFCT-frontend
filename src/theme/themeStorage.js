import { DEFAULT_THEME_ID, isValidThemeId } from "./themes";

export const THEME_STORAGE_KEY = "dfct.theme";

const PUBLIC_THEME_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/signup_disabled",
];

function hasAuthenticatedUser() {
  try {
    if (typeof window === "undefined") return false;
    const rawUser = window.localStorage.getItem("userData");
    if (!rawUser || rawUser === "null") return false;
    const user = JSON.parse(rawUser);
    return Boolean(user?.id || user?.access_token);
  } catch {
    return false;
  }
}

function isPublicThemeRoute(pathname = "") {
  if (pathname === "/" && !hasAuthenticatedUser()) return true;
  return PUBLIC_THEME_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getCurrentPathname() {
  if (typeof window === "undefined") return "";
  return window.location?.pathname || "";
}

function applyThemeToDocument(themeId) {
  if (typeof document === "undefined") return;

  if (isPublicThemeRoute(getCurrentPathname())) {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-workspace-theme");
    return;
  }

  document.documentElement.setAttribute("data-theme", themeId);
  document.documentElement.setAttribute("data-workspace-theme", themeId);
}

export function getStoredTheme() {
  try {
    if (typeof window === "undefined") return DEFAULT_THEME_ID;

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidThemeId(storedTheme) ? storedTheme : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function applyTheme(themeId) {
  const safeThemeId = isValidThemeId(themeId) ? themeId : DEFAULT_THEME_ID;

  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, safeThemeId);
    }
  } catch {
    // Ignore storage errors. Theme still applies for the current session.
  }

  applyThemeToDocument(safeThemeId);
  return safeThemeId;
}

export function syncThemeForCurrentRoute() {
  applyThemeToDocument(getStoredTheme());
}

export function installThemeRouteSync() {
  if (typeof window === "undefined") return;

  syncThemeForCurrentRoute();

  if (window.__dfctThemeRouteSyncInstalled) return;
  window.__dfctThemeRouteSyncInstalled = true;

  const notifyRouteChanged = () => {
    window.dispatchEvent(new Event("dfct:route-changed"));
  };

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithThemeSync(...args) {
    const result = originalPushState.apply(this, args);
    notifyRouteChanged();
    return result;
  };

  window.history.replaceState = function replaceStateWithThemeSync(...args) {
    const result = originalReplaceState.apply(this, args);
    notifyRouteChanged();
    return result;
  };

  window.addEventListener("popstate", syncThemeForCurrentRoute);
  window.addEventListener("dfct:route-changed", syncThemeForCurrentRoute);
}
