import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";

import { useAdminAi } from "../../hooks/useAdminAi";
import AdminSyncPill from "./AdminSyncPill";

const VIEWS = ["providers", "roles", "quickCheck", "usage"];

const FORENSIC_CAPABILITIES = [
  "multi_provider_reverse_search",
  "deeper_video_frame_search",
  "earliest_known_appearance",
  "multi_model_ensemble",
  "challenger_and_verifier_models",
  "model_influence_attribution",
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0.00";
  return numeric.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  });
}

function formatLatency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  if (numeric < 1000) return `${Math.round(numeric)} ms`;
  return `${(numeric / 1000).toFixed(1)} s`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusTone(ready, enabled = true) {
  if (!enabled) return "secondary";
  return ready ? "success" : "warning";
}

function roleLabel(roleKey, t) {
  return t(`adminAI.roles.names.${roleKey}`, {
    defaultValue: String(roleKey || "").replaceAll("_", " "),
  });
}

function capabilityLabel(capability, t) {
  return t(`adminAI.quickCheck.forensicCapabilities.${capability}`, {
    defaultValue: String(capability || "").replaceAll("_", " "),
  });
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

function ReadinessCard({ label, value, detail, ready, enabled = true }) {
  return (
    <div className="DfctAdminAI-readinessCard">
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <Badge bg={statusTone(ready, enabled)}>{value}</Badge>
    </div>
  );
}

function providerDraftFrom(provider) {
  return {
    enabled: Boolean(provider?.enabled),
    displayName: provider?.displayName || provider?.providerKey || "",
    baseUrl: provider?.baseUrl || "",
    chatModel: provider?.models?.chat || "",
    visionModel: provider?.models?.vision || "",
    reasoningModel: provider?.models?.reasoning || "",
    apiKey: "",
    clearApiKey: false,
    dirty: false,
    dirtyFields: [],
  };
}

function roleDraftFrom(role) {
  return {
    enabled: Boolean(role?.enabled),
    providerKey: role?.providerKey || "openai",
    model: role?.model || "",
    dirty: false,
  };
}

function ProviderCard({
  provider,
  draft,
  onChange,
  onTest,
  saving,
  testing,
  saveState,
  t,
}) {
  const credentialHint = String(provider.credentialHint || "").trim();
  const maskedCredentialPlaceholder = provider.credentialConfigured
    ? `${"•".repeat(16)}${credentialHint || "••••"}`
    : t("adminAI.providers.apiKeyPlaceholder");

  const credentialLabel = provider.credentialConfigured
    ? t("adminAI.providers.credentialConfigured", {
        source: provider.credentialSource || t("adminAI.providers.unknownSource"),
        hint: credentialHint || "••••",
      })
    : t("adminAI.providers.credentialMissing");

  return (
    <article className="DfctAdminAI-providerCard">
      <div className="DfctAdminAI-cardHeader">
        <div>
          <span className="DfctAdmin-eyebrow">{provider.providerKey}</span>
          <h3>{provider.displayName}</h3>
          <p>{credentialLabel}</p>
        </div>
        <Badge bg={statusTone(provider.ready, provider.enabled)}>
          {provider.enabled
            ? provider.ready
              ? t("adminAI.states.ready")
              : t("adminAI.states.needsConfiguration")
            : t("adminAI.states.disabled")}
        </Badge>
      </div>

      <Form className="DfctAdminAI-providerForm">
        <Form.Group className="DfctAdminAI-fieldCard is-toggle">
          <Form.Check
            type="switch"
            id={`provider-enabled-${provider.providerKey}`}
            label={t("adminAI.providers.enabled")}
            checked={Boolean(draft.enabled)}
            onChange={(event) =>
              onChange("enabled", event.target.checked, { immediate: true })
            }
          />
          <Form.Text>{t("adminAI.providers.enabledHelp")}</Form.Text>
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard">
          <Form.Label>{t("adminAI.providers.displayName")}</Form.Label>
          <Form.Control
            value={draft.displayName}
            maxLength={128}
            onChange={(event) => onChange("displayName", event.target.value)}
          />
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard DfctAdminAI-fieldCard--wide">
          <Form.Label>{t("adminAI.providers.baseUrl")}</Form.Label>
          <Form.Control
            value={draft.baseUrl}
            placeholder={t("adminAI.providers.baseUrlPlaceholder")}
            onChange={(event) => onChange("baseUrl", event.target.value)}
          />
          <Form.Text>{t("adminAI.providers.baseUrlHelp")}</Form.Text>
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard">
          <Form.Label>{t("adminAI.providers.chatModel")}</Form.Label>
          <Form.Control
            value={draft.chatModel}
            onChange={(event) => onChange("chatModel", event.target.value)}
          />
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard">
          <Form.Label>{t("adminAI.providers.visionModel")}</Form.Label>
          <Form.Control
            value={draft.visionModel}
            onChange={(event) => onChange("visionModel", event.target.value)}
          />
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard">
          <Form.Label>{t("adminAI.providers.reasoningModel")}</Form.Label>
          <Form.Control
            value={draft.reasoningModel}
            onChange={(event) => onChange("reasoningModel", event.target.value)}
          />
        </Form.Group>

        <Form.Group className="DfctAdminAI-fieldCard DfctAdminAI-fieldCard--wide">
          <Form.Label>{t("adminAI.providers.apiKey")}</Form.Label>
          <Form.Control
            type="password"
            autoComplete="new-password"
            value={draft.apiKey}
            placeholder={maskedCredentialPlaceholder}
            onChange={(event) => onChange("apiKey", event.target.value)}
          />
          <Form.Text>{t("adminAI.providers.apiKeyHelp")}</Form.Text>
          {provider.credentialConfigured ? (
            <Form.Check
              className="DfctAdminAI-clearCredential"
              type="checkbox"
              id={`provider-clear-key-${provider.providerKey}`}
              label={t("adminAI.providers.clearApiKey")}
              checked={Boolean(draft.clearApiKey)}
              onChange={(event) =>
                onChange("clearApiKey", event.target.checked, { immediate: true })
              }
            />
          ) : null}
        </Form.Group>
      </Form>

      <div className="DfctAdminAI-cardActions">
        <Button
          variant="outline-secondary"
          disabled={testing || saving || !provider.credentialConfigured}
          onClick={onTest}
        >
          {testing ? <Spinner animation="border" size="sm" /> : t("adminAI.actions.test")}
        </Button>
        {saveState || draft.dirty ? (
          <span
            className={`DfctAdminAI-roleSaveState is-${
              saving || saveState === "saving"
                ? "saving"
                : saveState || (draft.dirty ? "pending" : "saved")
            }`}
            aria-live="polite"
          >
            {saving || saveState === "saving"
              ? t("adminAI.providers.autoSave.saving")
              : saveState === "failed"
                ? t("adminAI.providers.autoSave.failed")
                : draft.dirty
                  ? t("adminAI.providers.autoSave.pending")
                  : t("adminAI.providers.autoSave.saved")}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function ProvidersView({ adminAi, drafts, setDrafts, t }) {
  const timersRef = useRef({});
  const desiredDraftsRef = useRef({});
  const inFlightRef = useRef({});
  const [saveStates, setSaveStates] = useState({});

  const sameProviderDraft = (left, right) =>
    Boolean(left?.enabled) === Boolean(right?.enabled) &&
    String(left?.displayName || "") === String(right?.displayName || "") &&
    String(left?.baseUrl || "") === String(right?.baseUrl || "") &&
    String(left?.chatModel || "") === String(right?.chatModel || "") &&
    String(left?.visionModel || "") === String(right?.visionModel || "") &&
    String(left?.reasoningModel || "") === String(right?.reasoningModel || "") &&
    String(left?.apiKey || "") === String(right?.apiKey || "") &&
    Boolean(left?.clearApiKey) === Boolean(right?.clearApiKey);

  const persistProvider = async (provider) => {
    const providerKey = provider.providerKey;
    if (inFlightRef.current[providerKey]) return;

    const draft = desiredDraftsRef.current[providerKey] || drafts[providerKey];
    if (!draft?.dirty) return;

    inFlightRef.current[providerKey] = true;
    setSaveStates((current) => ({ ...current, [providerKey]: "saving" }));

    const savedSnapshot = { ...draft };
    const dirtyFields = new Set(savedSnapshot.dirtyFields || []);
    const payload = {};

    if (dirtyFields.has("enabled")) payload.enabled = Boolean(savedSnapshot.enabled);
    if (dirtyFields.has("displayName")) payload.displayName = savedSnapshot.displayName;
    if (dirtyFields.has("baseUrl")) payload.baseUrl = savedSnapshot.baseUrl;

    const models = {};
    if (dirtyFields.has("chatModel")) models.chat = savedSnapshot.chatModel;
    if (dirtyFields.has("visionModel")) models.vision = savedSnapshot.visionModel;
    if (dirtyFields.has("reasoningModel")) models.reasoning = savedSnapshot.reasoningModel;
    if (Object.keys(models).length) payload.models = models;

    if (dirtyFields.has("apiKey") && savedSnapshot.apiKey.trim()) {
      payload.apiKey = savedSnapshot.apiKey.trim();
    }
    if (dirtyFields.has("clearApiKey") && savedSnapshot.clearApiKey) {
      payload.clearApiKey = true;
    }

    const response = await adminAi.saveProvider(providerKey, payload);
    inFlightRef.current[providerKey] = false;

    if (!response) {
      setSaveStates((current) => ({ ...current, [providerKey]: "failed" }));
      return;
    }

    setDrafts((current) => {
      const latest = current[providerKey];
      if (!sameProviderDraft(latest, savedSnapshot)) return current;

      const persisted = {
        ...providerDraftFrom(response.provider || provider),
        dirty: false,
        dirtyFields: [],
      };
      desiredDraftsRef.current[providerKey] = persisted;
      return { ...current, [providerKey]: persisted };
    });

    setSaveStates((current) => ({ ...current, [providerKey]: "saved" }));

    const latestDesired = desiredDraftsRef.current[providerKey];
    if (latestDesired?.dirty && !sameProviderDraft(latestDesired, savedSnapshot)) {
      window.clearTimeout(timersRef.current[providerKey]);
      timersRef.current[providerKey] = window.setTimeout(
        () => persistProvider(provider),
        0,
      );
    }
  };

  const scheduleProviderSave = (provider, draft, delayMs) => {
    const providerKey = provider.providerKey;
    desiredDraftsRef.current[providerKey] = draft;
    window.clearTimeout(timersRef.current[providerKey]);
    timersRef.current[providerKey] = window.setTimeout(
      () => persistProvider(provider),
      delayMs,
    );
  };

  const updateDraft = (provider, field, value, { immediate = false } = {}) => {
    const providerKey = provider.providerKey;
    const currentDraft = drafts[providerKey] || providerDraftFrom(provider);
    const nextDraft = {
      ...currentDraft,
      [field]: value,
      dirty: true,
      dirtyFields: Array.from(
        new Set([...(currentDraft.dirtyFields || []), field]),
      ),
    };

    setDrafts((current) => ({ ...current, [providerKey]: nextDraft }));
    setSaveStates((current) => ({ ...current, [providerKey]: "pending" }));
    scheduleProviderSave(provider, nextDraft, immediate ? 0 : 700);
  };

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <section className="DfctAdmin-section">
      <div className="DfctAdmin-sectionHeader">
        <span className="DfctAdmin-eyebrow">{t("adminAI.providers.eyebrow")}</span>
        <h2>{t("adminAI.providers.title")}</h2>
        <p>{t("adminAI.providers.subtitle")}</p>
      </div>

      <div className="DfctAdminAI-providerGrid">
        {adminAi.providers.map((provider) => {
          const draft = drafts[provider.providerKey] || providerDraftFrom(provider);
          return (
            <ProviderCard
              key={provider.providerKey}
              provider={provider}
              draft={draft}
              onChange={(field, value, options) =>
                updateDraft(provider, field, value, options)
              }
              onTest={() => adminAi.probeProvider(provider.providerKey)}
              saving={adminAi.actionLoading === `provider:${provider.providerKey}`}
              testing={adminAi.actionLoading === `probe:${provider.providerKey}`}
              saveState={saveStates[provider.providerKey]}
              t={t}
            />
          );
        })}
      </div>
    </section>
  );
}

function RolesView({ adminAi, drafts, setDrafts, t }) {
  const providerOptions = adminAi.providers;
  const timersRef = useRef({});
  const desiredDraftsRef = useRef({});
  const inFlightRef = useRef({});
  const [saveStates, setSaveStates] = useState({});

  const sameRoleDraft = (left, right) =>
    Boolean(left?.enabled) === Boolean(right?.enabled) &&
    String(left?.providerKey || "") === String(right?.providerKey || "") &&
    String(left?.model || "") === String(right?.model || "");

  const persistRole = async (role) => {
    const roleKey = role.roleKey;
    if (inFlightRef.current[roleKey]) return;

    const draft = desiredDraftsRef.current[roleKey] || drafts[roleKey];
    if (!draft?.dirty) return;

    inFlightRef.current[roleKey] = true;
    setSaveStates((current) => ({ ...current, [roleKey]: "saving" }));

    const savedSnapshot = { ...draft };
    const response = await adminAi.saveRole(roleKey, {
      enabled: Boolean(savedSnapshot.enabled),
      providerKey: savedSnapshot.providerKey,
      model: savedSnapshot.model,
    });

    inFlightRef.current[roleKey] = false;

    if (!response) {
      setSaveStates((current) => ({ ...current, [roleKey]: "failed" }));
      return;
    }

    setDrafts((current) => {
      const latest = current[roleKey];
      if (!sameRoleDraft(latest, savedSnapshot)) return current;

      const persisted = {
        ...roleDraftFrom(response.role || role),
        dirty: false,
      };
      desiredDraftsRef.current[roleKey] = persisted;
      return { ...current, [roleKey]: persisted };
    });

    setSaveStates((current) => ({ ...current, [roleKey]: "saved" }));

    const latestDesired = desiredDraftsRef.current[roleKey];
    if (latestDesired?.dirty && !sameRoleDraft(latestDesired, savedSnapshot)) {
      window.clearTimeout(timersRef.current[roleKey]);
      timersRef.current[roleKey] = window.setTimeout(() => persistRole(role), 0);
    }
  };

  const scheduleRoleSave = (role, draft, delayMs) => {
    const roleKey = role.roleKey;
    desiredDraftsRef.current[roleKey] = draft;
    window.clearTimeout(timersRef.current[roleKey]);
    timersRef.current[roleKey] = window.setTimeout(() => persistRole(role), delayMs);
  };

  const updateDraft = (role, field, value, { immediate = false } = {}) => {
    const roleKey = role.roleKey;
    const currentDraft = drafts[roleKey] || roleDraftFrom(role);
    const nextDraft = {
      ...currentDraft,
      [field]: value,
      dirty: true,
    };

    setDrafts((current) => ({ ...current, [roleKey]: nextDraft }));
    setSaveStates((current) => ({ ...current, [roleKey]: "pending" }));
    scheduleRoleSave(role, nextDraft, immediate ? 0 : 700);
  };

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <section className="DfctAdmin-section">
      <div className="DfctAdmin-sectionHeader">
        <span className="DfctAdmin-eyebrow">{t("adminAI.roles.eyebrow")}</span>
        <h2>{t("adminAI.roles.title")}</h2>
        <p>{t("adminAI.roles.subtitle")}</p>
      </div>

      <div className="DfctAdminAI-roleGrid">
        {adminAi.roles.map((role) => {
          const draft = drafts[role.roleKey] || roleDraftFrom(role);
          const saving = adminAi.actionLoading === `role:${role.roleKey}`;
          return (
            <article key={role.roleKey} className="DfctAdminAI-roleCard">
              <div className="DfctAdminAI-cardHeader">
                <div>
                  <span className="DfctAdmin-eyebrow">{role.roleKey}</span>
                  <h3>{roleLabel(role.roleKey, t)}</h3>
                  <p>{t(`adminAI.roles.descriptions.${role.roleKey}`)}</p>
                </div>
                <Badge bg={statusTone(role.ready, role.enabled)}>
                  {role.enabled
                    ? role.ready
                      ? t("adminAI.states.ready")
                      : t("adminAI.states.needsConfiguration")
                    : t("adminAI.states.disabled")}
                </Badge>
              </div>

              <Form className="DfctAdminAI-roleForm">
                <Form.Group className="DfctAdminAI-fieldCard is-toggle">
                  <Form.Check
                    type="switch"
                    id={`role-enabled-${role.roleKey}`}
                    label={t("adminAI.roles.enabled")}
                    checked={Boolean(draft.enabled)}
                    onChange={(event) =>
                      updateDraft(role, "enabled", event.target.checked, { immediate: true })
                    }
                  />
                </Form.Group>

                <Form.Group className="DfctAdminAI-fieldCard">
                  <Form.Label>{t("adminAI.roles.provider")}</Form.Label>
                  <Form.Select
                    value={draft.providerKey}
                    onChange={(event) =>
                      updateDraft(role, "providerKey", event.target.value, { immediate: true })
                    }
                  >
                    {providerOptions.map((provider) => (
                      <option key={provider.providerKey} value={provider.providerKey}>
                        {provider.displayName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="DfctAdminAI-fieldCard">
                  <Form.Label>{t("adminAI.roles.modelOverride")}</Form.Label>
                  <Form.Control
                    value={draft.model}
                    placeholder={role.effectiveModel || t("adminAI.roles.modelPlaceholder")}
                    onChange={(event) =>
                      updateDraft(role, "model", event.target.value)
                    }
                  />
                  <Form.Text>
                    {t("adminAI.roles.effectiveModel", {
                      model: role.effectiveModel || "—",
                    })}
                  </Form.Text>
                </Form.Group>
              </Form>

              <div className="DfctAdminAI-cardActions">
                <span className="DfctAdminAI-roleReadiness">
                  {role.providerReady
                    ? t("adminAI.roles.providerReady")
                    : t("adminAI.roles.providerNotReady")}
                </span>
                {saveStates[role.roleKey] || draft.dirty ? (
                  <span
                    className={`DfctAdminAI-roleSaveState is-${
                      saving || saveStates[role.roleKey] === "saving"
                        ? "saving"
                        : saveStates[role.roleKey] || (draft.dirty ? "pending" : "saved")
                    }`}
                    aria-live="polite"
                  >
                    {saving || saveStates[role.roleKey] === "saving"
                      ? t("adminAI.roles.autoSave.saving")
                      : saveStates[role.roleKey] === "failed"
                        ? t("adminAI.roles.autoSave.failed")
                        : draft.dirty
                          ? t("adminAI.roles.autoSave.pending")
                          : t("adminAI.roles.autoSave.saved")}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function QuickCheckView({ adminAi, draft, setDraft, dirty, setDirty, t }) {
  const settings = draft || {};

  const update = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const toggleCapability = (capability, enabled) => {
    const current = new Set(asArray(settings.forensicCapabilities));
    if (enabled) current.add(capability);
    else current.delete(capability);
    update("forensicCapabilities", Array.from(current));
  };

  const save = async () => {
    const response = await adminAi.saveQuickCheckSettings(settings);
    if (!response) return;
    setDraft(response.settings || settings);
    setDirty(false);
  };

  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.quickCheck.accessEyebrow")}</span>
          <h2>{t("adminAI.quickCheck.accessTitle")}</h2>
          <p>{t("adminAI.quickCheck.accessSubtitle")}</p>
        </div>

        <div className="DfctAdminAI-settingGrid">
          {[
            ["publicEnabled", "publicEnabled"],
            ["authenticatedEnabled", "authenticatedEnabled"],
            ["anonymousEnabled", "anonymousEnabled"],
            ["browserChannelEnabled", "browserChannelEnabled"],
            ["botGatewayEnabled", "botGatewayEnabled"],
          ].map(([field, key]) => (
            <Form.Group key={field} className="DfctAdminAI-fieldCard is-toggle">
              <Form.Check
                type="switch"
                id={`quick-check-${field}`}
                label={t(`adminAI.quickCheck.fields.${key}`)}
                checked={Boolean(settings[field])}
                onChange={(event) => update(field, event.target.checked)}
              />
              <Form.Text>{t(`adminAI.quickCheck.help.${key}`)}</Form.Text>
            </Form.Group>
          ))}
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.quickCheck.quotaEyebrow")}</span>
          <h2>{t("adminAI.quickCheck.quotaTitle")}</h2>
          <p>{t("adminAI.quickCheck.quotaSubtitle")}</p>
        </div>

        <div className="DfctAdminAI-settingGrid">
          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.anonymousTrialLimit")}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="100"
              value={settings.anonymousTrialLimit ?? 0}
              onChange={(event) => update("anonymousTrialLimit", Number(event.target.value))}
            />
            <Form.Text>{t("adminAI.quickCheck.help.anonymousTrialLimit")}</Form.Text>
          </Form.Group>

          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.replenishHours")}</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="8760"
              value={settings.anonymousReplenishIntervalHours ?? 720}
              onChange={(event) =>
                update("anonymousReplenishIntervalHours", Number(event.target.value))
              }
            />
            <Form.Text>{t("adminAI.quickCheck.help.replenishHours")}</Form.Text>
          </Form.Group>

          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.cooldownSeconds")}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="86400"
              value={settings.anonymousCooldownSeconds ?? 60}
              onChange={(event) =>
                update("anonymousCooldownSeconds", Number(event.target.value))
              }
            />
            <Form.Text>{t("adminAI.quickCheck.help.cooldownSeconds")}</Form.Text>
          </Form.Group>

          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.globalDailyCap")}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="1000000"
              value={settings.anonymousGlobalDailyCap ?? 500}
              onChange={(event) =>
                update("anonymousGlobalDailyCap", Number(event.target.value))
              }
            />
            <Form.Text>{t("adminAI.quickCheck.help.globalDailyCap")}</Form.Text>
          </Form.Group>

          <Form.Group className="DfctAdminAI-fieldCard DfctAdminAI-fieldCard--wide">
            <Form.Label>{t("adminAI.quickCheck.fields.ctaUrl")}</Form.Label>
            <Form.Control
              value={settings.ctaUrl || ""}
              onChange={(event) => update("ctaUrl", event.target.value)}
            />
            <Form.Text>{t("adminAI.quickCheck.help.ctaUrl")}</Form.Text>
          </Form.Group>
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.quickCheck.analysisEyebrow")}</span>
          <h2>{t("adminAI.quickCheck.analysisTitle")}</h2>
          <p>{t("adminAI.quickCheck.analysisSubtitle")}</p>
        </div>

        <div className="DfctAdminAI-settingGrid">
          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.defaultServiceLevel")}</Form.Label>
            <Form.Select
              value={settings.defaultServiceLevel || "full"}
              onChange={(event) => update("defaultServiceLevel", event.target.value)}
            >
              <option value="basic_draft">{t("adminAI.quickCheck.serviceLevels.basic_draft")}</option>
              <option value="full">{t("adminAI.quickCheck.serviceLevels.full")}</option>
              <option value="forensic" disabled={!settings.forensicEnabled}>
                {t("adminAI.quickCheck.serviceLevels.forensic")}
              </option>
            </Form.Select>
          </Form.Group>

          {[
            ["multiModelEnabled", "multiModelEnabled"],
            ["premiumFeaturesEnabled", "premiumFeaturesEnabled"],
            ["exactMatchReuseEnabled", "exactMatchReuseEnabled"],
          ].map(([field, key]) => (
            <Form.Group key={field} className="DfctAdminAI-fieldCard is-toggle">
              <Form.Check
                type="switch"
                id={`quick-check-${field}`}
                label={t(`adminAI.quickCheck.fields.${key}`)}
                checked={Boolean(settings[field])}
                onChange={(event) => update(field, event.target.checked)}
              />
              <Form.Text>{t(`adminAI.quickCheck.help.${key}`)}</Form.Text>
            </Form.Group>
          ))}
        </div>
      </section>

      <section className="DfctAdmin-section DfctAdminAI-forensicSection">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.quickCheck.forensicEyebrow")}</span>
          <h2>{t("adminAI.quickCheck.forensicTitle")}</h2>
          <p>{t("adminAI.quickCheck.forensicSubtitle")}</p>
        </div>

        <div className="DfctAdminAI-settingGrid">
          {[
            ["forensicEnabled", "forensicEnabled"],
            ["forensicAllowAuthenticated", "forensicAllowAuthenticated"],
            ["forensicAllowAnonymous", "forensicAllowAnonymous"],
          ].map(([field, key]) => (
            <Form.Group key={field} className="DfctAdminAI-fieldCard is-toggle">
              <Form.Check
                type="switch"
                id={`quick-check-${field}`}
                label={t(`adminAI.quickCheck.fields.${key}`)}
                checked={Boolean(settings[field])}
                disabled={field !== "forensicEnabled" && !settings.forensicEnabled}
                onChange={(event) => update(field, event.target.checked)}
              />
              <Form.Text>{t(`adminAI.quickCheck.help.${key}`)}</Form.Text>
            </Form.Group>
          ))}

          <Form.Group className="DfctAdminAI-fieldCard">
            <Form.Label>{t("adminAI.quickCheck.fields.forensicAnonymousLimit")}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="100"
              disabled={!settings.forensicEnabled || !settings.forensicAllowAnonymous}
              value={settings.forensicAnonymousLimit ?? 0}
              onChange={(event) =>
                update("forensicAnonymousLimit", Number(event.target.value))
              }
            />
            <Form.Text>{t("adminAI.quickCheck.help.forensicAnonymousLimit")}</Form.Text>
          </Form.Group>
        </div>

        <div className="DfctAdminAI-capabilityList">
          {FORENSIC_CAPABILITIES.map((capability) => (
            <Form.Check
              key={capability}
              type="checkbox"
              id={`forensic-capability-${capability}`}
              label={capabilityLabel(capability, t)}
              checked={asArray(settings.forensicCapabilities).includes(capability)}
              disabled={!settings.forensicEnabled}
              onChange={(event) => toggleCapability(capability, event.target.checked)}
            />
          ))}
        </div>
      </section>

      <div className="DfctAdminAI-stickyActions">
        <span>
          {dirty
            ? t("adminAI.quickCheck.unsaved")
            : t("adminAI.quickCheck.saved")}
        </span>
        <Button
          variant="primary"
          disabled={!dirty || adminAi.actionLoading === "quick-check"}
          onClick={save}
        >
          {adminAi.actionLoading === "quick-check" ? (
            <Spinner animation="border" size="sm" />
          ) : (
            t("adminAI.actions.saveQuickCheck")
          )}
        </Button>
      </div>
    </>
  );
}

function UsageTable({ rows, keyLabel, keyField, t }) {
  const entries = Object.entries(rows || {});
  if (!entries.length) {
    return <div className="DfctAdminAI-empty">{t("adminAI.usage.empty")}</div>;
  }

  return (
    <div className="DfctAdmin-tableWrap">
      <table className="DfctAdmin-table DfctAdminAI-usageTable">
        <thead>
          <tr>
            <th>{keyLabel}</th>
            <th>{t("adminAI.usage.columns.requests")}</th>
            <th>{t("adminAI.usage.columns.successRate")}</th>
            <th>{t("adminAI.usage.columns.tokens")}</th>
            <th>{t("adminAI.usage.columns.latency")}</th>
            <th>{t("adminAI.usage.columns.cost")}</th>
            <th>{t("adminAI.usage.columns.lastExecution")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, metrics]) => (
            <tr key={`${keyField}-${key}`}>
              <td><strong>{key}</strong></td>
              <td>{formatNumber(metrics.requests)}</td>
              <td>
                {metrics.successRate === null || metrics.successRate === undefined
                  ? "—"
                  : `${Math.round(Number(metrics.successRate) * 100)}%`}
              </td>
              <td>{formatNumber(metrics.totalTokens)}</td>
              <td>{formatLatency(metrics.averageLatencyMs)}</td>
              <td>{formatCurrency(metrics.estimatedCostUsd)}</td>
              <td>{formatDate(metrics.lastExecutionAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageView({ adminAi, t }) {
  const quickUsage = adminAi.quickCheckUsage || {};
  const serviceLevels = quickUsage.serviceLevels || {};

  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.usage.quickCheckEyebrow")}</span>
          <h2>{t("adminAI.usage.quickCheckTitle")}</h2>
          <p>{t("adminAI.usage.quickCheckSubtitle", { days: quickUsage.windowDays || 30 })}</p>
        </div>

        <div className="DfctAdmin-statGrid">
          <Stat label={t("adminAI.usage.stats.requests")} value={formatNumber(quickUsage.requests)} />
          <Stat label={t("adminAI.usage.stats.queued")} value={formatNumber(quickUsage.queued)} />
          <Stat label={t("adminAI.usage.stats.running")} value={formatNumber(quickUsage.running)} tone="info" />
          <Stat label={t("adminAI.usage.stats.succeeded")} value={formatNumber(quickUsage.succeeded)} tone="success" />
          <Stat label={t("adminAI.usage.stats.failed")} value={formatNumber(quickUsage.failed)} tone="danger" />
          <Stat
            label={t("adminAI.usage.stats.forensic")}
            value={formatNumber(serviceLevels.forensic)}
            caption={t("adminAI.usage.stats.forensicCaption")}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.usage.providerEyebrow")}</span>
          <h2>{t("adminAI.usage.providerTitle")}</h2>
          <p>{t("adminAI.usage.providerSubtitle", { days: adminAi.aiUsage.windowDays || 30 })}</p>
        </div>
        <UsageTable
          rows={adminAi.aiUsage.providers}
          keyLabel={t("adminAI.usage.columns.provider")}
          keyField="provider"
          t={t}
        />
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">{t("adminAI.usage.roleEyebrow")}</span>
          <h2>{t("adminAI.usage.roleTitle")}</h2>
          <p>{t("adminAI.usage.roleSubtitle")}</p>
        </div>
        <UsageTable
          rows={adminAi.aiUsage.roles}
          keyLabel={t("adminAI.usage.columns.role")}
          keyField="role"
          t={t}
        />
      </section>
    </>
  );
}

export default function AdminAiPanel({ t, user, showToast }) {
  const adminAi = useAdminAi(user, showToast, t);
  const [activeView, setActiveView] = useState("providers");
  const [providerDrafts, setProviderDrafts] = useState({});
  const [roleDrafts, setRoleDrafts] = useState({});
  const [quickCheckDraft, setQuickCheckDraft] = useState(null);
  const [quickCheckDirty, setQuickCheckDirty] = useState(false);

  useEffect(() => {
    setProviderDrafts((current) => {
      const next = { ...current };
      for (const provider of adminAi.providers) {
        if (!next[provider.providerKey]?.dirty) {
          next[provider.providerKey] = providerDraftFrom(provider);
        }
      }
      return next;
    });
  }, [adminAi.providers]);

  useEffect(() => {
    setRoleDrafts((current) => {
      const next = { ...current };
      for (const role of adminAi.roles) {
        if (!next[role.roleKey]?.dirty) {
          next[role.roleKey] = roleDraftFrom(role);
        }
      }
      return next;
    });
  }, [adminAi.roles]);

  useEffect(() => {
    if (!quickCheckDirty && adminAi.quickCheckSettings) {
      setQuickCheckDraft(adminAi.quickCheckSettings);
    }
  }, [adminAi.quickCheckSettings, quickCheckDirty]);

  const readiness = useMemo(() => {
    const primary = adminAi.roles.find((role) => role.roleKey === "primary");
    const challenger = adminAi.roles.find((role) => role.roleKey === "challenger");
    const forensic = adminAi.roles.find((role) => role.roleKey === "forensic");
    const gemini = adminAi.providers.find(
      (provider) => provider.providerKey === "gemini",
    );
    return { primary, challenger, forensic, gemini };
  }, [adminAi.providers, adminAi.roles]);

  if (adminAi.accessDenied) {
    return <Alert variant="danger">{t("adminAI.accessDenied")}</Alert>;
  }

  return (
    <div className="DfctAdminConsole-panel DfctAdminAI-panel">
      <div className="DfctAdmin-header">
        <div>
          <span className="DfctAdmin-eyebrow">{t("adminAI.eyebrow")}</span>
          <h1>{t("adminAI.title")}</h1>
          <p>{t("adminAI.subtitle")}</p>
        </div>
        <AdminSyncPill
          isRefreshing={adminAi.isRefreshing}
          lastUpdatedAt={adminAi.lastUpdatedAt}
          syncingLabel={t("adminAI.syncing")}
          waitingLabel={t("adminAI.syncWaiting")}
          syncedAtLabel={(time) => t("adminAI.syncedAt", { time })}
        />
      </div>

      <div className="DfctAdminAI-readinessGrid">
        <ReadinessCard
          label={t("adminAI.readiness.credentialVault")}
          value={adminAi.aiCapabilities.encryptedDatabaseCredentials ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={t("adminAI.readiness.credentialVaultHelp")}
          ready={Boolean(adminAi.aiCapabilities.encryptedDatabaseCredentials)}
        />
        <ReadinessCard
          label={t("adminAI.readiness.primary")}
          value={readiness.primary?.ready ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={readiness.primary?.effectiveModel || t("adminAI.readiness.noModel")}
          ready={Boolean(readiness.primary?.ready)}
          enabled={Boolean(readiness.primary?.enabled)}
        />
        <ReadinessCard
          label={t("adminAI.readiness.multiModel")}
          value={adminAi.aiCapabilities.multiModelReady ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={readiness.challenger?.effectiveModel || t("adminAI.readiness.noChallenger")}
          ready={Boolean(adminAi.aiCapabilities.multiModelReady)}
          enabled={Boolean(readiness.challenger?.enabled)}
        />
        <ReadinessCard
          label={t("adminAI.readiness.groundedSourceIntelligence")}
          value={adminAi.aiCapabilities.geminiGroundedSourceIntelligenceReady ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={
            readiness.gemini?.models?.vision ||
            t("adminAI.readiness.groundedSourceIntelligenceHelp")
          }
          ready={Boolean(
            adminAi.aiCapabilities.geminiGroundedSourceIntelligenceReady,
          )}
          enabled={Boolean(readiness.gemini?.enabled)}
        />
        <ReadinessCard
          label={t("adminAI.readiness.publicQuickCheck")}
          value={adminAi.quickCheckCapabilities.publicReady ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={t("adminAI.readiness.publicQuickCheckHelp")}
          ready={Boolean(adminAi.quickCheckCapabilities.publicReady)}
        />
        <ReadinessCard
          label={t("adminAI.readiness.forensic")}
          value={adminAi.quickCheckCapabilities.forensicReady ? t("adminAI.states.ready") : t("adminAI.states.notReady")}
          detail={readiness.forensic?.effectiveModel || t("adminAI.readiness.noForensic")}
          ready={Boolean(adminAi.quickCheckCapabilities.forensicReady)}
          enabled={Boolean(adminAi.quickCheckSettings?.forensicEnabled)}
        />
      </div>

      <div className="DfctAdmin-tabs nav nav-tabs DfctAdminAI-tabs" role="tablist">
        {VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            className={`nav-link ${activeView === view ? "active" : ""}`}
            onClick={() => setActiveView(view)}
            role="tab"
            aria-selected={activeView === view}
          >
            {t(`adminAI.views.${view}`)}
          </button>
        ))}
      </div>

      {adminAi.error ? <Alert variant="warning">{adminAi.error}</Alert> : null}
      {adminAi.loading && !adminAi.aiData ? (
        <div className="DfctAdminAI-loading">
          <Spinner animation="border" size="sm" />
          <span>{t("adminAI.loading")}</span>
        </div>
      ) : null}

      {activeView === "providers" ? (
        <ProvidersView
          adminAi={adminAi}
          drafts={providerDrafts}
          setDrafts={setProviderDrafts}
          t={t}
        />
      ) : null}

      {activeView === "roles" ? (
        <RolesView
          adminAi={adminAi}
          drafts={roleDrafts}
          setDrafts={setRoleDrafts}
          t={t}
        />
      ) : null}

      {activeView === "quickCheck" && quickCheckDraft ? (
        <QuickCheckView
          adminAi={adminAi}
          draft={quickCheckDraft}
          setDraft={setQuickCheckDraft}
          dirty={quickCheckDirty}
          setDirty={setQuickCheckDirty}
          t={t}
        />
      ) : null}

      {activeView === "usage" ? <UsageView adminAi={adminAi} t={t} /> : null}
    </div>
  );
}
