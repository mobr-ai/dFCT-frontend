import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Spinner,
} from "react-bootstrap";


const DEFAULT_SETTINGS = {
  cardanoSubmissionEnabled: false,
  autoDispatchEnabled: false,
  claimTtlSeconds: 300,
  submitMaxRetries: 5,
  verifyMaxRetries: 8,
  verifyInitialDelaySeconds: 30,
};


const REASON_TRANSLATIONS = {
  submitter_not_implemented: "reasonSubmitterNotImplemented",
  server_disabled_by_environment: "reasonServerDisabled",
  signer_not_configured: "reasonSignerMissing",
  blockfrost_not_configured: "reasonBlockfrostMissing",
  admin_submission_disabled: "reasonAdminDisabled",
};


function shorten(value, head = 18, tail = 12) {
  const text = String(value || "");
  if (!text) return "—";
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}


function Capability({ label, value, variant = "secondary" }) {
  return (
    <div className="DfctAdminAnchorExecution-capability">
      <span>{label}</span>
      <Badge bg={variant}>{value}</Badge>
    </div>
  );
}


function numberValue(event, fallback) {
  const parsed = Number(event.target.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


export default function AdminAnchorExecutionPanel({ t, anchorJobs }) {
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const [showEnableConfirmation, setShowEnableConfirmation] = useState(false);

  useEffect(() => {
    anchorJobs.loadSettings();
  }, [anchorJobs.loadSettings]);

  useEffect(() => {
    if (!anchorJobs.settings) return;

    setDraft({
      ...DEFAULT_SETTINGS,
      ...anchorJobs.settings,
    });
  }, [anchorJobs.settings]);

  const saved = {
    ...DEFAULT_SETTINGS,
    ...(anchorJobs.settings || {}),
  };
  const capabilities = anchorJobs.capabilities || {};
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  let executionStatus = {
    text: t("adminAnchorJobs.statusNotReady"),
    variant: "secondary",
  };

  if (capabilities.effectiveSubmissionEnabled) {
    executionStatus = {
      text: t("adminAnchorJobs.statusActive"),
      variant: "success",
    };
  } else if (
    capabilities.submitterImplemented
    && capabilities.serverAllowed
    && capabilities.signerConfigured
    && capabilities.blockfrostConfigured
  ) {
    executionStatus = {
      text: t("adminAnchorJobs.statusPaused"),
      variant: "warning",
    };
  }

  const updateDraft = (key, value) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleSubmission = (enabled) => {
    if (enabled) {
      setShowEnableConfirmation(true);
      return;
    }

    updateDraft("cardanoSubmissionEnabled", false);
  };

  const save = async (event) => {
    event.preventDefault();
    await anchorJobs.saveSettings(draft);
  };

  if (anchorJobs.settingsLoading && !anchorJobs.settings) {
    return (
      <section className="DfctAdmin-section">
        <div className="DfctAdminAnchorExecution-loading">
          <Spinner animation="border" size="sm" className="me-2" />
          {t("adminAnchorJobs.settingsLoading")}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader DfctAdminAnchorExecution-heading">
          <div>
            <span className="DfctAdmin-eyebrow">
              {t("adminAnchorJobs.executionEyebrow")}
            </span>
            <h2>{t("adminAnchorJobs.executionTitle")}</h2>
            <p>{t("adminAnchorJobs.executionSubtitle")}</p>
          </div>

          <Badge
            bg={executionStatus.variant}
            className="DfctAdminAnchorExecution-status"
          >
            {executionStatus.text}
          </Badge>
        </div>

        <div className="DfctAdminAnchorExecution-capabilityGrid">
          <Capability
            label={t("adminAnchorJobs.deploymentPermission")}
            value={
              capabilities.serverAllowed
                ? t("adminAnchorJobs.allowed")
                : t("adminAnchorJobs.blocked")
            }
            variant={capabilities.serverAllowed ? "success" : "secondary"}
          />

          <Capability
            label={t("adminAnchorJobs.backendSubmitter")}
            value={
              capabilities.submitterImplemented
                ? t("adminAnchorJobs.ready")
                : t("adminAnchorJobs.capabilityPending")
            }
            variant={capabilities.submitterImplemented ? "success" : "warning"}
          />

          <Capability
            label={t("adminAnchorJobs.platformSigner")}
            value={
              capabilities.signerConfigured
                ? t("adminAnchorJobs.configured")
                : t("adminAnchorJobs.missing")
            }
            variant={capabilities.signerConfigured ? "success" : "secondary"}
          />

          <Capability
            label={t("adminAnchorJobs.blockfrostProvider")}
            value={
              capabilities.blockfrostConfigured
                ? t("adminAnchorJobs.ready")
                : t("adminAnchorJobs.missing")
            }
            variant={capabilities.blockfrostConfigured ? "success" : "secondary"}
          />
        </div>

        {Array.isArray(capabilities.notReadyReasons)
          && capabilities.notReadyReasons.length > 0 && (
            <Alert
              variant="secondary"
              className="DfctAdminAnchorExecution-readiness"
            >
              <strong>{t("adminAnchorJobs.readinessAttention")}</strong>
              <ul>
                {capabilities.notReadyReasons.map((reason) => {
                  const translationKey = REASON_TRANSLATIONS[reason];

                  return (
                    <li key={reason}>
                      {translationKey
                        ? t(`adminAnchorJobs.${translationKey}`)
                        : reason}
                    </li>
                  );
                })}
              </ul>
            </Alert>
          )}

        <div className="DfctAdminAnchorExecution-layout">
          <Form
            className="DfctAdminAnchorExecution-card"
            onSubmit={save}
          >
            <div className="DfctAdminAnchorExecution-cardHeader">
              <h3>{t("adminAnchorJobs.executionControlsTitle")}</h3>
              <p>{t("adminAnchorJobs.executionControlsSubtitle")}</p>
            </div>

            <div className="DfctAdminAnchorExecution-switchRow">
              <div>
                <strong>{t("adminAnchorJobs.executionEnabled")}</strong>
                <small>{t("adminAnchorJobs.executionEnabledHelp")}</small>
              </div>

              <Form.Check
                type="switch"
                id="anchor-submission-enabled"
                checked={Boolean(draft.cardanoSubmissionEnabled)}
                onChange={(event) => toggleSubmission(event.target.checked)}
              />
            </div>

            <div className="DfctAdminAnchorExecution-switchRow">
              <div>
                <strong>{t("adminAnchorJobs.autoDispatchEnabled")}</strong>
                <small>{t("adminAnchorJobs.autoDispatchEnabledHelp")}</small>
              </div>

              <Form.Check
                type="switch"
                id="anchor-auto-dispatch-enabled"
                checked={Boolean(draft.autoDispatchEnabled)}
                onChange={(event) => updateDraft(
                  "autoDispatchEnabled",
                  event.target.checked,
                )}
              />
            </div>

            <div className="DfctAdminAnchorExecution-fieldGrid">
              <Form.Group>
                <Form.Label>
                  {t("adminAnchorJobs.claimTtlSeconds")}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="60"
                  max="3600"
                  value={draft.claimTtlSeconds}
                  onChange={(event) => updateDraft(
                    "claimTtlSeconds",
                    numberValue(event, 300),
                  )}
                />
                <Form.Text>
                  {t("adminAnchorJobs.claimTtlSecondsHelp")}
                </Form.Text>
              </Form.Group>

              <Form.Group>
                <Form.Label>
                  {t("adminAnchorJobs.submitMaxRetries")}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="20"
                  value={draft.submitMaxRetries}
                  onChange={(event) => updateDraft(
                    "submitMaxRetries",
                    numberValue(event, 5),
                  )}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>
                  {t("adminAnchorJobs.verifyMaxRetries")}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="50"
                  value={draft.verifyMaxRetries}
                  onChange={(event) => updateDraft(
                    "verifyMaxRetries",
                    numberValue(event, 8),
                  )}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>
                  {t("adminAnchorJobs.verifyInitialDelaySeconds")}
                </Form.Label>
                <Form.Control
                  type="number"
                  min="5"
                  max="900"
                  value={draft.verifyInitialDelaySeconds}
                  onChange={(event) => updateDraft(
                    "verifyInitialDelaySeconds",
                    numberValue(event, 30),
                  )}
                />
              </Form.Group>
            </div>

            <div className="DfctAdminAnchorExecution-actions">
              <Button
                type="button"
                variant="outline-secondary"
                disabled={!dirty || anchorJobs.settingsSaving}
                onClick={() => setDraft(saved)}
              >
                {t("adminAnchorJobs.discardChanges")}
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={!dirty || anchorJobs.settingsSaving}
              >
                {anchorJobs.settingsSaving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t("adminAnchorJobs.savingSettings")}
                  </>
                ) : (
                  t("adminAnchorJobs.saveSettings")
                )}
              </Button>
            </div>
          </Form>

          <div className="DfctAdminAnchorExecution-card">
            <div className="DfctAdminAnchorExecution-cardHeader">
              <h3>{t("adminAnchorJobs.infrastructureTitle")}</h3>
              <p>{t("adminAnchorJobs.infrastructureSubtitle")}</p>
            </div>

            <div className="DfctAdminAnchorJobs-detailGrid">
              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.network")}</span>
                <strong>{capabilities.network || "—"}</strong>
              </div>

              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.provider")}</span>
                <strong>{capabilities.provider || "—"}</strong>
              </div>

              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.metadataLabel")}</span>
                <strong>{capabilities.metadataLabel ?? "—"}</strong>
              </div>

              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.submissionMode")}</span>
                <strong>{capabilities.mode || "—"}</strong>
              </div>

              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.platformAddress")}</span>
                <strong
                  className="is-mono"
                  title={capabilities.walletAddress || ""}
                >
                  {shorten(capabilities.walletAddress)}
                </strong>
              </div>

              <div className="DfctAdminAnchorJobs-detailRow">
                <span>{t("adminAnchorJobs.effectiveStatus")}</span>
                <strong>{executionStatus.text}</strong>
              </div>
            </div>

            <details className="DfctAdminAnchorExecution-protocol">
              <summary>{t("adminAnchorJobs.protocolDetails")}</summary>
              <code>{capabilities.payloadSchema || "—"}</code>
              <code>{capabilities.metadataSchema || "—"}</code>
            </details>
          </div>
        </div>
      </section>

      <Modal
        show={showEnableConfirmation}
        onHide={() => setShowEnableConfirmation(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {t("adminAnchorJobs.enableSubmissionConfirmTitle")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p>{t("adminAnchorJobs.enableSubmissionConfirmText")}</p>
          <Alert variant="warning">
            {t("adminAnchorJobs.enableSubmissionConfirmWarning")}
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowEnableConfirmation(false)}
          >
            {t("adminAnchorJobs.cancel")}
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              updateDraft("cardanoSubmissionEnabled", true);
              setShowEnableConfirmation(false);
            }}
          >
            {t("adminAnchorJobs.enableSubmission")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
