export function parseUserSettings(rawSettings) {
  if (!rawSettings) return {};
  if (typeof rawSettings === "object") return rawSettings;

  try {
    const parsed = JSON.parse(rawSettings);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeAccountLanguage(value, fallback = "en") {
  const clean = String(value || "").trim().toLowerCase();
  if (clean.startsWith("pt")) return "pt";
  if (clean.startsWith("en")) return "en";
  return fallback;
}

export function settingsWithNotificationLanguage(rawSettings, language) {
  return {
    ...parseUserSettings(rawSettings),
    notificationLanguage: normalizeAccountLanguage(language),
  };
}
