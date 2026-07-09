import React, { useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";

import { useAdminAnchorJobs } from "../../hooks/useAdminAnchorJobs";

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
  if (s === "prepared") return "info";
  if (s === "pending") return "warning";
  return "secondary";
}

function Stat({ label, value, caption, tone }) {
  return (
    <div className={`DfctBillingAdmin-stat ${tone ? `DfctBillingAdmin-stat--${tone}` : ""}`}>
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
  const anchorJobs = useAdminAnchorJobs(user, showToast, t);
  const [txHash, setTxHash] = useState("");

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

  const onFilterChange = (key, value) => {
    anchorJobs.setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => anchorJobs.loadJobs();

  const selectJob = async (job) => {
    const id = valueOf(job, "anchorJobId", "anchor_job_id", "id");
    const loaded = await anchorJobs.loadJob(id);
    const existingTxHash = valueOf(loaded || job, "txHash", "tx_hash");
    setTxHash(existingTxHash || "");
  };

  return (
    <div className="DfctAdminConsole-panel DfctAdminConsole-anchoringPanel">
      <div className="BillingAccess-header DfctAdminConsole-panelHeader">
        <div>
          <span className="BillingAccess-eyebrow">{t("adminAnchorJobs.eyebrow")}</span>
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

      <div className="BillingAccess-tabs DfctBillingAdmin-tabs nav nav-tabs DfctAdminConsole-subtabs">
        <button className="nav-link active" type="button">
          {t("adminAnchorJobs.subtabJobs")}
        </button>
        <button className="nav-link" type="button" disabled>
          {t("adminAnchorJobs.subtabFunding")}
        </button>
        <button className="nav-link" type="button" disabled>
          {t("adminAnchorJobs.subtabVerification")}
        </button>
      </div>

      {anchorJobs.accessDenied && (
        <Alert variant="danger">{t("adminAnchorJobs.accessDenied")}</Alert>
      )}

      {anchorJobs.error && (
        <Alert variant="warning">{anchorJobs.error}</Alert>
      )}

      <section className="DfctBillingAdmin-section">
        <div className="DfctBillingAdmin-sectionHeader">
          <span className="BillingAccess-eyebrow">{t("adminAnchorJobs.summaryEyebrow")}</span>
          <h2>{t("adminAnchorJobs.summaryTitle")}</h2>
          <p>{t("adminAnchorJobs.summarySubtitle")}</p>
        </div>

        <div className="DfctBillingAdmin-statGrid">
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
            label={t("adminAnchorJobs.statPrepared")}
            value={anchorJobs.stats.prepared}
            caption={t("adminAnchorJobs.statPreparedCaption")}
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
            <option value="prepared">{t("adminAnchorJobs.statusPrepared")}</option>
            <option value="confirmed">{t("adminAnchorJobs.statusConfirmed")}</option>
            <option value="failed">{t("adminAnchorJobs.statusFailed")}</option>
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

          <Button variant="outline-primary" onClick={applyFilters} disabled={anchorJobs.loading}>
            {t("adminAnchorJobs.applyFilters")}
          </Button>
        </div>

        <div className="DfctBillingAdmin-tableWrap DfctAdminAnchorJobs-tableWrap">
          <table className="DfctBillingAdmin-table">
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

      <section className="DfctBillingAdmin-section">
        <div className="DfctBillingAdmin-sectionHeader">
          <span className="BillingAccess-eyebrow">{t("adminAnchorJobs.detailEyebrow")}</span>
          <h2>{t("adminAnchorJobs.detailTitle")}</h2>
          <p>{t("adminAnchorJobs.detailSubtitle")}</p>
        </div>

        {!anchorJobs.selectedJob ? (
          <Alert variant="secondary" className="DfctAdminAnchorJobs-inlineAlert">
            {t("adminAnchorJobs.noSelection")}
          </Alert>
        ) : (
          <div className="DfctAdminAnchorJobs-detailLayout">
            <div className="DfctAdminAnchorJobs-detailCard">
              <h3>{t("adminAnchorJobs.jobDetails")}</h3>
              <div className="DfctAdminAnchorJobs-detailGrid">
                <DetailRow label={t("adminAnchorJobs.jobId")} value={selectedId} />
                <DetailRow label={t("adminAnchorJobs.status")} value={anchorJobs.selectedJob.status} />
                <DetailRow label={t("adminAnchorJobs.chain")} value={anchorJobs.selectedJob.chain} />
                <DetailRow label={t("adminAnchorJobs.provider")} value={anchorJobs.selectedJob.provider} />
                <DetailRow label={t("adminAnchorJobs.topicId")} value={anchorJobs.selectedJob.topicId} mono />
                <DetailRow label={t("adminAnchorJobs.batchHash")} value={shorten(anchorJobs.selectedJob.batchHash, 18, 12)} mono />
                <DetailRow label={t("adminAnchorJobs.recordRef")} value={shorten(anchorJobs.selectedJob.recordRef, 18, 12)} mono />
                <DetailRow label={t("adminAnchorJobs.explorerUrl")} value={anchorJobs.selectedJob.explorerUrl ? t("adminAnchorJobs.available") : "—"} />
              </div>
            </div>

            <div className="DfctAdminAnchorJobs-detailCard">
              <h3>{t("adminAnchorJobs.fundingPlanTitle")}</h3>
              {anchorJobs.detailLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <FundingPlan t={t} plan={fundingPlan} />
              )}
            </div>

            <div className="DfctAdminAnchorJobs-detailCard DfctAdminAnchorJobs-verifyCard">
              <h3>{t("adminAnchorJobs.verifyTitle")}</h3>
              <p>{t("adminAnchorJobs.verifySubtitle")}</p>

              <Form.Group className="mb-3">
                <Form.Label>{t("adminAnchorJobs.txHashLabel")}</Form.Label>
                <Form.Control
                  value={txHash}
                  onChange={(event) => setTxHash(event.target.value)}
                  placeholder={t("adminAnchorJobs.txHashPlaceholder")}
                />
              </Form.Group>

              {verification && (
                <Alert variant={verification.ok ? "success" : "danger"} className="DfctAdminAnchorJobs-inlineAlert">
                  {verification.ok
                    ? t("adminAnchorJobs.verifyOk")
                    : t("adminAnchorJobs.verifyFailed", { error: verification.error || "unknown" })}
                </Alert>
              )}

              <div className="DfctAdminAnchorJobs-actionRow">
                <Button
                  variant="outline-primary"
                  disabled={!selectedId || !txHash.trim() || Boolean(anchorJobs.actionLoading)}
                  onClick={() => anchorJobs.verifyTx(selectedId, txHash, { confirm: false })}
                >
                  {anchorJobs.actionLoading === "verifyTx" ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t("adminAnchorJobs.verifying")}
                    </>
                  ) : (
                    t("adminAnchorJobs.verifyOnly")
                  )}
                </Button>

                <Button
                  variant="success"
                  disabled={!canConfirm || Boolean(anchorJobs.actionLoading)}
                  onClick={() => anchorJobs.verifyTx(selectedId, txHash, { confirm: true })}
                >
                  {anchorJobs.actionLoading === "confirmTx" ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t("adminAnchorJobs.confirming")}
                    </>
                  ) : (
                    t("adminAnchorJobs.confirmVerified")
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
