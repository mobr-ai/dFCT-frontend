import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AdminBillingCreditsPage from "./AdminBillingCreditsPage";
import AdminTabs from "../components/admin/AdminTabs";
import AdminAnchorJobsPanel from "../components/admin/AdminAnchorJobsPanel";
import AdminWorkflowPanel from "../components/admin/AdminWorkflowPanel";
import AdminAiPanel, { AdminAiReadinessGrid } from "../components/admin/AdminAiPanel";
import AdminRewardsPanel from "../components/admin/AdminRewardsPanel";
import { hasAdminClaim, useAdminAccess } from "../hooks/useAdminAccess";
import { useAdminOverview } from "../hooks/useAdminOverview";
import AdminSyncPill from "../components/admin/AdminSyncPill";

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

function formatCredits(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0 DFCT";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 6 })} DFCT`;
}

function OverviewStatusCard({ eyebrow, title, status, tone, metrics, onClick, t }) {
  return (
    <button
      type="button"
      className={`DfctAdminOverview-statusCard is-${tone || "neutral"}`}
      onClick={onClick}
    >
      <div className="DfctAdminOverview-statusHead">
        <span>{eyebrow}</span>
        <strong className="DfctAdminOverview-statusBadge">{status}</strong>
      </div>
      <h3>{title}</h3>
      <div className="DfctAdminOverview-statusMetrics">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <small>{t("adminConsole.overview.openArea")}</small>
    </button>
  );
}

