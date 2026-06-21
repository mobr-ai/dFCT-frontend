import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { THEMES } from "../../theme/themes";
import { applyTheme, getStoredTheme } from "../../theme/themeStorage";

export default function ThemeSelector() {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(selectedTheme);
  }, [selectedTheme]);

  return (
    <section className="Settings-theme-section" aria-labelledby="settings-theme-title">
      <div className="Settings-theme-header">
        <div>
          <h3 id="settings-theme-title" className="Settings-section-title">
            {t("settingsTheme.title")}
          </h3>
          <p className="Settings-section-subtitle">
            {t("settingsTheme.subtitle")}
          </p>
        </div>
      </div>

      <div className="Settings-theme-grid">
        {THEMES.map((theme) => {
          const active = selectedTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              className={`Settings-theme-option ${active ? "is-active" : ""}`}
              onClick={() => setSelectedTheme(theme.id)}
              aria-pressed={active}
            >
              <span
                className={`Settings-theme-preview Settings-theme-preview-${theme.id}`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </span>

              <span className="Settings-theme-copy">
                <strong>
                  {t(`settingsTheme.options.${theme.id}.label`, {
                    defaultValue: theme.label,
                  })}
                </strong>
                <small>
                  {t(`settingsTheme.options.${theme.id}.description`, {
                    defaultValue: theme.description,
                  })}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
