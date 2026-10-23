import React from "react";
import { Button } from "react-bootstrap";

import "../../styles/admin/AdminConsole.css";

export default function AdminTabs({ activeTab, tabs, onChange, t }) {
  return (
    <div className="DfctAdminTabs" role="tablist" aria-label={t("adminConsole.tabsAriaLabel")}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;

        return (
          <Button
            key={tab.key}
            type="button"
            variant="link"
            className={`DfctAdminTabs-button ${active ? "is-active" : ""}`}
            onClick={() => onChange(tab.key)}
            role="tab"
            aria-selected={active}
          >
            <span>{t(`adminConsole.tabs.${tab.key}`)}</span>
          </Button>
        );
      })}
    </div>
  );
}
