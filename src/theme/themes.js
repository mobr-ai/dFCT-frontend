export const DEFAULT_THEME_ID = "dfct-dark";

export const THEMES = [
  {
    id: "dfct-dark",
    label: "d-FCT Dark",
    description: "Original d-FCT dark interface",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Neutral dark theme for focused verification",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep blue verification feed theme",
  },
  {
    id: "paper",
    label: "Paper",
    description: "Clean light theme for reading and review",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Retro CLI theme with phosphor accents",
  },
];

export function isValidThemeId(themeId) {
  return THEMES.some((theme) => theme.id === themeId);
}
