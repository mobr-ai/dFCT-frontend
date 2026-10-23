import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Form, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";

import { useAdminPreScreen } from "../../hooks/useAdminPreScreen";

const DEFAULT_SETTINGS = {
  moderationEnabled: false,
  ocrMode: "auto",
  clamavMode: "auto",
  remoteSemanticEnabled: true,
  safetyFailClosed: false,
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function shortId(value, head = 8, tail = 6) {
  const text = String(value || "");
  if (!text) return "—";
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

function Stat({ label, value, caption, tone }) {
  return (
    <div className={`DfctAdmin-stat ${tone ? `DfctAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function Capability({ label, state, detail, ready, enabled = true }) {
  const tone = !enabled ? "secondary" : ready ? "success" : "warning";
  return (
    <div className="DfctAdminPreScreen-capability">
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <Badge bg={tone}>{state}</Badge>
    </div>
  );
}

function outcomeTone(outcome) {
  if (outcome === "accepted") return "success";
  if (outcome === "duplicate") return "info";
  if (outcome === "rejected" || outcome === "failed") return "danger";
  return "secondary";
}

export default function AdminPreScreenPanel({ t, user, showToast }) {
  const prescreen = useAdminPreScreen(user, showToast, t);
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const saveTimerRef = useRef(null);
  const lastServerSettingsRef = useRef(null);

  useEffect(() => {
    if (!prescreen.settings) return;

    const nextSettings = { ...DEFAULT_SETTINGS, ...prescreen.settings };
    const nextSignature = JSON.stringify(nextSettings);

    if (lastServerSettingsRef.current === nextSignature) return;
    lastServerSettingsRef.current = nextSignature;

    setDraft((current) => {
      const serverChangedUnderDraft = Object.keys(DEFAULT_SETTINGS).some(
        (key) => current[key] !== nextSettings[key],
      );

      return serverChangedUnderDraft && prescreen.saving ? current : nextSettings;
    });
  }, [prescreen.settings, prescreen.saving]);

  const dirty = useMemo(() => {
    if (!prescreen.settings) return false;
    return Object.keys(DEFAULT_SETTINGS).some(
      (key) => draft[key] !== prescreen.settings[key],
    );
  }, [draft, prescreen.settings]);

  useEffect(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!dirty || !prescreen.settings || prescreen.saving) return undefined;

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void prescreen.saveSettings({
        moderationEnabled: Boolean(draft.moderationEnabled),
        ocrMode: draft.ocrMode,
        clamavMode: draft.clamavMode,
        remoteSemanticEnabled: Boolean(draft.remoteSemanticEnabled),
        safetyFailClosed: Boolean(draft.safetyFailClosed),
      });
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [dirty, draft, prescreen.settings, prescreen.saving, prescreen.saveSettings]);

  const effectiveSettings = { ...DEFAULT_SETTINGS, ...(prescreen.settings || {}) };
  const capabilities = prescreen.capabilities || {};
  const moderation = capabilities.openaiModeration || {};
  const ocr = capabilities.ocr || {};
  const clamav = capabilities.clamav || {};
  const remote = capabilities.remoteSemantic || {};
  const stats = prescreen.stats || {};

  const setField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };



  if (prescreen.accessDenied) {
    return <Alert variant="danger">{t("adminWorkflow.accessDenied")}</Alert>;
  }

  return (
    <>
      {prescreen.error ? (
        <Alert variant="danger" dismissible onClose={() => prescreen.setError("")}>
          {prescreen.error}
        </Alert>
      ) : null}

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader DfctAdminWorkflow-sectionHeaderSplit">
          <div>
            <span className="DfctAdmin-eyebrow">
              {t("adminWorkflow.prescreen.healthEyebrow")}
            </span>
            <h2>{t("adminWorkflow.prescreen.healthTitle")}</h2>
            <p>
              {t("adminWorkflow.prescreen.healthSubtitle", {
                hours: stats.windowHours || 24,
              })}
            </p>
          </div>
        </div>

        <div className="DfctAdmin-statGrid">
          <Stat
            label={t("adminWorkflow.prescreen.stats.screened")}
            value={stats.screened}
            caption={t("adminWorkflow.prescreen.stats.screenedCaption")}
          />
          <Stat
            label={t("adminWorkflow.prescreen.stats.accepted")}
            value={stats.accepted}
            caption={t("adminWorkflow.prescreen.stats.acceptedCaption")}
            tone="success"
          />
          <Stat
            label={t("adminWorkflow.prescreen.stats.flagged")}
            value={stats.flaggedItems}
            caption={t("adminWorkflow.prescreen.stats.flaggedCaption")}
            tone="warning"
          />
          <Stat
            label={t("adminWorkflow.prescreen.stats.blocked")}
            value={stats.blockedItems}
            caption={t("adminWorkflow.prescreen.stats.blockedCaption")}
            tone="danger"
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t("adminWorkflow.prescreen.capabilitiesEyebrow")}
          </span>
          <h2>{t("adminWorkflow.prescreen.capabilitiesTitle")}</h2>
          <p>{t("adminWorkflow.prescreen.capabilitiesSubtitle")}</p>
        </div>

        <div className="DfctAdminPreScreen-capabilityGrid">
          <Capability
            label={t("adminWorkflow.prescreen.capabilities.moderation")}
            state={
              effectiveSettings.moderationEnabled
                ? moderation.configured
                  ? t("adminWorkflow.prescreen.states.ready")
                  : t("adminWorkflow.prescreen.states.needsConfiguration")
                : t("adminWorkflow.prescreen.states.disabled")
            }
            detail={
              moderation.configured
                ? t("adminWorkflow.prescreen.capabilities.openaiConfigured")
                : t("adminWorkflow.prescreen.capabilities.openaiNotConfigured")
            }
            ready={Boolean(effectiveSettings.moderationEnabled && moderation.configured)}
            enabled={Boolean(effectiveSettings.moderationEnabled)}
          />
          <Capability
            label={t("adminWorkflow.prescreen.capabilities.ocr")}
            state={
              effectiveSettings.ocrMode === "false"
                ? t("adminWorkflow.prescreen.states.disabled")
                : ocr.available
                  ? t("adminWorkflow.prescreen.states.available")
                  : t("adminWorkflow.prescreen.states.unavailable")
            }
            detail={t("adminWorkflow.prescreen.capabilities.command", {
              command: ocr.command || "tesseract",
            })}
            ready={Boolean(ocr.ready)}
            enabled={effectiveSettings.ocrMode !== "false"}
          />
          <Capability
            label={t("adminWorkflow.prescreen.capabilities.clamav")}
            state={
              effectiveSettings.clamavMode === "false"
                ? t("adminWorkflow.prescreen.states.disabled")
                : clamav.available
                  ? t("adminWorkflow.prescreen.states.available")
                  : t("adminWorkflow.prescreen.states.unavailable")
            }
            detail={t("adminWorkflow.prescreen.capabilities.command", {
              command: clamav.command || "clamscan",
            })}
            ready={Boolean(clamav.ready)}
            enabled={effectiveSettings.clamavMode !== "false"}
          />
          <Capability
            label={t("adminWorkflow.prescreen.capabilities.remoteSemantic")}
            state={
              effectiveSettings.remoteSemanticEnabled
                ? t("adminWorkflow.prescreen.states.enabled")
                : t("adminWorkflow.prescreen.states.disabled")
            }
            detail={t("adminWorkflow.prescreen.capabilities.remoteSemanticHelp")}
            ready={Boolean(effectiveSettings.remoteSemanticEnabled && remote.ready)}
            enabled={Boolean(effectiveSettings.remoteSemanticEnabled)}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t("adminWorkflow.prescreen.settingsEyebrow")}
          </span>
          <h2>{t("adminWorkflow.prescreen.settingsTitle")}</h2>
          <p>{t("adminWorkflow.prescreen.settingsSubtitle")}</p>
        </div>

        <Form className="DfctAdminPreScreen-settings">
          <div className="DfctAdminPreScreen-settingGrid">
            <Form.Group className="DfctAdminPreScreen-settingCard">
              <Form.Check
                type="switch"
                id="prescreen-moderation-enabled"
                label={t("adminWorkflow.prescreen.settings.moderation")}
                checked={Boolean(draft.moderationEnabled)}
                onChange={(event) => setField("moderationEnabled", event.target.checked)}
              />
              <Form.Text>{t("adminWorkflow.prescreen.settings.moderationHelp")}</Form.Text>
            </Form.Group>

            <Form.Group className="DfctAdminPreScreen-settingCard">
              <Form.Label>{t("adminWorkflow.prescreen.settings.ocr")}</Form.Label>
              <Form.Select
                value={draft.ocrMode}
                onChange={(event) => setField("ocrMode", event.target.value)}
              >
                <option value="false">{t("adminWorkflow.prescreen.modes.disabled")}</option>
                <option value="auto">{t("adminWorkflow.prescreen.modes.auto")}</option>
                <option value="true">{t("adminWorkflow.prescreen.modes.enabled")}</option>
              </Form.Select>
              <Form.Text>{t("adminWorkflow.prescreen.settings.ocrHelp")}</Form.Text>
            </Form.Group>

            <Form.Group className="DfctAdminPreScreen-settingCard">
              <Form.Label>{t("adminWorkflow.prescreen.settings.clamav")}</Form.Label>
              <Form.Select
                value={draft.clamavMode}
                onChange={(event) => setField("clamavMode", event.target.value)}
              >
                <option value="false">{t("adminWorkflow.prescreen.modes.disabled")}</option>
                <option value="auto">{t("adminWorkflow.prescreen.modes.auto")}</option>
                <option value="true">{t("adminWorkflow.prescreen.modes.enabled")}</option>
              </Form.Select>
              <Form.Text>{t("adminWorkflow.prescreen.settings.clamavHelp")}</Form.Text>
            </Form.Group>

            <Form.Group className="DfctAdminPreScreen-settingCard">
              <Form.Check
                type="switch"
                id="prescreen-remote-semantic-enabled"
                label={t("adminWorkflow.prescreen.settings.remoteSemantic")}
                checked={Boolean(draft.remoteSemanticEnabled)}
                onChange={(event) =>
                  setField("remoteSemanticEnabled", event.target.checked)
                }
              />
              <Form.Text>
                {t("adminWorkflow.prescreen.settings.remoteSemanticHelp")}
              </Form.Text>
            </Form.Group>

            <Form.Group className="DfctAdminPreScreen-settingCard is-critical">
              <Form.Check
                type="switch"
                id="prescreen-safety-fail-closed"
                label={t("adminWorkflow.prescreen.settings.failClosed")}
                checked={Boolean(draft.safetyFailClosed)}
                onChange={(event) => setField("safetyFailClosed", event.target.checked)}
              />
              <Form.Text>{t("adminWorkflow.prescreen.settings.failClosedHelp")}</Form.Text>
            </Form.Group>
          </div>

        </Form>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t("adminWorkflow.prescreen.recentEyebrow")}
          </span>
          <h2>{t("adminWorkflow.prescreen.recentTitle")}</h2>
          <p>{t("adminWorkflow.prescreen.recentSubtitle")}</p>
        </div>

        <div className="DfctAdmin-tableWrap DfctAdminPreScreen-tableWrap">
          <table className="DfctAdmin-table DfctAdminPreScreen-table">
            <thead>
              <tr>
                <th>{t("adminWorkflow.prescreen.columns.time")}</th>
                <th>{t("adminWorkflow.prescreen.columns.submission")}</th>
                <th>{t("adminWorkflow.prescreen.columns.ingress")}</th>
                <th>{t("adminWorkflow.prescreen.columns.outcome")}</th>
                <th>{t("adminWorkflow.prescreen.columns.items")}</th>
                <th>{t("adminWorkflow.prescreen.columns.safety")}</th>
                <th>{t("adminWorkflow.prescreen.columns.coverage")}</th>
                <th>{t("adminWorkflow.prescreen.columns.topic")}</th>
              </tr>
            </thead>
            <tbody>
              {prescreen.loading && !prescreen.data ? (
                <tr>
                  <td colSpan="8" className="DfctAdmin-tableEmpty">
                    <Spinner animation="border" size="sm" />
                  </td>
                </tr>
              ) : prescreen.recent.length ? (
                prescreen.recent.map((row) => (
                  <tr key={row.preScreenRunId || row.submissionId}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td className="is-mono" title={row.submissionId || ""}>
                      {shortId(row.submissionId)}
                    </td>
                    <td>{row.ingressType || "—"}</td>
                    <td>
                      <Badge bg={outcomeTone(row.outcome)}>{row.outcome || "—"}</Badge>
                    </td>
                    <td>{row.itemCount ?? 0}</td>
                    <td>
                      {row.flaggedItemCount || row.blockedItemCount
                        ? t("adminWorkflow.prescreen.safetySummary", {
                            flagged: row.flaggedItemCount || 0,
                            blocked: row.blockedItemCount || 0,
                          })
                        : t("adminWorkflow.prescreen.noSafetyFlags")}
                    </td>
                    <td>
                      {row.coverageIncompleteItemCount
                        ? t("adminWorkflow.prescreen.coverageIncomplete", {
                            count: row.coverageIncompleteItemCount,
                          })
                        : t("adminWorkflow.prescreen.coverageComplete")}
                    </td>
                    <td>
                      {row.topicId && row.userId ? (
                        <Link
                          className="btn btn-sm btn-outline-secondary"
                          to={`/t/${row.userId}/${row.topicId}`}
                        >
                          {t("adminWorkflow.prescreen.openTopic", { id: row.topicId })}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="DfctAdmin-tableEmpty">
                    {t("adminWorkflow.prescreen.recentEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
