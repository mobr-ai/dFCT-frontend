import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AdminBillingCreditsPage from "./AdminBillingCreditsPage";
import AdminTabs from "../components/admin/AdminTabs";
import AdminAnchorJobsPanel from "../components/admin/AdminAnchorJobsPanel";
import AdminWorkflowPanel from "../components/admin/AdminWorkflowPanel";
import { hasAdminClaim, useAdminAccess } from "../hooks/useAdminAccess";

import "../styles/admin/AdminConsole.css";

function ConsoleStat({ label, value, caption, tone }) {
  return (
    <div className={`DfctAdmin-stat ${tone ? `DfctAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function OverviewPanel({ t, onOpenBilling, onOpenWorkflow, onOpenAnchoring }) {
  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminConsole.overviewEyebrow")}</span>
          <h2>{t("adminConsole.overviewTitle")}</h2>
          <p>{t("adminConsole.overviewSubtitle")}</p>
        </div>

        <div className="DfctAdmin-statGrid">
          <ConsoleStat
            label={t("adminConsole.overviewBillingLabel")}
            value={t("adminConsole.overviewBillingValue")}
            caption={t("adminConsole.overviewBillingCaption")}
            tone="success"
          />
          <ConsoleStat
            label={t("adminConsole.overviewAnchoringLabel")}
            value={t("adminConsole.overviewAnchoringValue")}
            caption={t("adminConsole.overviewAnchoringCaption")}
            tone="info"
          />
          <ConsoleStat
            label={t("adminConsole.overviewVerificationLabel")}
            value={t("adminConsole.overviewVerificationValue")}
            caption={t("adminConsole.overviewVerificationCaption")}
          />
          <ConsoleStat
            label={t("adminConsole.overviewRoadmapLabel")}
            value={t("adminConsole.overviewRoadmapValue")}
            caption={t("adminConsole.overviewRoadmapCaption")}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <h2>{t("adminConsole.nextOpsTitle")}</h2>
          <p>{t("adminConsole.nextOpsSubtitle")}</p>
        </div>

        <div className="DfctAdminConsole-actionGrid">
          <button
            type="button"
            className="DfctAdminConsole-actionCard DfctAdminConsole-actionCardButton"
            onClick={onOpenBilling}
          >
            <span>{t("adminConsole.actionBillingEyebrow")}</span>
            <strong>{t("adminConsole.actionBillingTitle")}</strong>
            <p>{t("adminConsole.actionBillingText")}</p>
          </button>
          <button
            type="button"
            className="DfctAdminConsole-actionCard DfctAdminConsole-actionCardButton"
            onClick={onOpenWorkflow}
          >
            <span>{t("adminConsole.actionWorkflowEyebrow")}</span>
            <strong>{t("adminConsole.actionWorkflowTitle")}</strong>
            <p>{t("adminConsole.actionWorkflowText")}</p>
          </button>
          <button
            type="button"
            className="DfctAdminConsole-actionCard DfctAdminConsole-actionCardButton"
            onClick={onOpenAnchoring}
          >
            <span>{t("adminConsole.actionAnchoringEyebrow")}</span>
            <strong>{t("adminConsole.actionAnchoringTitle")}</strong>
            <p>{t("adminConsole.actionAnchoringText")}</p>
          </button>
        </div>
      </section>
    </>
  );
}

function AnchoringPlaceholder({ t }) {
  return (
    <div className="DfctAdminConsole-panel DfctAdminConsole-anchoringPanel">
      <div className="DfctAdmin-header DfctAdminConsole-panelHeader">
        <div>
          <span className="DfctAdmin-eyebrow">{t("adminConsole.anchoringEyebrow")}</span>
          <h1>{t("adminConsole.anchoringTitle")}</h1>
          <p>{t("adminConsole.anchoringSubtitle")}</p>
        </div>
      </div>

      <div className="DfctAdmin-tabs DfctAdmin-tabs nav nav-tabs DfctAdminConsole-subtabs">
        <button className="nav-link active" type="button">
          {t("adminConsole.anchoringSubtabJobs")}
        </button>
        <button className="nav-link" type="button" disabled>
          {t("adminConsole.anchoringSubtabFunding")}
        </button>
        <button className="nav-link" type="button" disabled>
          {t("adminConsole.anchoringSubtabVerification")}
        </button>
      </div>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminConsole.anchoringStatusEyebrow")}</span>
          <h2>{t("adminConsole.anchoringStatusTitle")}</h2>
          <p>{t("adminConsole.anchoringRoadmap")}</p>
        </div>

        <div className="DfctAdmin-statGrid">
          <ConsoleStat
            label={t("adminConsole.anchoringCardJobsTitle")}
            value={t("adminConsole.anchoringCardJobsValue")}
            caption={t("adminConsole.anchoringCardJobsText")}
            tone="info"
          />
          <ConsoleStat
            label={t("adminConsole.anchoringCardFundingTitle")}
            value={t("adminConsole.anchoringCardFundingValue")}
            caption={t("adminConsole.anchoringCardFundingText")}
            tone="success"
          />
          <ConsoleStat
            label={t("adminConsole.anchoringCardVerifyTitle")}
            value={t("adminConsole.anchoringCardVerifyValue")}
            caption={t("adminConsole.anchoringCardVerifyText")}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminConsole.anchoringFlowEyebrow")}</span>
          <h2>{t("adminConsole.anchoringOpsTitle")}</h2>
          <p>{t("adminConsole.anchoringOpsSubtitle")}</p>
        </div>

        <div className="DfctAdminConsole-anchorFlow">
          <div>
            <span>01</span>
            <strong>{t("adminConsole.anchoringFlowReadTitle")}</strong>
            <p>{t("adminConsole.anchoringFlowReadText")}</p>
          </div>
          <div>
            <span>02</span>
            <strong>{t("adminConsole.anchoringFlowPlanTitle")}</strong>
            <p>{t("adminConsole.anchoringFlowPlanText")}</p>
          </div>
          <div>
            <span>03</span>
            <strong>{t("adminConsole.anchoringFlowVerifyTitle")}</strong>
            <p>{t("adminConsole.anchoringFlowVerifyText")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const outletContext = useOutletContext() || {};
  const { showToast } = outletContext;
  const userData =
    outletContext.userData ||
    outletContext.user ||
    outletContext.session?.user ||
    outletContext.session ||
    null;
  const { isAdmin: roleBasedAdmin } = useAdminAccess(userData);
  const isAdmin = Boolean(roleBasedAdmin || hasAdminClaim(userData));
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = useMemo(
    () => [
      { key: "overview" },
      { key: "workflow" },
      { key: "billing" },
      { key: "anchoring" },
    ],
    [],
  );

  const defaultTab = location.pathname === "/admin/billing" ? "billing" : "overview";
  const tabFromUrl = searchParams.get("tab") || defaultTab;
  const [activeTab, setActiveTab] = useState(
    tabs.some((tab) => tab.key === tabFromUrl) ? tabFromUrl : "overview",
  );

  useEffect(() => {
    const nextDefaultTab = location.pathname === "/admin/billing" ? "billing" : "overview";
    const nextTab = searchParams.get("tab") || nextDefaultTab;

    if (tabs.some((tab) => tab.key === nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, location.pathname, searchParams, tabs]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("overview");
      setSearchParams({ tab: "overview" }, { replace: true });
    }
  }, [activeTab, setSearchParams, tabs]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (!isAdmin) {
    return (
      <main className="DfctAdminConsole">
        <div className="DfctAdminConsole-inner DfctAdminShell">
          <section className="DfctAdminConsole-hero">
            <span className="DfctAdminConsole-eyebrow">
              {t("adminConsole.eyebrow")}
            </span>
            <h1>{t("adminConsole.accessDeniedTitle")}</h1>
            <p>{t("adminConsole.accessDeniedText")}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="DfctAdminConsole">
      <div className="DfctAdminConsole-inner DfctAdminShell">
        <section className="DfctAdminConsole-hero">
          <span className="DfctAdminConsole-eyebrow">
            {t("adminConsole.eyebrow")}
          </span>
          <h1>{t("adminConsole.title")}</h1>
          <p>{t("adminConsole.subtitle")}</p>
        </section>

        <AdminTabs
          activeTab={activeTab}
          tabs={tabs}
          onChange={changeTab}
          t={t}
        />

        {activeTab === "overview" && (
          <OverviewPanel
            t={t}
            onOpenBilling={() => changeTab("billing")}
            onOpenWorkflow={() => changeTab("workflow")}
            onOpenAnchoring={() => changeTab("anchoring")}
          />
        )}

        {activeTab === "workflow" && (
          <AdminWorkflowPanel t={t} user={userData} showToast={showToast} />
        )}

        {activeTab === "billing" && (
          <div className="DfctAdminConsole-embeddedPage">
            <AdminBillingCreditsPage />
          </div>
        )}

        {activeTab === "anchoring" && (
          <AdminAnchorJobsPanel t={t} user={userData} showToast={showToast} />
        )}

      </div>
    </main>
  );
}
