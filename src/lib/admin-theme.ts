import type { CSSProperties } from "react";

export type AdminTheme = "dark" | "light";

// Palette from the Claude Design dashboard. Applied as CSS variables at the admin
// shell root so the whole admin (nav + every tab) themes together.
export const ADMIN_THEMES: Record<AdminTheme, Record<string, string>> = {
  dark: {
    "--page-bg": "#060912", "--frame-bg": "#0a0e17", "--frame-border": "#1b2333",
    "--card": "#111726", "--card-border": "#1e2636", "--card-shadow": "none",
    "--text": "#e6edf6", "--text2": "#c5cedd", "--muted": "#8a97ad", "--label": "#7c8597",
    "--section-label": "#5b6678", "--faint-num": "#5b6678", "--accent": "#4f8cff", "--link": "#7eb0ff",
    "--green": "#34d399", "--track": "#1e2636", "--divider": "#1b2334",
    "--blue-chip-bg": "rgba(79,140,255,.16)", "--blue-chip-text": "#7eb0ff",
    "--green-chip-bg": "rgba(52,211,153,.16)", "--green-chip-text": "#34d399",
    "--neutral-chip-bg": "rgba(138,151,173,.14)", "--neutral-chip-text": "#9aa6ba",
    "--money-bg": "linear-gradient(160deg,#13261f,#0d1521)", "--money-border": "#1f5040",
    "--money-shadow": "0 12px 34px -12px rgba(0,0,0,.6)", "--money-num": "#34d399", "--money-label": "#7fae9b",
    "--money-spark-fill": "rgba(52,211,153,.16)", "--money-spark-stroke": "#34d399",
    "--blue-spark-fill": "rgba(79,140,255,.15)", "--gray-spark-fill": "rgba(91,102,120,.12)", "--gray-spark-stroke": "#5b6678",
    "--warn-bg": "linear-gradient(160deg,#241a0c,#13110b)", "--warn-border": "#5a4318",
    "--warn-label": "#caa258", "--warn-num": "#fbbf24", "--warn-dot": "#fbbf24",
    "--warn-badge-bg": "rgba(251,191,36,.14)", "--warn-badge-text": "#fbbf24",
    "--seg-bg": "#111726", "--seg-border": "#1e2636", "--seg-active-bg": "#34d399", "--seg-active-text": "#0a0e17", "--seg-inactive-text": "#9aa6ba",
    "--nav-active-bg": "#4f8cff", "--nav-active-text": "#0a0e17", "--date-color": "#6b7585", "--neutral-dot": "#5b6678",
  },
  light: {
    "--page-bg": "#eef0f3", "--frame-bg": "#f5f6f8", "--frame-border": "#e3e6ea",
    "--card": "#ffffff", "--card-border": "#ebedf1", "--card-shadow": "0 1px 2px rgba(16,24,40,.04)",
    "--text": "#0f1729", "--text2": "#334155", "--muted": "#647189", "--label": "#7a849a",
    "--section-label": "#9aa3b2", "--faint-num": "#aab2c0", "--accent": "#2563eb", "--link": "#2563eb",
    "--green": "#16a34a", "--track": "#eef1f5", "--divider": "#e7e9ee",
    "--blue-chip-bg": "#e6effe", "--blue-chip-text": "#1d4ed8",
    "--green-chip-bg": "#dcf5e4", "--green-chip-text": "#15803d",
    "--neutral-chip-bg": "#eef1f5", "--neutral-chip-text": "#647189",
    "--money-bg": "linear-gradient(160deg,#effaf3,#ffffff)", "--money-border": "#bbe9cc",
    "--money-shadow": "0 8px 24px -12px rgba(22,163,74,.28)", "--money-num": "#15a34a", "--money-label": "#3f8c5e",
    "--money-spark-fill": "rgba(22,163,74,.12)", "--money-spark-stroke": "#16a34a",
    "--blue-spark-fill": "rgba(37,99,235,.1)", "--gray-spark-fill": "rgba(148,163,184,.1)", "--gray-spark-stroke": "#aab2c0",
    "--warn-bg": "linear-gradient(160deg,#fff8ec,#ffffff)", "--warn-border": "#f5dca5",
    "--warn-label": "#b07d18", "--warn-num": "#d97706", "--warn-dot": "#f59e0b",
    "--warn-badge-bg": "#fdf0d5", "--warn-badge-text": "#b07d18",
    "--seg-bg": "#ffffff", "--seg-border": "#e3e6ea", "--seg-active-bg": "#2563eb", "--seg-active-text": "#ffffff", "--seg-inactive-text": "#647189",
    "--nav-active-bg": "#2563eb", "--nav-active-text": "#ffffff", "--date-color": "#9aa3b2", "--neutral-dot": "#aab2c0",
  },
};

export function adminThemeVars(theme: AdminTheme): CSSProperties {
  return ADMIN_THEMES[theme] as unknown as CSSProperties;
}