function OverviewPanel({
  t,
  user,
  onOpenBilling,
  onOpenWorkflow,
  onOpenAi,
  onOpenRewards,
  onOpenAnchoring,
}) {
  const overview = useAdminOverview(user);
  const { workflow, billing, ai, rewards, anchoring } = overview.summary;

  const attention = [
    workflow.noReviewerAvailable > 0 && {
      key: "workflow-reviewers",
      tone: "danger",
      text: t("adminConsole.overview.attention.noReviewer", { count: workflow.noReviewerAvailable }),
      action: t("adminConsole.overview.attention.openWorkflow"),
      onClick: onOpenWorkflow,
    },
    workflow.atRiskOrExpired > 0 && {
      key: "workflow-risk",
      tone: "warning",
      text: t("adminConsole.overview.attention.atRisk", { count: workflow.atRiskOrExpired }),
      action: t("adminConsole.overview.attention.openWorkflow"),
      onClick: onOpenWorkflow,
    },
    rewards.needsAttentionCount > 0 && {
      key: "rewards",
      tone: "warning",
      text: t("adminConsole.overview.attention.rewards", { count: rewards.needsAttentionCount }),
      action: t("adminConsole.overview.attention.openRewards"),
      onClick: onOpenRewards,
    },
    anchoring.failed > 0 && {
      key: "anchors",
      tone: "danger",
      text: t("adminConsole.overview.attention.anchors", { count: anchoring.failed }),
      action: t("adminConsole.overview.attention.openAnchoring"),
      onClick: onOpenAnchoring,
    },
    !ai.forensicReady && {
      key: "forensic",
      tone: "secondary",
      text: t("adminConsole.overview.attention.forensic"),
      action: t("adminConsole.overview.attention.openAI"),
      onClick: onOpenAi,
    },
  ].filter(Boolean);

  const syntheticAdminAi = {
    providers: overview.data?.ai?.providers || [],
    roles: overview.data?.ai?.roles || [],
    aiCapabilities: overview.data?.ai?.capabilities || {},
    quickCheckSettings: overview.data?.quickCheck?.settings || null,
    quickCheckCapabilities: overview.data?.quickCheck?.capabilities || {},
  };

  return (
    <div className="DfctAdminOverview">
      <section className="DfctAdmin-section DfctAdminOverview-heroSection">
        <div className="DfctAdmin-sectionHeader DfctAdminOverview-sectionHeaderSplit">
          <div>
            <span className="DfctAdmin-eyebrow">{t("adminConsole.overviewEyebrow")}</span>
            <h2>{t("adminConsole.overviewTitle")}</h2>
            <p>{t("adminConsole.overviewSubtitle")}</p>
          </div>
          <AdminSyncPill
            isRefreshing={overview.isRefreshing}
            lastUpdatedAt={overview.lastUpdatedAt}
            syncingLabel={t("adminConsole.overview.syncing")}
            waitingLabel={t("adminConsole.overview.syncWaiting")}
            syncedAtLabel={(time) => t("adminConsole.overview.syncedAt", { time })}
          />
        </div>

        <div className="DfctAdminOverview-statusGrid">
          <OverviewStatusCard
            eyebrow={t("adminConsole.tabs.workflow")}
            title={t("adminConsole.overview.cards.workflow")}
            status={workflow.noReviewerAvailable || workflow.atRiskOrExpired ? t("adminConsole.overview.states.attention") : t("adminConsole.overview.states.healthy")}
            tone={workflow.noReviewerAvailable || workflow.atRiskOrExpired ? "danger" : "success"}
            metrics={[
              { value: workflow.awaitingReview, label: t("adminConsole.overview.metrics.awaiting") },
              { value: workflow.inProgress, label: t("adminConsole.overview.metrics.inProgress") },
            ]}
            onClick={onOpenWorkflow}
            t={t}
          />
          <OverviewStatusCard
            eyebrow={t("adminConsole.tabs.billing")}
            title={t("adminConsole.overview.cards.billing")}
            status={billing.pendingIntents ? t("adminConsole.overview.states.pending") : t("adminConsole.overview.states.healthy")}
            tone={billing.pendingIntents ? "warning" : "success"}
            metrics={[
              { value: billing.users, label: t("adminConsole.overview.metrics.users") },
              { value: billing.pendingIntents, label: t("adminConsole.overview.metrics.paymentIntents") },
            ]}
            onClick={onOpenBilling}
            t={t}
          />
          <OverviewStatusCard
            eyebrow={t("adminConsole.tabs.ai")}
            title={t("adminConsole.overview.cards.ai")}
            status={ai.publicReady ? t("adminConsole.overview.states.ready") : t("adminConsole.overview.states.attention")}
            tone={ai.publicReady ? "success" : "warning"}
            metrics={[
              { value: `${ai.readyRoles}/${ai.enabledRoles}`, label: t("adminConsole.overview.metrics.rolesReady") },
              { value: `${ai.readyProviders}/${ai.enabledProviders}`, label: t("adminConsole.overview.metrics.providersReady") },
            ]}
            onClick={onOpenAi}
            t={t}
          />
          <OverviewStatusCard
            eyebrow={t("adminConsole.tabs.rewards")}
            title={t("adminConsole.overview.cards.rewards")}
            status={rewards.needsAttentionCount ? t("adminConsole.overview.states.attention") : t("adminConsole.overview.states.healthy")}
            tone={rewards.needsAttentionCount ? "warning" : "success"}
            metrics={[
              { value: rewards.pendingEventCount, label: t("adminConsole.overview.metrics.pendingEvents") },
              { value: rewards.readyToDistributeCount, label: t("adminConsole.overview.metrics.readyPools") },
            ]}
            onClick={onOpenRewards}
            t={t}
          />
          <OverviewStatusCard
            eyebrow={t("adminConsole.tabs.anchoring")}
            title={t("adminConsole.overview.cards.anchoring")}
            status={anchoring.failed ? t("adminConsole.overview.states.attention") : anchoring.pending || anchoring.submitted ? t("adminConsole.overview.states.active") : t("adminConsole.overview.states.healthy")}
            tone={anchoring.failed ? "danger" : anchoring.pending || anchoring.submitted ? "info" : "success"}
            metrics={[
              { value: anchoring.pending, label: t("adminConsole.overview.metrics.pendingAnchors") },
              { value: anchoring.confirmed, label: t("adminConsole.overview.metrics.confirmedAnchors") },
            ]}
            onClick={onOpenAnchoring}
            t={t}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader DfctAdminOverview-sectionHeaderSplit">
          <div>
            <span className="DfctAdmin-eyebrow">{t("adminConsole.overview.attentionEyebrow")}</span>
            <h2>{t("adminConsole.overview.attentionTitle")}</h2>
            <p>{t("adminConsole.overview.attentionSubtitle", { count: attention.length })}</p>
          </div>
          <strong className="DfctAdminOverview-attentionCount">{attention.length}</strong>
        </div>
        {attention.length ? (
          <div className="DfctAdminOverview-attentionList">
            {attention.map((item) => (
              <button key={item.key} type="button" className={`DfctAdminOverview-attentionItem is-${item.tone}`} onClick={item.onClick}>
                <span className="DfctAdminOverview-attentionDot" />
                <strong>{item.text}</strong>
                <span>{item.action} →</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="DfctAdminOverview-clearState">
            <strong>{t("adminConsole.overview.clearTitle")}</strong>
            <p>{t("adminConsole.overview.clearText")}</p>
          </div>
        )}
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminConsole.overview.snapshotEyebrow")}</span>
          <h2>{t("adminConsole.overview.snapshotTitle")}</h2>
          <p>{t("adminConsole.overview.snapshotSubtitle")}</p>
        </div>
        <div className="DfctAdminOverview-snapshotGrid">
          <div><span>{t("adminConsole.overview.snapshot.reviewQueue")}</span><strong>{workflow.awaitingReview}</strong><small>{t("adminConsole.overview.snapshot.reviewQueueDetail", { count: workflow.noReviewerAvailable })}</small></div>
          <div><span>{t("adminConsole.overview.snapshot.billing")}</span><strong>{billing.totalIntents}</strong><small>{t("adminConsole.overview.snapshot.billingDetail", { count: billing.pendingIntents })}</small></div>
          <div><span>{t("adminConsole.overview.snapshot.rewards")}</span><strong>{formatCredits(rewards.availableAmount)}</strong><small>{t("adminConsole.overview.snapshot.rewardsDetail", { count: rewards.pendingEventCount })}</small></div>
          <div><span>{t("adminConsole.overview.snapshot.anchoring")}</span><strong>{anchoring.total}</strong><small>{t("adminConsole.overview.snapshot.anchoringDetail", { pending: anchoring.pending, submitted: anchoring.submitted })}</small></div>
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader DfctAdminOverview-sectionHeaderSplit">
          <div>
            <span className="DfctAdmin-eyebrow">{t("adminConsole.overview.aiEyebrow")}</span>
            <h2>{t("adminConsole.overview.aiTitle")}</h2>
            <p>{t("adminConsole.overview.aiSubtitle")}</p>
          </div>
          <button type="button" className="DfctAdminOverview-inlineLink" onClick={onOpenAi}>{t("adminConsole.overview.openAI")} →</button>
        </div>
        <AdminAiReadinessGrid adminAi={syntheticAdminAi} t={t} />
      </section>

      <section className="DfctAdmin-section DfctAdminOverview-areasSection">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminConsole.overview.areasEyebrow")}</span>
          <h2>{t("adminConsole.nextOpsTitle")}</h2>
          <p>{t("adminConsole.overview.areasSubtitle")}</p>
        </div>
        <div className="DfctAdminOverview-areaLinks">
          {[
            ["workflow", t("adminConsole.tabs.workflow"), t("adminConsole.actionWorkflowText"), onOpenWorkflow],
            ["billing", t("adminConsole.tabs.billing"), t("adminConsole.actionBillingText"), onOpenBilling],
            ["ai", t("adminConsole.tabs.ai"), t("adminConsole.actionAIText"), onOpenAi],
            ["rewards", t("adminConsole.tabs.rewards"), t("adminConsole.actionRewardsText"), onOpenRewards],
            ["anchoring", t("adminConsole.tabs.anchoring"), t("adminConsole.actionAnchoringText"), onOpenAnchoring],
          ].map(([key, title, text, onClick]) => (
            <button key={key} type="button" onClick={onClick}><strong>{title}</strong><span>{text}</span><small>→</small></button>
          ))}
        </div>
      </section>
    </div>
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
      { key: "ai" },
      { key: "rewards" },
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
            user={userData}
            onOpenBilling={() => changeTab("billing")}
            onOpenWorkflow={() => changeTab("workflow")}
            onOpenAi={() => changeTab("ai")}
            onOpenRewards={() => changeTab("rewards")}
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

        {activeTab === "ai" && (
          <AdminAiPanel t={t} user={userData} showToast={showToast} />
        )}

        {activeTab === "rewards" && (
          <AdminRewardsPanel t={t} user={userData} showToast={showToast} />
        )}

        {activeTab === "anchoring" && (
          <AdminAnchorJobsPanel t={t} user={userData} showToast={showToast} />
        )}

      </div>
    </main>
  );
}
