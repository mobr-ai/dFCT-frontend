import React, { useCallback, useEffect, useRef, useState } from "react";
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


const NUMERIC_LIMITS = {
  claimTtlSeconds: { min: 60, max: 3600 },
  submitMaxRetries: { min: 0, max: 20 },
  verifyMaxRetries: { min: 0, max: 50 },
  verifyInitialDelaySeconds: { min: 5, max: 900 },
};


const REASON_TRANSLATIONS = {
  submitter_not_implemented: "reasonSubmitterNotImplemented",
  server_disabled_by_environment: "reasonServerDisabled",
  signer_not_configured: "reasonSignerMissing",
  blockfrost_not_configured: "reasonBlockfrostMissing",
  admin_submission_disabled: "reasonAdminDisabled",
  auto_dispatch_cutoff_missing: "reasonAutoDispatchCutoffMissing",
};


function shorten(value, head = 18, tail = 12) {
  const text = String(value || "");
  if (!text) return "—";
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}


function formatDateTime(value) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString();
}


function Capability({ label, value, variant = "secondary" }) {
  return (
    <div className="DfctAdminAnchorExecution-capability">
      <span>{label}</span>
      <Badge bg={variant}>{value}</Badge>
    </div>
  );
}


function normalizedSettings(settings) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    cardanoSubmissionEnabled: Boolean(
      settings?.cardanoSubmissionEnabled
      ?? DEFAULT_SETTINGS.cardanoSubmissionEnabled
    ),
    autoDispatchEnabled: Boolean(
      settings?.autoDispatchEnabled
      ?? DEFAULT_SETTINGS.autoDispatchEnabled
    ),
  };

  for (const [key, limits] of Object.entries(NUMERIC_LIMITS)) {
    const rawValue = next[key];

    if (String(rawValue ?? "").trim() === "") return null;

    const value = Number(rawValue);

    if (
      !Number.isInteger(value)
      || value < limits.min
      || value > limits.max
    ) {
      return null;
    }

    next[key] = value;
  }

  return next;
}


function settingsKey(settings) {
  const normalized = normalizedSettings(settings);
  return normalized ? JSON.stringify(normalized) : "";
}


