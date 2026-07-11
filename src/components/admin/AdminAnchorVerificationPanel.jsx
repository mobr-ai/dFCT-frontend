import React, { useMemo } from "react";
import { Badge, Button, Spinner } from "react-bootstrap";


function valueOf(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}


function shorten(value, head = 10, tail = 8) {
  const text = String(value || "");
  if (!text) return "—";
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}


function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}


function statusTone(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "confirmed") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "submitted") return "info";
  return "secondary";
}


function Stat({ label, value, caption }) {
  return (
    <div className="DfctAdmin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}


export default function AdminAnchorVerificationPanel({
  t,
  anchorJobs,
  onInspect,
}) {
  const rows = useMemo(
    () => (anchorJobs.items || []).filter((job) => {
      const status = String(job?.status || "").toLowerCase();
      const txHash = valueOf(job, "txHash", "tx_hash");

      return Boolean(
        txHash
        || status === "submitted"
        || status === "confirmed"
        || status === "failed"
      );
    }),
    [anchorJobs.items],
  );

  const stats = useMemo(() => ({
    total: rows.length,
    submitted: rows.filter(
      (row) => String(row.status).toLowerCase() === "submitted",
    ).length,
    failed: rows.filter(
      (row) => String(row.status).toLowerCase() === "failed",
    ).length,
    confirmed: rows.filter(
      (row) => String(row.status).toLowerCase() === "confirmed",
    ).length,
  }), [rows]);

  return (
    <section className="DfctAdmin-section">
      <div className="DfctAdmin-sectionHeader DfctAdminAnchorVerification-header">
        <div>
          <span className="DfctAdmin-eyebrow">
            {t("adminAnchorJobs.verificationEyebrow")}
          </span>
          <h2>{t("adminAnchorJobs.verificationTitle")}</h2>
          <p>{t("adminAnchorJobs.verificationSubtitle")}</p>
        </div>

        <Button
          variant="outline-primary"
          disabled={anchorJobs.loading}
          onClick={() => anchorJobs.loadJobs()}
        >
          {anchorJobs.loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t("adminAnchorJobs.refreshing")}
            </>
          ) : (
            t("adminAnchorJobs.refresh")
          )}
        </Button>
      </div>

      <div className="DfctAdmin-statGrid">
        <Stat
          label={t("adminAnchorJobs.verificationTotal")}
          value={stats.total}
          caption={t("adminAnchorJobs.verificationTotalCaption")}
        />

        <Stat
          label={t("adminAnchorJobs.statSubmitted")}
          value={stats.submitted}
          caption={t("adminAnchorJobs.verificationSubmittedCaption")}
        />

        <Stat
          label={t("adminAnchorJobs.statFailed")}
          value={stats.failed}
          caption={t("adminAnchorJobs.verificationFailedCaption")}
        />

        <Stat
          label={t("adminAnchorJobs.statConfirmed")}
          value={stats.confirmed}
          caption={t("adminAnchorJobs.statConfirmedCaption")}
        />
      </div>

      <div className="DfctAdmin-tableWrap DfctAdminAnchorVerification-tableWrap">
        <table className="DfctAdmin-table">
          <thead>
            <tr>
              <th>{t("adminAnchorJobs.colActions")}</th>
              <th>{t("adminAnchorJobs.colId")}</th>
              <th>{t("adminAnchorJobs.colStatus")}</th>
              <th>{t("adminAnchorJobs.colTopic")}</th>
              <th>{t("adminAnchorJobs.colTx")}</th>
              <th>{t("adminAnchorJobs.submittedAt")}</th>
              <th>{t("adminAnchorJobs.colConfirmedAt")}</th>
              <th>{t("adminAnchorJobs.lastError")}</th>
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
                <td colSpan="8">
                  {t("adminAnchorJobs.verificationEmpty")}
                </td>
              </tr>
            ) : (
              rows.map((job) => {
                const id = valueOf(
                  job,
                  "anchorJobId",
                  "anchor_job_id",
                  "id",
                );
                const status = valueOf(job, "status") || "pending";
                const txHash = valueOf(job, "txHash", "tx_hash");

                return (
                  <tr key={id}>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => onInspect(job)}
                      >
                        {t("adminAnchorJobs.inspect")}
                      </Button>
                    </td>

                    <td>{id || "—"}</td>

                    <td>
                      <Badge bg={statusTone(status)}>
                        {status}
                      </Badge>
                    </td>

                    <td>
                      {shorten(
                        valueOf(job, "topicId", "topic_id"),
                        14,
                        8,
                      )}
                    </td>

                    <td className="is-mono" title={txHash || ""}>
                      {shorten(txHash)}
                    </td>

                    <td>
                      {formatDate(
                        valueOf(job, "submittedAt", "submitted_at"),
                      )}
                    </td>

                    <td>
                      {formatDate(
                        valueOf(job, "confirmedAt", "confirmed_at"),
                      )}
                    </td>

                    <td title={valueOf(job, "error") || ""}>
                      {shorten(valueOf(job, "error"), 20, 8)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
