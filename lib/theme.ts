export const defaultTheme = "nature";
export const themeStorageKey = "hydrosense.theme";
export type Theme = typeof defaultTheme | "graphite";

const themeEvent = "hydrosense:theme";

// Runs before the page is painted. The HTML already supplies the default.
export const themeBootScript = `try{if(localStorage.getItem(${JSON.stringify(themeStorageKey)})==="graphite")document.documentElement.dataset.theme="graphite"}catch{}`;

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "graphite" ? "graphite" : defaultTheme;
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The current page can still switch when persistence is blocked.
  }
  window.dispatchEvent(new Event(themeEvent));
}

export function subscribeToTheme(update: () => void) {
  window.addEventListener(themeEvent, update);
  return () => window.removeEventListener(themeEvent, update);
}
