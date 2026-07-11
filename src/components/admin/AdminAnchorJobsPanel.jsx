import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";

import { useAdminAnchorJobs } from "../../hooks/useAdminAnchorJobs";
import AdminAnchorExecutionPanel from "./AdminAnchorExecutionPanel";
import AdminAnchorVerificationPanel from "./AdminAnchorVerificationPanel";

function valueOf(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function shorten(value, head = 10, tail = 8) {
  const s = String(value || "");
  if (!s) return "—";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed") return "success";
  if (s === "failed" || s === "error") return "danger";
  if (s === "submitted") return "info";
  if (s === "pending") return "warning";
  return "secondary";
}

function Stat({ label, value, caption, tone }) {
  return (
    <div className={`DfctAdmin-stat ${tone ? `DfctAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="DfctAdminAnchorJobs-detailRow">
      <span>{label}</span>
      <strong className={mono ? "is-mono" : ""}>{value || "—"}</strong>
    </div>
  );
}

function FundingPlan({ t, plan }) {
  if (!plan) {
    return (
      <Alert variant="secondary" className="DfctAdminAnchorJobs-inlineAlert">
        {t("adminAnchorJobs.noFundingPlan")}
      </Alert>
    );
  }

  return (
    <div className="DfctAdminAnchorJobs-detailGrid">
      <DetailRow label={t("adminAnchorJobs.fundingMode")} value={plan.fundingMode} />
      <DetailRow label={t("adminAnchorJobs.submitter")} value={plan.submitter} />
      <DetailRow label={t("adminAnchorJobs.network")} value={plan.network} />
      <DetailRow label={t("adminAnchorJobs.metadataLabel")} value={plan.metadataLabel} />
      <DetailRow label={t("adminAnchorJobs.reason")} value={plan.reason} />
      <DetailRow
        label={t("adminAnchorJobs.payloadHash")}
        value={shorten(plan?.metadata?.[String(plan.metadataLabel)]?.dfct?.payloadHash, 18, 12)}
        mono
      />
    </div>
  );
}

export default function AdminAnchorJobsPanel({ t, user, showToast }) {
  const [activeSubtab, setActiveSubtab] = useState("jobs");
  const anchorJobs = useAdminAnchorJobs(user, showToast, t, {
    autoRefreshEnabled: activeSubtab !== "execution",
    autoRefreshIntervalMs: activeSubtab === "verification" ? 30000 : 45000,
  });
  const [txHash, setTxHash] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const didMountFilters = useRef(false);

  const selectedId = valueOf(
    anchorJobs.selectedJob,
    "anchorJobId",
    "anchor_job_id",
    "id",
  );

  const providerPreview = anchorJobs.selectedJob?.providerPreview;
  const fundingPlan = providerPreview?.providerMetadata?.fundingPlan;
  const verification = anchorJobs.verificationResult?.verification;
  const canConfirm = Boolean(verification?.ok && selectedId && txHash.trim());

  const rows = useMemo(() => anchorJobs.items || [], [anchorJobs.items]);

  const filterKey = [
    anchorJobs.filters.status,
    anchorJobs.filters.chain,
    anchorJobs.filters.topicId,
    anchorJobs.filters.limit,
  ].join("|");

  useEffect(() => {
    if (!didMountFilters.current) {
      didMountFilters.current = true;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      anchorJobs.loadJobs({ silent: true });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const onFilterChange = (key, value) => {
    anchorJobs.setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const closeDetailModal = () => setShowDetailModal(false);

  const verifyOnly = () => {
    if (!selectedId || !txHash.trim()) return;
    anchorJobs.verifyTx(selectedId, txHash, { confirm: false });
  };

  const confirmVerified = () => {
    if (!canConfirm) return;
    anchorJobs.verifyTx(selectedId, txHash, { confirm: true });
  };

  const selectJob = async (job) => {
    const id = valueOf(job, "anchorJobId", "anchor_job_id", "id");
    const loaded = await anchorJobs.loadJob(id);
    const existingTxHash = valueOf(loaded || job, "txHash", "tx_hash");
    setTxHash(existingTxHash || "");
    setShowDetailModal(Boolean(id));
  };

  return (
    <div className="DfctAdminConsole-panel DfctAdminConsole-anchoringPanel">
      <div className="DfctAdmin-header DfctAdminConsole-panelHeader">
        <div>
          <span className="DfctAdmin-eyebrow">{t("adminAnchorJobs.eyebrow")}</span>
          <h1>{t("adminAnchorJobs.title")}</h1>
          <p>{t("adminAnchorJobs.subtitle")}</p>
        </div>
        <span className="DfctAdminAnchorJobs-sync">
          {anchorJobs.isAutoRefreshing
            ? t("adminAnchorJobs.syncRefreshing")
            : anchorJobs.lastUpdatedAt
              ? t("adminAnchorJobs.syncedAt", {
                  time: anchorJobs.lastUpdatedAt.toLocaleTimeString(),
                })
              : t("adminAnchorJobs.syncWaiting")}
        </span>
      </div>

      <div className="DfctAdmin-tabs DfctAdmin-tabs nav nav-tabs DfctAdminConsole-subtabs">
        <button
          className={`nav-link ${activeSubtab === "jobs" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveSubtab("jobs")}
        >
          {t("adminAnchorJobs.subtabJobs")}
        </button>
        <button
          className={`nav-link ${activeSubtab === "execution" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveSubtab("execution")}
        >
          {t("adminAnchorJobs.subtabExecution")}
        </button>
        <button
          className={`nav-link ${activeSubtab === "verification" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveSubtab("verification")}
        >
          {t("adminAnchorJobs.subtabVerification")}
        </button>
      </div>

      {anchorJobs.accessDenied && (
        <Alert variant="danger">{t("adminAnchorJobs.accessDenied")}</Alert>
      )}

      {anchorJobs.error && (
        <Alert variant="warning">{anchorJobs.error}</Alert>
      )}

      {activeSubtab === "jobs" && (
        <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAnchorJobs.summaryEyebrow")}</span>
          <h2>{t("adminAnchorJobs.summaryTitle")}</h2>
          <p>{t("adminAnchorJobs.summarySubtitle")}</p>
        </div>

        <div className="DfctAdmin-statGrid">
          <Stat
            label={t("adminAnchorJobs.statTotal")}
            value={anchorJobs.stats.total}
            caption={t("adminAnchorJobs.statTotalCaption")}
          />
          <Stat
            label={t("adminAnchorJobs.statPending")}
            value={anchorJobs.stats.pending}
            caption={t("adminAnchorJobs.statPendingCaption")}
            tone="info"
          />
          <Stat
            label={t("adminAnchorJobs.statSubmitted")}
            value={anchorJobs.stats.submitted}
            caption={t("adminAnchorJobs.statSubmittedCaption")}
            tone="success"
          />
          <Stat
            label={t("adminAnchorJobs.statConfirmed")}
            value={anchorJobs.stats.confirmed}
            caption={t("adminAnchorJobs.statConfirmedCaption")}
          />
        </div>

        <div className="DfctAdminAnchorJobs-filters">
          <Form.Select
            value={anchorJobs.filters.status}
            onChange={(event) => onFilterChange("status", event.target.value)}
          >
            <option value="all">{t("adminAnchorJobs.statusAll")}</option>
            <option value="pending">{t("adminAnchorJobs.statusPending")}</option>
            <option value="submitted">{t("adminAnchorJobs.statusSubmitted")}</option>
            <option value="confirmed">{t("adminAnchorJobs.statusConfirmed")}</option>
            <option value="failed">{t("adminAnchorJobs.statusFailed")}</option>
            <option value="skipped">{t("adminAnchorJobs.statusSkipped")}</option>
          </Form.Select>

          <Form.Select
            value={anchorJobs.filters.chain}
            onChange={(event) => onFilterChange("chain", event.target.value)}
          >
            <option value="all">{t("adminAnchorJobs.chainAll")}</option>
            <option value="cardano">Cardano</option>
          </Form.Select>

          <Form.Control
            value={anchorJobs.filters.topicId}
            onChange={(event) => onFilterChange("topicId", event.target.value)}
            placeholder={t("adminAnchorJobs.topicFilterPlaceholder")}
          />

          <Form.Select
            value={anchorJobs.filters.limit}
            onChange={(event) => onFilterChange("limit", event.target.value)}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Form.Select>

        </div>

        <div className="DfctAdmin-tableWrap DfctAdminAnchorJobs-tableWrap">
          <table className="DfctAdmin-table">
            <thead>
              <tr>
                <th>{t("adminAnchorJobs.colActions")}</th>
                <th>{t("adminAnchorJobs.colId")}</th>
                <th>{t("adminAnchorJobs.colStatus")}</th>
                <th>{t("adminAnchorJobs.colChain")}</th>
                <th>{t("adminAnchorJobs.colTopic")}</th>
                <th>{t("adminAnchorJobs.colScope")}</th>
                <th>{t("adminAnchorJobs.colTx")}</th>
                <th>{t("adminAnchorJobs.colConfirmedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {anchorJobs.loading ? (
                <tr>
                  <td colSpan="8">
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t("adminAnchorJobs.loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="8">{t("adminAnchorJobs.empty")}</td>
                </tr>
              ) : (
                rows.map((job) => {
                  const id = valueOf(job, "anchorJobId", "anchor_job_id", "id");
                  const status = valueOf(job, "status") || "pending";
                  const selected = String(id) === String(selectedId);

                  return (
                    <tr key={id || `${job.chain}-${job.topicId}-${job.stateEventId}`} className={selected ? "is-selected" : ""}>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => selectJob(job)}>
                          {t("adminAnchorJobs.inspect")}
                        </Button>
                      </td>
                      <td>{id || "—"}</td>
                      <td>
                        <Badge bg={statusTone(status)}>{status}</Badge>
                      </td>
                      <td>{valueOf(job, "chain") || "—"}</td>
                      <td title={String(valueOf(job, "topicId", "topic_id") || "")}>
                        {shorten(valueOf(job, "topicId", "topic_id"), 16, 8)}
                      </td>
                      <td>{valueOf(job, "scope") || "—"}</td>
                      <td title={String(valueOf(job, "txHash", "tx_hash") || "")}>
                        {shorten(valueOf(job, "txHash", "tx_hash"))}
                      </td>
                      <td>{formatDate(valueOf(job, "confirmedAt", "confirmed_at"))}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}

      {activeSubtab === "execution" && (
        <AdminAnchorExecutionPanel
          t={t}
          anchorJobs={anchorJobs}
        />
      )}

      {activeSubtab === "verification" && (
        <AdminAnchorVerificationPanel
          t={t}
          anchorJobs={anchorJobs}
          onInspect={selectJob}
        />
      )}

      <Modal
        show={showDetailModal && Boolean(anchorJobs.selectedJob)}
        onHide={closeDetailModal}
        size="xl"
        scrollable
        dialogClassName="DfctAdminAnchorJobs-modal"
        contentClassName="DfctAdminAnchorJobs-modalContent"
      >
        <Modal.Header className="DfctAdminAnchorJobs-modalTop">
          <div className="DfctAdminAnchorJobs-modalHeaderCopy">
            <span className="DfctAdmin-eyebrow">{t("adminAnchorJobs.detailEyebrow")}</span>
            <Modal.Title>{t("adminAnchorJobs.detailTitle")}</Modal.Title>
            <p>{t("adminAnchorJobs.detailSubtitle")}</p>
          </div>
          <Button
            type="button"
            variant="outline-secondary"
            className="DfctAdminAnchorJobs-modalClose"
            onClick={closeDetailModal}
            aria-label={t("adminAnchorJobs.close")}
          >
            ×
          </Button>
        </Modal.Header>

        <Modal.Body>
          {anchorJobs.detailLoading ? (
            <div className="DfctAdminAnchorJobs-modalLoading">
              <Spinner animation="border" size="sm" className="me-2" />
              {t("adminAnchorJobs.loading")}
            </div>
          ) : !anchorJobs.selectedJob ? (
            <Alert variant="secondary">{t("adminAnchorJobs.noSelection")}</Alert>
          ) : (
            <div className="DfctAdminAnchorJobs-detailLayout">
              <div className="DfctAdminAnchorJobs-detailCard">
                <h3>{t("adminAnchorJobs.jobDetails")}</h3>
                <div className="DfctAdminAnchorJobs-detailGrid">
                  <DetailRow label={t("adminAnchorJobs.jobId")} value={selectedId} />
                  <DetailRow label={t("adminAnchorJobs.status")} value={valueOf(anchorJobs.selectedJob, "status")} />
                  <DetailRow label={t("adminAnchorJobs.chain")} value={valueOf(anchorJobs.selectedJob, "chain")} />
                  <DetailRow label={t("adminAnchorJobs.provider")} value={valueOf(anchorJobs.selectedJob, "provider")} />
                  <DetailRow label={t("adminAnchorJobs.topicId")} value={valueOf(anchorJobs.selectedJob, "topicId", "topic_id")} />
                  <DetailRow label={t("adminAnchorJobs.colScope")} value={valueOf(anchorJobs.selectedJob, "scope")} />
                  <DetailRow
                    label={t("adminAnchorJobs.batchHash")}
                    value={shorten(valueOf(anchorJobs.selectedJob, "batchHash", "batch_hash"), 18, 12)}
                    mono
                  />
                  <DetailRow label={t("adminAnchorJobs.recordRef")} value={valueOf(anchorJobs.selectedJob, "recordRef", "record_ref")} />
                  <DetailRow label={t("adminAnchorJobs.explorerUrl")} value={valueOf(anchorJobs.selectedJob, "explorerUrl", "explorer_url")} />
                </div>
              </div>

              <div className="DfctAdminAnchorJobs-detailCard">
                <h3>{t("adminAnchorJobs.fundingPlanTitle")}</h3>
                <FundingPlan t={t} plan={fundingPlan} />
              </div>

              <div className="DfctAdminAnchorJobs-detailCard DfctAdminAnchorJobs-verifyCard">
                <h3>{t("adminAnchorJobs.verifyTitle")}</h3>
                <p>{t("adminAnchorJobs.verifySubtitle")}</p>

                <Form
                  onSubmit={(event) => {
                    event.preventDefault();
                    verifyOnly();
                  }}
                >
                  <Form.Group className="mb-3">
                    <Form.Label>{t("adminAnchorJobs.txHashLabel")}</Form.Label>
                    <Form.Control
                      value={txHash}
                      onChange={(event) => setTxHash(event.target.value)}
                      placeholder={t("adminAnchorJobs.txHashPlaceholder")}
                    />
                  </Form.Group>

                  {verification?.ok && (
                    <Alert variant="success">{t("adminAnchorJobs.verifyOk")}</Alert>
                  )}

                  {verification && !verification.ok && (
                    <Alert variant="danger">
                      {t("adminAnchorJobs.verifyFailed", {
                        error: verification.error || verification.message || "Unknown error",
                      })}
                    </Alert>
                  )}

                  <div className="DfctAdminAnchorJobs-actionRow">
                    <Button
                      type="submit"
                      variant="outline-primary"
                      disabled={!selectedId || !txHash.trim() || anchorJobs.actionLoading}
                    >
                      {anchorJobs.actionLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {t("adminAnchorJobs.verifying")}
                        </>
                      ) : (
                        t("adminAnchorJobs.verifyOnly")
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      disabled={!canConfirm || anchorJobs.actionLoading}
                      onClick={confirmVerified}
                    >
                      {t("adminAnchorJobs.confirmVerified")}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
}
