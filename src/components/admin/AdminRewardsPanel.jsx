import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";

import { useAdminRewards } from "../../hooks/useAdminRewards";
import AdminSyncPill from "./AdminSyncPill";

const REWARD_VIEWS = ["overview", "pools"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatCredits(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0 DFCT";
  return `${number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })} DFCT`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusTone(status) {
  const value = String(status || "").toLowerCase();
  if (["healthy", "completed", "active"].includes(value)) return "success";
  if (["ready_to_distribute", "preview_ready", "processing"].includes(value)) return "primary";
  if (["needs_attention", "failed", "blocked_insufficient_pool"].includes(value)) return "danger";
  if (["depleted", "paused"].includes(value)) return "warning";
  return "secondary";
}

function statusLabel(status, t) {
  const key = String(status || "unknown");
  return t(`adminRewards.statuses.${key}`, {
    defaultValue: key.replaceAll("_", " "),
  });
}

function attentionLabel(reason, t) {
  const key = String(reason || "unknown");
  return t(`adminRewards.attentionReasons.${key}`, {
    defaultValue: key.replaceAll("_", " "),
  });
}

function topicLabel(pool, t) {
  return pool?.topic?.title || t("adminRewards.topicFallback", { id: pool?.topicId });
}

function TopicLink({ pool, t }) {
  const owner = pool?.topic?.proposedBy;
  if (!owner || !pool?.topicId) return <strong>{topicLabel(pool, t)}</strong>;
  return (
    <Link className="DfctAdminRewards-topicLink" to={`/t/${owner}/${pool.topicId}`}>
      {topicLabel(pool, t)}
    </Link>
  );
}

function RewardStat({ label, value, caption, tone }) {
  return (
    <div className={`DfctAdmin-stat ${tone ? `DfctAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function AttentionList({ pools, t, onInspect }) {
  if (!pools.length) {
    return (
      <div className="DfctAdminRewards-emptyState">
        <strong>{t("adminRewards.attentionEmptyTitle")}</strong>
        <p>{t("adminRewards.attentionEmptyText")}</p>
      </div>
    );
  }

  return (
    <div className="DfctAdminRewards-attentionList">
      {pools.map((pool) => (
        <article key={pool.poolId} className="DfctAdminRewards-attentionCard">
          <div>
            <div className="DfctAdminRewards-cardHeading">
              <TopicLink pool={pool} t={t} />
              <Badge bg={statusTone(pool.operationalStatus)}>
                {statusLabel(pool.operationalStatus, t)}
              </Badge>
            </div>
            <p>
              {t("adminRewards.pendingSummary", {
                events: pool.readiness?.pendingEventCount || 0,
                contributors: pool.readiness?.pendingParticipantCount || 0,
              })}
            </p>
            <div className="DfctAdminRewards-reasonList">
              {asArray(pool.attentionReasons).map((reason) => (
                <span key={reason}>{attentionLabel(reason, t)}</span>
              ))}
            </div>
          </div>
          <div className="DfctAdminRewards-cardActions">
            <strong>{formatCredits(pool.availableAmount)}</strong>
            <Button size="sm" variant="outline-secondary" onClick={() => onInspect(pool)}>
              {t("adminRewards.actions.inspect")}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function PoolsTable({ pools, t, onInspect }) {
  if (!pools.length) {
    return (
      <div className="DfctAdminRewards-emptyState">
        <strong>{t("adminRewards.poolsEmptyTitle")}</strong>
        <p>{t("adminRewards.poolsEmptyText")}</p>
      </div>
    );
  }

  return (
    <div className="DfctAdmin-tableWrap DfctAdminRewards-tableWrap">
      <table className="DfctAdmin-table DfctAdminRewards-table">
        <thead>
          <tr>
            <th>{t("adminRewards.columns.topic")}</th>
            <th>{t("adminRewards.columns.status")}</th>
            <th>{t("adminRewards.columns.available")}</th>
            <th>{t("adminRewards.columns.distributed")}</th>
            <th>{t("adminRewards.columns.pending")}</th>
            <th>{t("adminRewards.columns.latestDistribution")}</th>
            <th>{t("adminRewards.columns.updated")}</th>
            <th>{t("adminRewards.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => (
            <tr key={pool.poolId} className={pool.needsAttention ? "needs-attention" : ""}>
              <td>
                <TopicLink pool={pool} t={t} />
                <small>#{pool.topicId} · {t("adminRewards.poolId", { id: pool.poolId })}</small>
              </td>
              <td>
                <Badge bg={statusTone(pool.operationalStatus)}>
                  {statusLabel(pool.operationalStatus, t)}
                </Badge>
              </td>
              <td><strong>{formatCredits(pool.availableAmount)}</strong></td>
              <td>{formatCredits(pool.distributedAmount)}</td>
              <td>
                <strong>{pool.readiness?.pendingEventCount || 0}</strong>
                <small>{t("adminRewards.pendingContributors", {
                  count: pool.readiness?.pendingParticipantCount || 0,
                })}</small>
              </td>
              <td>
                {pool.latestDistribution ? (
                  <>
                    <Badge bg={statusTone(pool.latestDistribution.status)}>
                      {statusLabel(pool.latestDistribution.status, t)}
                    </Badge>
                    <small>{formatCredits(pool.latestDistribution.amount)}</small>
                  </>
                ) : "—"}
              </td>
              <td>{formatDate(pool.updatedAt)}</td>
              <td>
                <Button size="sm" variant="outline-secondary" onClick={() => onInspect(pool)}>
                  {t("adminRewards.actions.inspect")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminRewardsPanel({ t, user, showToast }) {
  const rewards = useAdminRewards(user, showToast, t);
  const [activeView, setActiveView] = useState("overview");
  const [selectedPool, setSelectedPool] = useState(null);
  const [distributionAmount, setDistributionAmount] = useState("");
  const [executeTarget, setExecuteTarget] = useState(null);
  const filterReadyRef = useRef(false);

  const health = rewards.summary?.health || {};
  const attention = useMemo(
    () => asArray(rewards.summary?.attention),
    [rewards.summary],
  );
  const details = rewards.poolDetails;
  const activity = details?.activity || {};
  const readiness = details?.readiness?.readiness || selectedPool?.readiness || {};
  const previewedDistributions = useMemo(
    () => asArray(activity.distributions).filter((item) => item.status === "previewed"),
    [activity.distributions],
  );

  useEffect(() => {
    if (!filterReadyRef.current) {
      filterReadyRef.current = true;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void rewards.loadPools({ silent: true, nextFilters: rewards.filters });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [rewards.filters]);

  const openPool = async (pool) => {
    setSelectedPool(pool);
    setDistributionAmount(pool.availableAmount || "");
    await rewards.loadPoolDetails(pool);
  };

  const closePool = () => {
    setSelectedPool(null);
    rewards.setPoolDetails(null);
    setDistributionAmount("");
  };

  const submitPreview = async () => {
    if (!selectedPool || Number(distributionAmount) <= 0) return;
    await rewards.previewDistribution(selectedPool, distributionAmount);
  };

  const submitExecute = async () => {
    if (!selectedPool || !executeTarget?.distributionId) return;
    const result = await rewards.executeDistribution(
      selectedPool,
      executeTarget.distributionId,
    );
    if (result) setExecuteTarget(null);
  };

  return (
    <div className="DfctAdminConsole-panel DfctAdminRewards">
      <div className="DfctAdmin-header DfctAdminConsole-panelHeader">
        <div>
          <span className="DfctAdmin-eyebrow">{t("adminRewards.eyebrow")}</span>
          <h1>{t("adminRewards.title")}</h1>
          <p>{t("adminRewards.subtitle")}</p>
        </div>
        <AdminSyncPill
          isRefreshing={rewards.isRefreshing}
          lastUpdatedAt={rewards.lastUpdatedAt}
          syncingLabel={t("adminRewards.syncing")}
          waitingLabel={t("adminRewards.syncWaiting")}
          syncedAtLabel={(time) => t("adminRewards.syncedAt", { time })}
        />
      </div>

      <div className="DfctAdmin-tabs nav nav-tabs DfctAdminConsole-subtabs" role="tablist">
        {REWARD_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            className={`nav-link ${activeView === view ? "active" : ""}`}
            onClick={() => setActiveView(view)}
            role="tab"
            aria-selected={activeView === view}
          >
            {t(`adminRewards.views.${view}`)}
          </button>
        ))}
      </div>

      {rewards.accessDenied ? <Alert variant="danger">{t("adminRewards.accessDenied")}</Alert> : null}
      {rewards.error ? (
        <Alert variant="danger" dismissible onClose={() => rewards.setError("")}>
          {rewards.error}
        </Alert>
      ) : null}

      {activeView === "overview" ? (
        <>
          <section className="DfctAdmin-section">
            <div className="DfctAdmin-sectionHeader">
              <span className="DfctAdmin-eyebrow">{t("adminRewards.healthEyebrow")}</span>
              <h2>{t("adminRewards.healthTitle")}</h2>
              <p>{t("adminRewards.healthSubtitle")}</p>
            </div>
            <div className="DfctAdmin-statGrid">
              <RewardStat
                label={t("adminRewards.health.available")}
                value={formatCredits(health.availableAmount)}
                caption={t("adminRewards.health.availableCaption")}
                tone="success"
              />
              <RewardStat
                label={t("adminRewards.health.pendingEvents")}
                value={health.pendingEventCount || 0}
                caption={t("adminRewards.health.pendingEventsCaption", {
                  contributors: health.pendingParticipantCount || 0,
                })}
                tone="info"
              />
              <RewardStat
                label={t("adminRewards.health.readyPools")}
                value={health.readyToDistributeCount || 0}
                caption={t("adminRewards.health.readyPoolsCaption")}
                tone="warning"
              />
              <RewardStat
                label={t("adminRewards.health.attention")}
                value={health.needsAttentionCount || 0}
                caption={t("adminRewards.health.attentionCaption")}
                tone="danger"
              />
            </div>
          </section>

          <section className="DfctAdmin-section">
            <div className="DfctAdmin-sectionHeader DfctAdminRewards-sectionHeaderSplit">
              <div>
                <span className="DfctAdmin-eyebrow">{t("adminRewards.attentionEyebrow")}</span>
                <h2>{t("adminRewards.attentionTitle")}</h2>
                <p>{t("adminRewards.attentionSubtitle", {
                  count: rewards.summary?.attentionCount || 0,
                })}</p>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => setActiveView("pools")}>
                {t("adminRewards.actions.openPools")}
              </Button>
            </div>
            {rewards.summaryLoading && !rewards.summary ? (
              <div className="DfctAdminRewards-loading">
                <Spinner animation="border" size="sm" />
                <span>{t("adminRewards.loading")}</span>
              </div>
            ) : (
              <AttentionList pools={attention} t={t} onInspect={openPool} />
            )}
          </section>
        </>
      ) : null}

      {activeView === "pools" ? (
        <section className="DfctAdmin-section">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">{t("adminRewards.poolsEyebrow")}</span>
            <h2>{t("adminRewards.poolsTitle")}</h2>
            <p>{t("adminRewards.poolsSubtitle")}</p>
          </div>
          <Form className="DfctAdminRewards-filters" onSubmit={(event) => event.preventDefault()}>
            <Form.Group>
              <Form.Label>{t("adminRewards.filters.status")}</Form.Label>
              <Form.Select
                value={rewards.filters.status}
                onChange={(event) => rewards.setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))}
              >
                <option value="all">{t("adminRewards.filters.allStatuses")}</option>
                <option value="active">{t("adminRewards.statuses.active")}</option>
                <option value="depleted">{t("adminRewards.statuses.depleted")}</option>
                <option value="paused">{t("adminRewards.statuses.paused")}</option>
                <option value="closed">{t("adminRewards.statuses.closed")}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="DfctAdminRewards-searchField">
              <Form.Label>{t("adminRewards.filters.search")}</Form.Label>
              <Form.Control
                type="search"
                value={rewards.filters.query}
                placeholder={t("adminRewards.filters.searchPlaceholder")}
                onChange={(event) => rewards.setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))}
              />
            </Form.Group>
          </Form>

          {rewards.poolsLoading && !rewards.pools.length ? (
            <div className="DfctAdminRewards-loading">
              <Spinner animation="border" size="sm" />
              <span>{t("adminRewards.loading")}</span>
            </div>
          ) : (
            <PoolsTable pools={rewards.pools} t={t} onInspect={openPool} />
          )}
        </section>
      ) : null}

      <Modal
        show={Boolean(selectedPool)}
        onHide={closePool}
        centered
        size="xl"
        className="DfctAdminRewards-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{selectedPool ? topicLabel(selectedPool, t) : ""}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {rewards.detailsLoading && !details ? (
            <div className="DfctAdminRewards-loading">
              <Spinner animation="border" size="sm" />
              <span>{t("adminRewards.loadingDetails")}</span>
            </div>
          ) : selectedPool ? (
            <div className="DfctAdminRewards-detailLayout">
              <section className="DfctAdminRewards-detailCard">
                <div className="DfctAdminRewards-cardHeading">
                  <h3>{t("adminRewards.detail.poolTitle")}</h3>
                  <Badge bg={statusTone(selectedPool.operationalStatus)}>
                    {statusLabel(selectedPool.operationalStatus, t)}
                  </Badge>
                </div>
                <div className="DfctAdminRewards-detailGrid">
                  <div><span>{t("adminRewards.detail.funded")}</span><strong>{formatCredits(selectedPool.fundedAmount)}</strong></div>
                  <div><span>{t("adminRewards.detail.available")}</span><strong>{formatCredits(selectedPool.availableAmount)}</strong></div>
                  <div><span>{t("adminRewards.detail.reserved")}</span><strong>{formatCredits(selectedPool.reservedAmount)}</strong></div>
                  <div><span>{t("adminRewards.detail.distributed")}</span><strong>{formatCredits(selectedPool.distributedAmount)}</strong></div>
                </div>
              </section>

              <section className="DfctAdminRewards-detailCard">
                <h3>{t("adminRewards.detail.readinessTitle")}</h3>
                <div className="DfctAdminRewards-detailGrid">
                  <div><span>{t("adminRewards.detail.pendingEvents")}</span><strong>{readiness.pendingEventCount || 0}</strong></div>
                  <div><span>{t("adminRewards.detail.pendingContributors")}</span><strong>{readiness.pendingParticipantCount || 0}</strong></div>
                  <div><span>{t("adminRewards.detail.pendingScore")}</span><strong>{readiness.pendingTotalScore || "0.000000"}</strong></div>
                  <div><span>{t("adminRewards.detail.evaluatedContributions")}</span><strong>{readiness.evaluatedContributionCount || 0}</strong></div>
                </div>
                {asArray(readiness.byAction).length ? (
                  <div className="DfctAdminRewards-actionBreakdown">
                    {readiness.byAction.map((row) => (
                      <div key={row.action}>
                        <span>{statusLabel(row.action, t)}</span>
                        <strong>{row.eventCount} · {row.score}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="DfctAdminRewards-detailCard DfctAdminRewards-distributionCard">
                <h3>{t("adminRewards.detail.distributionTitle")}</h3>
                <p>{t("adminRewards.detail.distributionText")}</p>
                <Form onSubmit={(event) => { event.preventDefault(); void submitPreview(); }}>
                  <Form.Group>
                    <Form.Label>{t("adminRewards.fields.amount")}</Form.Label>
                    <Form.Control
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={distributionAmount}
                      onChange={(event) => setDistributionAmount(event.target.value)}
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    className="mt-3"
                    disabled={
                      !readiness.distributionReady ||
                      Number(distributionAmount) <= 0 ||
                      rewards.actionLoading === `preview:${selectedPool.topicId}`
                    }
                  >
                    {rewards.actionLoading === `preview:${selectedPool.topicId}` ? (
                      <Spinner size="sm" animation="border" />
                    ) : t("adminRewards.actions.preview")}
                  </Button>
                </Form>
              </section>

              <section className="DfctAdminRewards-detailCard">
                <h3>{t("adminRewards.detail.previewsTitle")}</h3>
                {previewedDistributions.length ? (
                  <div className="DfctAdminRewards-previewList">
                    {previewedDistributions.map((distribution) => (
                      <article key={distribution.distributionId}>
                        <div>
                          <strong>{formatCredits(distribution.amount)}</strong>
                          <small>{t("adminRewards.detail.previewMeta", {
                            participants: asArray(distribution.items).length,
                            score: distribution.totalScore,
                          })}</small>
                        </div>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => setExecuteTarget(distribution)}
                        >
                          {t("adminRewards.actions.execute")}
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>{t("adminRewards.detail.noPreviews")}</p>
                )}
              </section>
            </div>
          ) : null}
        </Modal.Body>
      </Modal>

      <Modal
        show={Boolean(executeTarget)}
        onHide={() => setExecuteTarget(null)}
        centered
        className="DfctAdminRewards-modal DfctAdminRewards-confirmModal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("adminRewards.execute.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("adminRewards.execute.text", {
            amount: formatCredits(executeTarget?.amount),
            participants: asArray(executeTarget?.items).length,
          })}</p>
          <Alert variant="warning">{t("adminRewards.execute.warning")}</Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setExecuteTarget(null)}>
            {t("adminRewards.actions.cancel")}
          </Button>
          <Button
            variant="success"
            disabled={rewards.actionLoading === `execute:${executeTarget?.distributionId}`}
            onClick={submitExecute}
          >
            {rewards.actionLoading === `execute:${executeTarget?.distributionId}` ? (
              <Spinner size="sm" animation="border" />
            ) : t("adminRewards.actions.confirmExecute")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