export default function AdminAnchorExecutionPanel({ t, anchorJobs }) {
  const initialSettings = (
    normalizedSettings(anchorJobs.settings)
    || DEFAULT_SETTINGS
  );
  const [draft, setDraft] = useState(initialSettings);
  const [autosaveState, setAutosaveState] = useState("idle");
  const [showEnableConfirmation, setShowEnableConfirmation] = useState(false);
  const [showAutoDispatchConfirmation, setShowAutoDispatchConfirmation] = useState(false);

  const draftRef = useRef(initialSettings);
  const serverSettingsRef = useRef(initialSettings);
  const initializedRef = useRef(Boolean(anchorJobs.settings));
  const saveTimerRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const queuedSettingsRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    anchorJobs.loadSettings();
  }, [anchorJobs.loadSettings]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!anchorJobs.settings) return;

    const nextSettings = normalizedSettings(anchorJobs.settings);
    if (!nextSettings) return;

    serverSettingsRef.current = nextSettings;

    if (!initializedRef.current) {
      initializedRef.current = true;
      draftRef.current = nextSettings;
      setDraft(nextSettings);
      setAutosaveState("idle");
      return;
    }

    const hasLocalWork = Boolean(
      saveTimerRef.current
      || saveInFlightRef.current
      || queuedSettingsRef.current
    );

    if (!hasLocalWork) {
      draftRef.current = nextSettings;
      setDraft(nextSettings);
    }
  }, [anchorJobs.settings]);

  const flushSaveQueue = useCallback(async () => {
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;

    try {
      while (mountedRef.current && queuedSettingsRef.current) {
        const nextSettings = queuedSettingsRef.current;
        queuedSettingsRef.current = null;
        setAutosaveState("saving");

        const payload = await anchorJobs.saveSettings(nextSettings, {
          showSuccessToast: false,
        });

        if (!mountedRef.current) return;

        if (!payload) {
          queuedSettingsRef.current = null;
          draftRef.current = serverSettingsRef.current;
          setDraft(serverSettingsRef.current);
          setAutosaveState("error");
          return;
        }

        const persisted = normalizedSettings(payload.settings || nextSettings);
        if (!persisted) {
          queuedSettingsRef.current = null;
          draftRef.current = serverSettingsRef.current;
          setDraft(serverSettingsRef.current);
          setAutosaveState("error");
          return;
        }

        serverSettingsRef.current = persisted;

        const currentDraft = normalizedSettings(draftRef.current);

        if (!currentDraft) {
          setAutosaveState("invalid");
        } else if (settingsKey(currentDraft) !== settingsKey(persisted)) {
          queuedSettingsRef.current = currentDraft;
          setAutosaveState("pending");
        } else {
          draftRef.current = persisted;
          setDraft(persisted);
          setAutosaveState("saved");
        }
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, [anchorJobs.saveSettings]);

  const queueSave = useCallback((nextDraft, { immediate = false } = {}) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const normalized = normalizedSettings(nextDraft);

    if (!normalized) {
      queuedSettingsRef.current = null;
      setAutosaveState("invalid");
      return;
    }

    if (settingsKey(normalized) === settingsKey(serverSettingsRef.current)) {
      queuedSettingsRef.current = null;
      setAutosaveState("saved");
      return;
    }

    queuedSettingsRef.current = normalized;
    setAutosaveState("pending");

    if (immediate) {
      void flushSaveQueue();
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushSaveQueue();
    }, 700);
  }, [flushSaveQueue]);

  const updateDraft = useCallback((key, value, options) => {
    const nextDraft = {
      ...draftRef.current,
      [key]: value,
    };

    draftRef.current = nextDraft;
    setDraft(nextDraft);
    queueSave(nextDraft, options);
  }, [queueSave]);

  const toggleSubmission = (enabled) => {
    if (enabled) {
      setShowEnableConfirmation(true);
      return;
    }

    updateDraft("cardanoSubmissionEnabled", false, { immediate: true });
  };

  const toggleAutoDispatch = (enabled) => {
    if (enabled) {
      setShowAutoDispatchConfirmation(true);
      return;
    }

    updateDraft("autoDispatchEnabled", false, { immediate: true });
  };

  const autosaveText = {
    idle: t("adminAnchorJobs.settingsAutosaveHint"),
    pending: t("adminAnchorJobs.settingsAutosavePending"),
    saving: t("adminAnchorJobs.settingsAutosaveSaving"),
    saved: t("adminAnchorJobs.settingsAutosaveSaved"),
    invalid: t("adminAnchorJobs.settingsAutosaveInvalid"),
    error: t("adminAnchorJobs.settingsAutosaveError"),
  }[anchorJobs.settingsSaving ? "saving" : autosaveState];

  const capabilities = anchorJobs.capabilities || {};
  const rollout = anchorJobs.autoDispatchRollout || {};
  const rolloutCutoff = Number(rollout.activationCutoffAnchorJobId);
  const rolloutConfigured = Boolean(
    Number.isInteger(rolloutCutoff)
    && rolloutCutoff >= 0
    && rollout.activatedAt
  );
  const rolloutEnabled = Boolean(draft.autoDispatchEnabled);

  let rolloutStatus = {
    text: t("adminAnchorJobs.autoDispatchRolloutReady"),
    variant: "secondary",
  };

  if (rolloutEnabled && rolloutConfigured) {
    rolloutStatus = {
      text: t("adminAnchorJobs.autoDispatchRolloutProtected"),
      variant: "success",
    };
  } else if (rolloutEnabled) {
    rolloutStatus = {
      text: t("adminAnchorJobs.autoDispatchRolloutSaving"),
      variant: "warning",
    };
  } else if (rolloutConfigured) {
    rolloutStatus = {
      text: t("adminAnchorJobs.autoDispatchRolloutPaused"),
      variant: "secondary",
    };
  }

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
            onSubmit={(event) => {
              event.preventDefault();
              queueSave(draftRef.current, { immediate: true });
            }}
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
                onChange={(event) => toggleAutoDispatch(event.target.checked)}
              />
            </div>

            <div className="DfctAdminAnchorExecution-rollout">
              <div className="DfctAdminAnchorExecution-rolloutHeader">
                <div>
                  <span>{t("adminAnchorJobs.autoDispatchRolloutEyebrow")}</span>
                  <strong>{t("adminAnchorJobs.autoDispatchRolloutTitle")}</strong>
                </div>
                <Badge bg={rolloutStatus.variant}>{rolloutStatus.text}</Badge>
              </div>

              <p>
                {rolloutEnabled && rolloutConfigured
                  ? t("adminAnchorJobs.autoDispatchRolloutActiveDescription", { cutoff: rolloutCutoff })
                  : rolloutConfigured
                    ? t("adminAnchorJobs.autoDispatchRolloutPausedDescription", { cutoff: rolloutCutoff })
                    : t("adminAnchorJobs.autoDispatchRolloutReadyDescription")}
              </p>

              {rolloutConfigured && (
                <div className="DfctAdminAnchorExecution-rolloutGrid">
                  <div>
                    <span>{t("adminAnchorJobs.autoDispatchRolloutPolicy")}</span>
                    <strong>{t("adminAnchorJobs.autoDispatchRolloutPolicyNewJobs")}</strong>
                  </div>
                  <div>
                    <span>{t("adminAnchorJobs.autoDispatchRolloutCutoff")}</span>
                    <strong>#{rolloutCutoff}</strong>
                  </div>
                  <div>
                    <span>{t("adminAnchorJobs.autoDispatchRolloutActivatedAt")}</span>
                    <strong>{formatDateTime(rollout.activatedAt)}</strong>
                  </div>
                  <div>
                    <span>{t("adminAnchorJobs.autoDispatchRolloutDeactivatedAt")}</span>
                    <strong>{formatDateTime(rollout.deactivatedAt)}</strong>
                  </div>
                </div>
              )}
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
                    event.target.value,
                  )}
                  onBlur={() => queueSave(
                    draftRef.current,
                    { immediate: true },
                  )}
                />
                <Form.Text className="DfctAdminAnchorExecution-helpText">
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
                    event.target.value,
                  )}
                  onBlur={() => queueSave(
                    draftRef.current,
                    { immediate: true },
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
                    event.target.value,
                  )}
                  onBlur={() => queueSave(
                    draftRef.current,
                    { immediate: true },
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
                    event.target.value,
                  )}
                  onBlur={() => queueSave(
                    draftRef.current,
                    { immediate: true },
                  )}
                />
              </Form.Group>
            </div>

            <div
              className={`DfctAdminAnchorExecution-autosave is-${
                anchorJobs.settingsSaving ? "saving" : autosaveState
              }`}
              aria-live="polite"
            >
              {(anchorJobs.settingsSaving || autosaveState === "saving") && (
                <Spinner animation="border" size="sm" />
              )}
              <span>{autosaveText}</span>
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
        className="DfctAdminAnchorExecution-modal"
      >
        <Modal.Header>
          <Modal.Title>
            {t("adminAnchorJobs.enableSubmissionConfirmTitle")}
          </Modal.Title>
          <button
            type="button"
            className="DfctAdminAnchorExecution-modalClose"
            aria-label={t("adminAnchorJobs.close")}
            onClick={() => setShowEnableConfirmation(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </Modal.Header>

        <Modal.Body>
          <p>{t("adminAnchorJobs.enableSubmissionConfirmText")}</p>
          <Alert
            variant="warning"
            className="DfctAdminAnchorExecution-modalAlert is-warning"
          >
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
              updateDraft("cardanoSubmissionEnabled", true, { immediate: true });
              setShowEnableConfirmation(false);
            }}
          >
            {t("adminAnchorJobs.enableSubmission")}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showAutoDispatchConfirmation}
        onHide={() => setShowAutoDispatchConfirmation(false)}
        centered
        className="DfctAdminAnchorExecution-modal"
      >
        <Modal.Header>
          <Modal.Title>{t("adminAnchorJobs.enableAutoDispatchConfirmTitle")}</Modal.Title>
          <button
            type="button"
            className="DfctAdminAnchorExecution-modalClose"
            aria-label={t("adminAnchorJobs.close")}
            onClick={() => setShowAutoDispatchConfirmation(false)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </Modal.Header>

        <Modal.Body>
          <p>{t("adminAnchorJobs.enableAutoDispatchConfirmText")}</p>
          <Alert
            variant="success"
            className="DfctAdminAnchorExecution-modalAlert is-success"
          >
            {t("adminAnchorJobs.enableAutoDispatchBacklogProtection")}
          </Alert>
          <Alert
            variant="warning"
            className="DfctAdminAnchorExecution-modalAlert is-warning"
          >
            {t("adminAnchorJobs.enableAutoDispatchConfirmWarning")}
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowAutoDispatchConfirmation(false)}
          >
            {t("adminAnchorJobs.cancel")}
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              updateDraft("autoDispatchEnabled", true, { immediate: true });
              setShowAutoDispatchConfirmation(false);
            }}
          >
            {t("adminAnchorJobs.enableAutoDispatch")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
