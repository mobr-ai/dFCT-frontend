import { useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Offcanvas from "react-bootstrap/Offcanvas";
import Spinner from "react-bootstrap/Spinner";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArchive,
  faFileAlt,
  faShieldAlt,
  faTrophy,
  faUnlockAlt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import { CARDANO_EXPLORER_URL } from "../../chains/cardano/constants";
import { fetchPublicTopicActivityEvent, fetchTopicActivityEvent } from "../../api/topicLifecycle";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useTopicLifecycleEvents } from "../../hooks/useTopicLifecycleEvents";
import { getApiErrorMessage, useAuthRequest } from "../../hooks/useAuthRequest";

const JOURNEY_STAGES = [
  {
    key: "publication",
    icon: faFileAlt,
    states: ["topic_proposed"],
    actions: ["submit_topic"],
  },
  {
    key: "review",
    icon: faShieldAlt,
    states: ["topic_reviewed", "topic_rejected"],
    actions: ["review_topic", "reject_topic"],
  },
  {
    key: "activation",
    icon: faUnlockAlt,
    states: ["topic_active", "topic_reward_available"],
    actions: ["activate_topic", "make_reward_available"],
  },
  {
    key: "contributions",
    icon: faUsers,
    states: [
      "contrib_proposed",
      "contrib_reviewed",
      "contrib_rejected",
      "contrib_verified",
      "contrib_disputed",
      "claim_reviewed",
      "claim_review_curated",
      "claim_review_rejected",
    ],
    actions: [
      "submit_contribution",
      "review_contribution",
      "reject_contribution",
      "verify_contribution",
      "dispute_contribution",
      "review_claim",
      "curate_claim_review",
      "reject_claim_review",
    ],
    fuzzy: ["contribution", "evidence", "claim_review"],
  },
  {
    key: "rewards",
    icon: faTrophy,
    states: [
      "contribution_evaluated",
      "rewards_distributed",
      "reward_evaluated",
      "reward_distributed",
      "reward_depleted",
    ],
    actions: [
      "evaluate_contribution",
      "distribute_rewards",
      "evaluate_reward",
      "distribute_reward",
      "deplete_reward",
    ],
    fuzzy: ["reward"],
  },
  {
    key: "closure",
    icon: faArchive,
    states: ["topic_closed"],
    actions: ["close_topic", "archive_topic"],
    fuzzy: ["close", "archive"],
  },
];

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const TOPIC_STATUS_BY_CODE = {
  0: "proposed",
  1: "reviewed",
  2: "active",
  3: "closed",
  4: "rejected",
  5: "draft",
};

function normalizeTopicStatus(value) {
  const key = normalizeKey(value);
  return TOPIC_STATUS_BY_CODE[key] || key;
}

function humanize(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";

  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function shortHash(value, head = 10, tail = 6) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length <= head + tail + 3) return raw;
  return `${raw.slice(0, head)}…${raw.slice(-tail)}`;
}

function eventHash(event) {
  return (
    event?.anchorEventHash ||
    event?.eventHash ||
    event?.anchorPayloadHash ||
    event?.payloadHash ||
    event?.payload_hash ||
    ""
  );
}

function eventDate(event, locale) {
  const value = event?.createdAt || event?.created_at;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale);
}

function relativeEventDate(event, t) {
  const value = event?.createdAt || event?.created_at;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffSeconds = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / 1000),
  );
  if (diffSeconds < 60)
    return t("dsm.audit.relativeSeconds", { count: diffSeconds });
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60)
    return t("dsm.audit.relativeMinutes", { count: diffMinutes });
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t("dsm.audit.relativeHours", { count: diffHours });
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 365) return t("dsm.audit.relativeDays", { count: diffDays });
  const diffYears = Math.round(diffDays / 365);
  return t("dsm.audit.relativeYears", { count: diffYears });
}

function actionLabel(t, action) {
  const key = normalizeKey(action);
  return t(`dsm.audit.actions.${key}`, humanize(action));
}

function stateLabel(t, state) {
  const key = normalizeKey(state);
  return t(`dsm.audit.states.${key}`, humanize(state));
}

function anchorStatusLabel(t, status) {
  const key = normalizeKey(status || "not_requested");
  return t(
    `dsm.audit.anchorStatuses.${key}`,
    humanize(status || "not_requested"),
  );
}

function anchorStatusVariant(status) {
  const key = normalizeKey(status || "not_requested");
  if (key === "confirmed") return "success";
  if (key === "submitted" || key === "pending") return "info";
  if (key === "failed") return "danger";
  if (key === "skipped") return "secondary";
  return "dark";
}

function txUrl(event) {
  const txHash = event?.anchorTxHash;
  const chain = normalizeKey(event?.anchorChain);
  if (!txHash || chain !== "cardano") return "";
  return `${CARDANO_EXPLORER_URL}/transaction/${txHash}`;
}

function provenanceFingerprint(event) {
  return eventHash(event);
}

function payloadFingerprint(event) {
  return event?.anchorPayloadHash || event?.payloadHash || event?.payload_hash || "";
}

function previousEventFingerprint(event) {
  return event?.previousEventHash || event?.previous_event_hash || "";
}

function provenanceFormat(event) {
  const schema = event?.envelopeSchema || event?.envelope_schema || "";
  const version =
    event?.canonicalizationVersion || event?.canonicalization_version || "";

  if (schema === "dsm-prov-event/v1") {
    return "d-FCT Provenance v1";
  }

  if (!schema && !version) return "";
  if (schema && version) return `${humanize(schema)} · ${version}`;
  return schema || version;
}

function financialEffectSource(detail, event) {
  const candidates = [
    detail?.financialEffects,
    detail?.financial_effects,
    detail?.activity?.financialEffects,
    detail?.activity?.financial_effects,
    event?.financialEffects,
    event?.financial_effects,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }

  const anchorJobs = event?.anchorJobs || event?.anchor_jobs || [];
  const latestAnchorSettlement = [...anchorJobs]
    .reverse()
    .map((job) => job?.fundingSettlement || job?.funding_settlement)
    .find(Boolean);
  const settlement =
    detail?.fundingSettlement ||
    detail?.funding_settlement ||
    detail?.activity?.fundingSettlement ||
    detail?.activity?.funding_settlement ||
    event?.fundingSettlement ||
    event?.funding_settlement ||
    latestAnchorSettlement ||
    null;

  if (!settlement) return [];

  return [
    {
      type: "cardano_anchor",
      amount:
        settlement.quotedCreditAmount ??
        settlement.quoted_credit_amount ??
        0,
      currency: settlement.currencyCode || settlement.currency_code || "DFCT",
      billingMode: settlement.billingMode || settlement.billing_mode,
      status: settlement.status,
      payerUserId: settlement.payerUserId || settlement.payer_user_id,
      ledgerEntryId:
        settlement.debitLedgerEntryId || settlement.debit_ledger_entry_id,
      settlementId: settlement.settlementId || settlement.settlement_id,
      direction: Number(
        settlement.quotedCreditAmount ?? settlement.quoted_credit_amount ?? 0,
      ) > 0
        ? "debit"
        : "neutral",
    },
  ];
}

function financialEffectLabel(t, effect) {
  const type = normalizeKey(effect?.type || effect?.action || effect?.reason);
  const labels = {
    topic_publication: "topicPublication",
    cardano_anchor: "cardanoAnchor",
    cardano_anchor_refund: "cardanoAnchorRefund",
    reward_pool_reserve: "rewardPoolReserve",
    reward_pool_award: "rewardEarned",
    reward_earned: "rewardEarned",
    reward_pool_return: "rewardReturned",
    reward_pool_release: "rewardReturned",
  };

  const key = labels[type];
  return key
    ? t(`dsm.audit.financialEffects.${key}`)
    : humanize(effect?.type || effect?.action || effect?.reason);
}

function financialEffectAmount(t, effect) {
  const billingMode = normalizeKey(effect?.billingMode || effect?.billing_mode);
  if (billingMode === "sponsored") {
    return t("dsm.audit.financialEffects.sponsored");
  }
  if (billingMode === "included") {
    return t("dsm.audit.financialEffects.included");
  }
  if (billingMode === "free") {
    return t("dsm.audit.financialEffects.free");
  }

  const amount = Number(
    effect?.amount ??
      effect?.creditAmount ??
      effect?.credit_amount ??
      effect?.quotedCreditAmount ??
      effect?.quoted_credit_amount ??
      0,
  );
  const currency = effect?.currency || effect?.currencyCode || effect?.currency_code || "DFCT";
  const direction = normalizeKey(effect?.direction);
  const sign = direction === "credit" || direction === "refund" || direction === "award"
    ? "+"
    : direction === "debit" || direction === "reserve"
      ? "−"
      : "";

  return `${sign}${Math.abs(amount).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} ${currency}`;
}

function financialEffectStatus(t, effect) {
  const status = normalizeKey(effect?.status || "settled");
  return t(`dsm.audit.financialStatuses.${status}`, humanize(status));
}

function anchoringSummary(t, event) {
  const policy = event?.anchorPolicy || event?.anchor_policy || "";
  const scope = event?.anchorScope || event?.anchor_scope || "";

  const policyLabel = policy
    ? t(`dsm.audit.anchorPolicies.${normalizeKey(policy)}`, humanize(policy))
    : "";
  const scopeLabel = scope
    ? t(`dsm.audit.anchorScopes.${normalizeKey(scope)}`, humanize(scope))
    : "";

  return [policyLabel, scopeLabel].filter(Boolean).join(" · ");
}

function isAnchorReady(event) {
  if (!event) return false;

  return Boolean(
    event.anchorReady ||
      event.anchorRecommended ||
      event.anchorPolicy ||
      event.anchorScope ||
      event.anchor_policy ||
      event.anchor_scope,
  );
}

function eventSource(event) {
  return (
    event?.metadata?.source ||
    event?.metadata?.dsm?.source ||
    event?.metadata?.dsm_source ||
    ""
  );
}

function stageMatchesEvent(stage, event) {
  const action = normalizeKey(event?.action);
  const toState = normalizeKey(event?.toState);
  const fromState = normalizeKey(event?.fromState);
  const machine = normalizeKey(event?.machine);
  const entityKind = normalizeKey(event?.entityKind);
  const source = normalizeKey(eventSource(event));

  if (stage.actions.includes(action)) return true;
  if (stage.states.includes(toState) || stage.states.includes(fromState))
    return true;

  return (stage.fuzzy || []).some(
    (token) =>
      action.includes(token) ||
      toState.includes(token) ||
      fromState.includes(token) ||
      machine.includes(token) ||
      entityKind.includes(token) ||
      source.includes(token),
  );
}

function latestEventForStage(stage, events) {
  return (
    [...events].reverse().find((event) => stageMatchesEvent(stage, event)) ||
    null
  );
}


function activityEventsForStage(stage, events, maxItems = 4) {
  return [...events]
    .filter((event) => stageMatchesEvent(stage, event))
    .reverse()
    .slice(0, maxItems);
}


function eventScope(event) {
  return normalizeKey(event?.timelineScope || event?.entityKind || "");
}


function eventScore(event) {
  const value = Number(event?.score ?? event?.inputWeight ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}


const ACTOR_CODENAMES = [
  "Proof Falcon",
  "Context Lynx",
  "Ledger Owl",
  "Truth Cartographer",
  "Evidence Fox",
  "Archive Raven",
  "Claim Sentinel",
  "Source Scout",
  "Consensus Kite",
  "Reason Heron",
  "Timeline Wolf",
  "Signal Weaver",
];


function eventMetadata(event) {
  return event?.metadata && typeof event.metadata === "object"
    ? event.metadata
    : {};
}


function metadataValue(event, keys = []) {
  const metadata = eventMetadata(event);
  const candidates = [
    metadata,
    metadata.dsm,
    metadata.claim,
    metadata.review,
    metadata.claimReview,
    metadata.claim_review,
  ].filter((item) => item && typeof item === "object");

  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return "";
}


function actorSeed(event) {
  const raw = String(
    event?.actorUserId ||
      event?.actor_user_id ||
      event?.eventId ||
      event?.event_id ||
      eventHash(event) ||
      event?.action ||
      "dfct",
  );

  return raw.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}


function blindActorCodename(event) {
  return ACTOR_CODENAMES[Math.abs(actorSeed(event)) % ACTOR_CODENAMES.length];
}


function actorLabel(t, event) {
  const action = normalizeKey(event?.action);
  const scope = eventScope(event);
  const name = blindActorCodename(event);

  if (scope === "contribution") {
    return t("dsm.audit.actors.contributorNamed", { name });
  }

  if (scope === "claim_review") {
    return t("dsm.audit.actors.claimReviewerNamed", { name });
  }

  if (action === "submit_topic") return t("dsm.audit.actors.proposer");
  if (action === "review_topic" || action === "reject_topic")
    return t("dsm.audit.actors.topicReviewerNamed", { name });

  return t("dsm.audit.actors.platform");
}


function formatPoints(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
}


function activityDetailLine(t, event) {
  const claimId = metadataValue(event, ["claimId", "claim_id"]);
  const reviewId = metadataValue(event, ["reviewId", "review_id", "claimReviewId", "claim_review_id"]);
  const verdict = metadataValue(event, ["verdict", "submittedVerdict", "submitted_verdict"]);
  const confidence = metadataValue(event, ["confidence", "scoreConfidence", "review_confidence"]);

  const parts = [];

  if (claimId) {
    parts.push(t("dsm.audit.claimReference", { claimId: shortHash(claimId, 8, 4) }));
  }

  if (reviewId) {
    parts.push(t("dsm.audit.reviewReference", { reviewId: shortHash(reviewId, 8, 4) }));
  }

  if (verdict) {
    parts.push(t("dsm.audit.verdictReference", { verdict: humanize(verdict) }));
  }

  if (confidence !== "" && confidence !== undefined && confidence !== null) {
    const numeric = Number(confidence);
    const label = Number.isFinite(numeric)
      ? numeric <= 1
        ? `${Math.round(numeric * 100)}%`
        : `${Math.round(numeric)}%`
      : String(confidence);

    parts.push(t("dsm.audit.confidenceReference", { confidence: label }));
  }

  return parts.join(" · ");
}


function activityTitle(t, event) {
  const action = normalizeKey(event?.action);
  return t(`dsm.audit.activityTitles.${action}`, actionLabel(t, action));
}


function activityDescription(t, event) {
  const action = normalizeKey(event?.action);
  const scope = eventScope(event);

  return t(
    `dsm.audit.activityDescriptions.${action}`,
    t(`dsm.audit.activityDescriptions.${scope}`, ""),
  );
}


function activityStatusLabel(t, event) {
  const action = normalizeKey(event?.action);
  return t(`dsm.audit.activityStatuses.${action}`, stateLabel(t, event?.toState));
}


function activityStatusVariant(event) {
  const action = normalizeKey(event?.action);
  const state = normalizeKey(event?.toState);

  if (
    action.includes("reject") ||
    state.includes("rejected") ||
    state.includes("disputed")
  ) {
    return "danger";
  }

  if (
    action.includes("curate") ||
    action.includes("verify") ||
    state.includes("verified") ||
    state.includes("curated")
  ) {
    return "success";
  }

  if (action.includes("review") || state.includes("reviewed")) return "info";

  return "secondary";
}


function proofReference(t, event) {
  if (event?.anchorTxHash) return t("dsm.audit.blockchainRecordReady");

  if (eventHash(event)) return t("dsm.audit.fingerprintReady");

  return "";
}


function activityEventId(event) {
  return event?.eventId || event?.event_id || "";
}


function normalizeActivityId(value) {
  if (value === undefined || value === null || value === "") return "";

  const raw = String(value).trim();
  return raw && /^\d+$/.test(raw) ? raw : "";
}


function setActivitySearchParam(searchParams, setSearchParams, eventId) {
  const nextParams = new URLSearchParams(searchParams);

  if (eventId) {
    nextParams.set("activity", String(eventId));
  } else {
    nextParams.delete("activity");
  }

  setSearchParams(nextParams, { replace: false });
}


function activityDeepLink(event) {
  const eventId = normalizeActivityId(activityEventId(event));
  const url = new URL(window.location.href);

  if (eventId) {
    url.searchParams.set("activity", eventId);
  }

  return url.toString();
}


async function copyTextToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}


function formatConfidence(value) {
  if (value === undefined || value === null || value === "") return "";

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  if (numeric <= 1) return `${Math.round(numeric * 100)}%`;
  return `${Math.round(numeric)}%`;
}


function fieldValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}


function DetailRow({ label, value, children }) {
  if (
    (value === undefined || value === null || value === "") &&
    !children
  ) {
    return null;
  }

  return (
    <div className="TopicActivityDrawer-row">
      <span>{label}</span>
      <strong>{children || fieldValue(value)}</strong>
    </div>
  );
}


function TopicActivityDetailsDrawer({
  show,
  loading,
  error,
  detail,
  onHide,
  locale,
}) {
  const { t } = useTranslation();
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const event = detail?.event || null;
  const activity = detail?.activity || {};
  const claim = activity?.claim || null;
  const claimReview = activity?.claimReview || null;
  const contribution = activity?.contribution || null;
  const content = contribution?.content || null;
  const tx = event ? txUrl(event) : "";
  const payloadHash = payloadFingerprint(event);
  const fingerprint = provenanceFingerprint(event);
  const previousFingerprint = previousEventFingerprint(event);
  const financialEffects = financialEffectSource(detail, event);
  const provenanceDetails = [
    {
      label: t("dsm.audit.dfctFingerprint"),
      value: fingerprint,
      shortValue: shortHash(fingerprint, 12, 8),
    },
    {
      label: t("dsm.audit.previousEvent"),
      value: previousFingerprint,
      shortValue: shortHash(previousFingerprint, 12, 8),
    },
    {
      label: t("dsm.audit.anchoring"),
      value: anchoringSummary(t, event),
    },
    {
      label: t("dsm.audit.provenanceFormat"),
      value: provenanceFormat(event),
    },
  ].filter((item) => item.value);
  const [activityLinkCopied, setActivityLinkCopied] = useState(false);
  const [fingerprintCopied, setFingerprintCopied] = useState(false);

  const handleCopyActivityLink = async () => {
    if (!event) return;

    await copyTextToClipboard(activityDeepLink(event));
    setActivityLinkCopied(true);

    window.setTimeout(() => {
      setActivityLinkCopied(false);
    }, 1800);
  };

  const handleCopyFingerprint = async () => {
    if (!fingerprint) return;

    await copyTextToClipboard(fingerprint);
    setFingerprintCopied(true);

    window.setTimeout(() => {
      setFingerprintCopied(false);
    }, 1800);
  };

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      className="TopicActivityDrawer"
      onTouchStart={(event) => {
        const touch = event.touches?.[0];
        if (!touch) return;

        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches?.[0];
        if (!touch) return;

        const startX = touchStartXRef.current;
        const startY = touchStartYRef.current;
        touchStartXRef.current = null;
        touchStartYRef.current = null;

        if (startX === null || startY === null) return;

        const deltaX = touch.clientX - startX;
        const deltaY = Math.abs(touch.clientY - startY);

        if (deltaX > 90 && deltaY < 70) {
          onHide?.();
        }
      }}
    >
      <Offcanvas.Header>
        <div>
          <p className="TopicActivityDrawer-eyebrow">
            {t("dsm.audit.activityDetails")}
          </p>
          <Offcanvas.Title>
            {event ? activityTitle(t, event) : t("dsm.audit.loading")}
          </Offcanvas.Title>
        </div>
      </Offcanvas.Header>

      <Button
        type="button"
        variant="light"
        className="TopicActivityDrawer-closeFloating"
        aria-label={t("dsm.audit.closeActivityDetails")}
        onClick={onHide}
      >
        ×
      </Button>

      <Offcanvas.Body>
        {loading && (
          <div className="TopicActivityDrawer-loading">
            <Spinner animation="border" size="sm" />
            <span>{t("dsm.audit.loadingActivityDetails")}</span>
          </div>
        )}

        {!loading && error && (
          <Alert variant="warning" className="TopicActivityDrawer-alert">
            {error}
          </Alert>
        )}

        {!loading && !error && event && (
          <div className="TopicActivityDrawer-content">
            <section className="TopicActivityDrawer-card TopicActivityDrawer-card--hero">
              <div>
                <span>{t("dsm.audit.activity")}</span>
                <h4>{activityTitle(t, event)}</h4>
                {activityDescription(t, event) && (
                  <p>{activityDescription(t, event)}</p>
                )}
              </div>

              <div className="TopicActivityDrawer-heroActions">
                <Badge bg={activityStatusVariant(event)}>
                  {activityStatusLabel(t, event)}
                </Badge>

                <Button
                  type="button"
                  variant="outline-light"
                  size="sm"
                  className="TopicActivityDrawer-copyLink"
                  onClick={handleCopyActivityLink}
                >
                  {activityLinkCopied
                    ? t("dsm.audit.activityLinkCopied")
                    : t("dsm.audit.copyActivityLink")}
                </Button>
              </div>
            </section>

            {claim && (
              <section className="TopicActivityDrawer-card">
                <h5>{t("dsm.audit.claim")}</h5>
                <p className="TopicActivityDrawer-quote">
                  {claim.statement || t("dsm.audit.noClaimStatement")}
                </p>
                <DetailRow label={t("dsm.audit.claimId")} value={claim.claimId} />
              </section>
            )}

            {claimReview && (
              <section className="TopicActivityDrawer-card">
                <h5>{t("dsm.audit.claimReview")}</h5>

                <DetailRow
                  label={t("dsm.audit.reviewId")}
                  value={claimReview.reviewId}
                />
                <DetailRow
                  label={t("dsm.audit.verdict")}
                  value={claimReview.verdict ? humanize(claimReview.verdict) : ""}
                />
                <DetailRow
                  label={t("dsm.audit.confidence")}
                  value={formatConfidence(claimReview.confidence)}
                />
                <DetailRow
                  label={t("dsm.audit.reviewStatus")}
                  value={claimReview.reviewStatus ? humanize(claimReview.reviewStatus) : ""}
                />
                <DetailRow
                  label={t("dsm.audit.curatedContext")}
                  value={
                    claimReview.curatedForLlmContext
                      ? t("dsm.audit.yes")
                      : t("dsm.audit.no")
                  }
                />

                {claimReview.comment && (
                  <div className="TopicActivityDrawer-note">
                    <span>{t("dsm.audit.reviewerComment")}</span>
                    <p>{claimReview.comment}</p>
                  </div>
                )}

                {claimReview.reviewNotes && (
                  <div className="TopicActivityDrawer-note">
                    <span>{t("dsm.audit.curationNotes")}</span>
                    <p>{claimReview.reviewNotes}</p>
                  </div>
                )}
              </section>
            )}

            {contribution && (
              <section className="TopicActivityDrawer-card">
                <h5>{t("dsm.audit.contribution")}</h5>

                <DetailRow
                  label={t("dsm.audit.contributionId")}
                  value={contribution.contributionId}
                />
                <DetailRow
                  label={t("dsm.audit.contributionStatus")}
                  value={contribution.status}
                />
                <DetailRow
                  label={t("dsm.audit.score")}
                  value={contribution.score}
                />

                {contribution.rationale && (
                  <div className="TopicActivityDrawer-note">
                    <span>{t("dsm.audit.rationale")}</span>
                    <p>{contribution.rationale}</p>
                  </div>
                )}

                {content && (
                  <div className="TopicActivityDrawer-contentPreview">
                    <strong>{content.contentTitle || t("dsm.audit.attachedContent")}</strong>
                    <span>{content.contentType}</span>
                    {(content.localUrl || content.sourceUrl) && (
                      <a
                        href={content.localUrl || content.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("dsm.audit.openContent")}
                      </a>
                    )}
                  </div>
                )}
              </section>
            )}

            {financialEffects.length > 0 && (
              <section className="TopicActivityDrawer-card">
                <h5>{t("dsm.audit.creditsAndFunding")}</h5>
                <div className="TopicActivityDrawer-provenanceGrid">
                  {financialEffects.map((effect, index) => (
                    <div
                      className="TopicActivityDrawer-provenanceItem"
                      key={`${effect?.type || "financial-effect"}-${index}`}
                    >
                      <span>{financialEffectLabel(t, effect)}</span>
                      <strong>{financialEffectAmount(t, effect)}</strong>
                      <small>{financialEffectStatus(t, effect)}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="TopicActivityDrawer-card TopicActivityDrawer-card--provenance">
              <div className="TopicActivityDrawer-provenanceHeader">
                <div>
                  <span>{t("dsm.audit.verifiableProvenance")}</span>
                  <h5>{t("dsm.audit.dfctFingerprintTitle")}</h5>
                  <p>{t("dsm.audit.verifiableProvenanceDescription")}</p>
                </div>

                {fingerprint && (
                  <Button
                    type="button"
                    variant="outline-light"
                    size="sm"
                    className="TopicActivityDrawer-copyLink TopicActivityDrawer-copyFingerprint"
                    onClick={handleCopyFingerprint}
                  >
                    {fingerprintCopied
                      ? t("dsm.audit.fingerprintCopied")
                      : t("dsm.audit.copyFingerprint")}
                  </Button>
                )}
              </div>

              {provenanceDetails.length > 0 ? (
                <div className="TopicActivityDrawer-provenanceGrid">
                  {provenanceDetails.map((item) => (
                    <div
                      className="TopicActivityDrawer-provenanceItem"
                      key={item.label}
                    >
                      <span>{item.label}</span>
                      <strong title={item.value}>
                        {item.shortValue || item.value}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="TopicActivityDrawer-provenancePending">
                  {t("dsm.audit.provenanceUnavailable")}
                </p>
              )}

              <div className="TopicActivityDrawer-provenanceTrail">
                <DetailRow label={t("dsm.audit.actor")} value={actorLabel(t, event)} />
                <DetailRow label={t("dsm.audit.action")} value={actionLabel(t, event.action)} />
                <DetailRow label={t("dsm.audit.createdAt")} value={eventDate(event, locale)} />
                <DetailRow label={t("dsm.audit.anchorStatus")} value={anchorStatusLabel(t, event.anchorStatus)} />

                {payloadHash && payloadHash !== fingerprint && (
                  <DetailRow label={t("dsm.audit.payloadHash")}>
                    <code>{shortHash(payloadHash, 18, 10)}</code>
                  </DetailRow>
                )}

                {event.anchorTxHash && (
                  <DetailRow label={t("dsm.audit.txHash")}>
                    {tx ? (
                      <a href={tx} target="_blank" rel="noopener noreferrer">
                        {shortHash(event.anchorTxHash, 18, 10)}
                      </a>
                    ) : (
                      <code>{shortHash(event.anchorTxHash, 18, 10)}</code>
                    )}
                  </DetailRow>
                )}
              </div>
            </section>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

function journeyHasRejected(topic, stages) {
  const topicStatus = normalizeTopicStatus(topic?.status);

  return (
    topicStatus === "rejected" ||
    topicStatus === "topic_rejected" ||
    stages.some(
      (stage) =>
        normalizeKey(stage.event?.action) === "reject_topic" ||
        normalizeKey(stage.event?.toState) === "topic_rejected",
    )
  );
}

function deriveCurrentStageIndex(stages, topic) {
  const indexOf = (key) => stages.findIndex((stage) => stage.key === key);
  const safeIndex = (key, fallback = 0) => {
    const index = indexOf(key);
    return index >= 0 ? index : fallback;
  };

  if (journeyHasRejected(topic, stages)) {
    return safeIndex("review", 0);
  }

  const topicStatus = normalizeTopicStatus(topic?.status);
  const hasStageEvent = (key) => Boolean(stages.find((stage) => stage.key === key)?.event);

  if (topicStatus === "closed" || hasStageEvent("closure")) {
    return safeIndex("closure", stages.length - 1);
  }

  if (hasStageEvent("rewards")) {
    return safeIndex("rewards", stages.length - 1);
  }

  if (
    topicStatus.includes("active") ||
    hasStageEvent("activation") ||
    hasStageEvent("contributions")
  ) {
    return safeIndex("contributions", safeIndex("activation", 0));
  }

  if (hasStageEvent("review")) {
    return safeIndex("activation", safeIndex("review", 0));
  }

  if (hasStageEvent("publication")) {
    return safeIndex("review", safeIndex("publication", 0));
  }

  return safeIndex("publication", 0);
}

function deriveJourneyStatus(t, topic, stages) {
  const topicStatus = normalizeTopicStatus(topic?.status);

  if (journeyHasRejected(topic, stages))
    return t("dsm.audit.journeyStatus.rejected");

  if (
    topicStatus.includes("active") ||
    stages.some((stage) => stage.key === "activation" && stage.event)
  ) {
    return t("dsm.audit.journeyStatus.active");
  }

  if (stages.some((stage) => stage.key === "review" && stage.event)) {
    return t("dsm.audit.journeyStatus.reviewed");
  }

  if (stages.some((stage) => stage.key === "publication" && stage.event)) {
    return t("dsm.audit.journeyStatus.proposed");
  }

  return t("dsm.audit.journeyStatus.draft");
}

function ContributionStageActivity({
  events = [],
  locale,
  isCurrent = false,
  isLocked = false,
  onSelectActivity,
}) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const boundedIndex = events.length
    ? Math.min(Math.max(activeIndex, 0), events.length - 1)
    : 0;

  const primary = events[boundedIndex] || null;
  const score = primary ? formatPoints(eventScore(primary)) : "";
  const proof = primary ? proofReference(t, primary) : "";
  const date = primary ? eventDate(primary, locale) : "";
  const details = primary ? activityDetailLine(t, primary) : "";
  const emptyState = !primary;
  const hasMultiple = events.length > 1;

  const secondaryEvents = events
    .map((activity, index) => ({ activity, index }))
    .filter((item) => item.index !== boundedIndex)
    .slice(0, 3);

  const goPrevious = (event) => {
    event?.stopPropagation?.();
    if (!hasMultiple) return;
    setActiveIndex((current) => (
      current <= 0 ? events.length - 1 : current - 1
    ));
  };

  const goNext = (event) => {
    event?.stopPropagation?.();
    if (!hasMultiple) return;
    setActiveIndex((current) => (
      current >= events.length - 1 ? 0 : current + 1
    ));
  };

  return (
    <div
      className={[
        "TopicJourney-contributionPanel",
        emptyState ? "TopicJourney-contributionPanel--empty" : "",
      ].filter(Boolean).join(" ")}
    >
      <div
        key={primary?.eventId || primary?.createdAt || "empty"}
        className="TopicJourney-contributionPrimary TopicJourney-contributionPrimary--button"
        role="button"
        tabIndex={primary ? 0 : -1}
        aria-disabled={!primary}
        onClick={() => {
          if (primary) onSelectActivity?.(primary);
        }}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            !primary ||
            !["Enter", " "].includes(event.key)
          ) {
            return;
          }

          event.preventDefault();
          onSelectActivity?.(primary);
        }}
      >
        <div className="TopicJourney-contributionMainline">
          <strong>
            {primary
              ? activityTitle(t, primary)
              : isLocked
                ? t("dsm.audit.contributionPanel.lockedTitle")
                : isCurrent
                  ? t("dsm.audit.contributionPanel.currentTitle")
                  : t("dsm.audit.contributionPanel.waitingTitle")}

            {score && (
              <span className="TopicJourney-points">
                {" "}
                +{score} {t("dsm.audit.points")}
              </span>
            )}
          </strong>

          {hasMultiple && (
            <div className="TopicJourney-contributionControls" aria-label={t("dsm.audit.activityCarousel")}>
              <button type="button" onClick={goPrevious} aria-label={t("dsm.audit.previousActivity")}>
                ‹
              </button>
              <span>{boundedIndex + 1}/{events.length}</span>
              <button type="button" onClick={goNext} aria-label={t("dsm.audit.nextActivity")}>
                ›
              </button>
            </div>
          )}
        </div>

        <p>
          {primary
            ? activityDescription(t, primary)
            : isLocked
              ? t("dsm.audit.contributionPanel.lockedDescription")
              : t("dsm.audit.contributionPanel.currentDescription")}
        </p>

        {details && (
          <small className="TopicJourney-contributionDetails">
            {details}
          </small>
        )}

        <div className="TopicJourney-signalTrack" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
          <i />
          <i />
        </div>
      </div>

      {secondaryEvents.length > 0 && (
        <div className="TopicJourney-contributionStack">
          {secondaryEvents.map(({ activity, index }) => (
            <button
              key={activity.eventId || `${activity.action}-${activity.createdAt}`}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                onSelectActivity?.(activity);
              }}
              className={`TopicJourney-contributionMini TopicJourney-contributionMini--${eventScope(activity)}`}
            >
              <strong>{activityTitle(t, activity)}</strong>
              <span>{relativeEventDate(activity, t) || actorLabel(t, activity)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="TopicJourney-contributionFooter">
        {primary ? (
          <>
            <span>
              {activityTitle(t, primary)} {t("dsm.audit.by")} {actorLabel(t, primary)}
            </span>
            {proof && <span>{proof}</span>}
            {date && <span>{date}</span>}
          </>
        ) : (
          <>
            <span>{t("dsm.audit.contributionPanel.footerPrimary")}</span>
            <span>{t("dsm.audit.contributionPanel.footerSecondary")}</span>
          </>
        )}
      </div>
    </div>
  );
}

function StageCard({
  stage,
  index,
  currentStageIndex,
  locale,
  onSelectActivity,
  isManuallyExpanded = false,
  onToggleExpanded,
}) {
  const { t } = useTranslation();
  const event = stage.event;
  const isCompleted = Boolean(event);
  const isCurrent = index === currentStageIndex;
  const isLocked = !isCurrent && !isCompleted && index > currentStageIndex;
  const hash = eventHash(event);
  const tx = event ? txUrl(event) : "";
  const source = event ? eventSource(event) : "";
  const financialEffects = financialEffectSource(null, event);
  const activityEvents = stage.activityEvents || [];
  const isContributionStage = stage.key === "contributions";
  const canExpand = !isLocked && (isCompleted || isContributionStage);
  const isStageExpanded = isCurrent || (!isLocked && isManuallyExpanded);
  const detailsId = `topic-journey-${stage.key}-details`;

  return (
    <li
      className={[
        "TopicJourney-stage",
        `TopicJourney-stage--${stage.key}`,
        index % 2 ? "is-offset" : "",
        isCompleted ? "is-completed" : "",
        isCurrent ? "is-current" : "",
        isLocked ? "is-locked" : "",
        canExpand ? "is-expandable" : "",
        isStageExpanded ? "is-expanded" : "is-collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="TopicJourney-connectorNode">
        {isCompleted ? "✓" : isLocked ? "🔒" : "•"}
      </div>

      <article className="TopicJourney-card">
        <div className="TopicJourney-icon" aria-hidden="true">
          <FontAwesomeIcon icon={stage.icon} />
        </div>

        <div className="TopicJourney-content">
          <div className="TopicJourney-cardHeader">
            <div>
              <h4>
                {t(`dsm.audit.stages.${stage.key}.title`)}
                <span>{t(`dsm.audit.stages.${stage.key}.stateHint`)}</span>
              </h4>
              <p>{t(`dsm.audit.stages.${stage.key}.description`)}</p>
            </div>

            <Badge
              bg={
                isCurrent
                  ? "info"
                  : isCompleted
                    ? anchorStatusVariant(event?.anchorStatus)
                    : isLocked
                      ? "secondary"
                      : "info"
              }
              className="TopicJourney-badge"
            >
              {isCurrent
                ? t("dsm.audit.current")
                : isCompleted
                  ? anchorStatusLabel(t, event?.anchorStatus)
                  : isLocked
                    ? t("dsm.audit.locked")
                    : t("dsm.audit.current")}
            </Badge>

            {canExpand && !isCurrent && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="TopicJourney-disclosure"
                aria-expanded={isStageExpanded}
                aria-controls={detailsId}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpanded?.(stage.key);
                }}
              >
                {isStageExpanded
                  ? t("dsm.audit.hideStageDetails")
                  : t("dsm.audit.showStageDetails")}
              </Button>
            )}
          </div>

          {isContributionStage && !isLocked ? (
            <div className="TopicJourney-stageDetails" id={detailsId}>
              <ContributionStageActivity
                events={activityEvents}
                locale={locale}
                isCurrent={isCurrent}
                isLocked={isLocked}
                onSelectActivity={onSelectActivity}
              />
            </div>
          ) : isCompleted ? (
            <div className="TopicJourney-stageDetails" id={detailsId}>
              <div className="TopicJourney-transition">
                <span>{stateLabel(t, event.fromState || "initial")}</span>
                <span aria-hidden="true">→</span>
                <span>{stateLabel(t, event.toState)}</span>
              </div>

              <div className="TopicJourney-meta">
                <span>{actionLabel(t, event.action)}</span>
                {relativeEventDate(event, t) && (
                  <span>{relativeEventDate(event, t)}</span>
                )}
                <span>{actorLabel(t, event)}</span>
              </div>

              <div className="TopicJourney-proof TopicJourney-proof--trust">
                {hash && (
                  <span className="TopicJourney-trustPill" title={hash}>
                    {t("dsm.audit.fingerprintReady")}
                  </span>
                )}
                {isAnchorReady(event) && (
                  <span className="TopicJourney-trustPill">
                    {t("dsm.audit.anchorReady")}
                  </span>
                )}
                {financialEffects.map((effect, effectIndex) => (
                  <span
                    className="TopicJourney-trustPill"
                    key={`${effect?.type || "financial-effect"}-${effectIndex}`}
                  >
                    {financialEffectLabel(t, effect)} · {financialEffectAmount(t, effect)}
                  </span>
                ))}
                {source && (
                  <span>
                    {t("dsm.audit.capturedBy")}: {humanize(source)}
                  </span>
                )}
                {event.anchorTxHash && (
                  <span title={event.anchorTxHash}>
                    {t("dsm.audit.blockchainRecord")}:{" "}
                    {tx ? (
                      <a href={tx} target="_blank" rel="noopener noreferrer">
                        {humanize(event.anchorChain || "cardano")}
                      </a>
                    ) : (
                      humanize(event.anchorChain || "cardano")
                    )}
                  </span>
                )}
                {eventDate(event, locale) && (
                  <span>{eventDate(event, locale)}</span>
                )}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="TopicJourney-openDetails"
                  onClick={() => onSelectActivity?.(event)}
                >
                  {t("dsm.audit.openActivityDetails")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="TopicJourney-pending">
              {isLocked
                ? t(`dsm.audit.stages.${stage.key}.locked`)
                : t(`dsm.audit.stages.${stage.key}.waiting`)}
            </div>
          )}
        </div>
      </article>
    </li>
  );
}

export default function TopicLifecycleAuditTrail({
  user,
  topic,
  topicId,
  limit = 50,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || navigator.language || "en-US";
  const isAuthenticated = Boolean(user?.access_token);
  const { authRequest } = useAuthRequest(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const activityParam = normalizeActivityId(searchParams.get("activity"));
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [activityDetail, setActivityDetail] = useState(null);
  const [activityDetailLoading, setActivityDetailLoading] = useState(false);
  const [activityDetailError, setActivityDetailError] = useState("");
  const [expandedStageKey, setExpandedStageKey] = useState("");

  const { events, loading, error, canLoad, refresh } = useTopicLifecycleEvents(
    user,
    topicId,
    {
      limit,
      enabled: Boolean(topicId),
    },
  );

  useAutoRefresh({
    enabled: canLoad,
    refresh: () => refresh({ silent: true }),
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: false,
    onError: () => {},
  });

  const stages = JOURNEY_STAGES.map((stage) => ({
    ...stage,
    event: latestEventForStage(stage, events),
    activityEvents: activityEventsForStage(stage, events),
  }));
  const currentStageIndex = deriveCurrentStageIndex(stages, topic);
  const journeyStatus = deriveJourneyStatus(t, topic, stages);

  const openActivityDetailById = async (eventId, { updateUrl = true } = {}) => {
    const normalizedEventId = normalizeActivityId(eventId);
    if (!normalizedEventId || !topicId) return;
    if (isAuthenticated && !authRequest) return;

    if (updateUrl) {
      setActivitySearchParam(searchParams, setSearchParams, normalizedEventId);
    }

    setActivityDetailOpen(true);
    setActivityDetailLoading(true);
    setActivityDetailError("");

    try {
      const detail = isAuthenticated
        ? await fetchTopicActivityEvent(authRequest, topicId, normalizedEventId)
        : await fetchPublicTopicActivityEvent(topicId, normalizedEventId);
      setActivityDetail(detail);
    } catch (err) {
      setActivityDetailError(
        getApiErrorMessage(err, t("dsm.audit.activityDetailsError")),
      );
    } finally {
      setActivityDetailLoading(false);
    }
  };

  const openActivityDetail = async (event) => {
    const eventId = activityEventId(event);
    await openActivityDetailById(eventId);
  };

  const closeActivityDetail = () => {
    setActivityDetailOpen(false);
    setActivityDetail(null);
    setActivityDetailError("");
    setActivitySearchParam(searchParams, setSearchParams, "");
  };

  const toggleStageExpansion = (stageKey) => {
    setExpandedStageKey((current) => (current === stageKey ? "" : stageKey));
  };

  useEffect(() => {
    setExpandedStageKey("");
  }, [topicId, currentStageIndex]);

  useEffect(() => {
    if (!activityParam || !topicId || (isAuthenticated && !authRequest)) {
      if (!activityParam && activityDetailOpen) {
        setActivityDetailOpen(false);
        setActivityDetail(null);
        setActivityDetailError("");
      }
      return;
    }

    const currentEventId = normalizeActivityId(activityDetail?.eventId || activityDetail?.event?.eventId);
    if (activityDetailOpen && currentEventId === activityParam) return;

    openActivityDetailById(activityParam, { updateUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityParam, topicId, authRequest, isAuthenticated]);


  return (
    <aside className="TopicJourney" aria-label={t("dsm.audit.title")}>
      <div className="TopicJourney-header">
        <p>{t("dsm.audit.topicBreakdown")}</p>
        <strong>
          <span>{journeyStatus}</span>
        </strong>
      </div>

      {error && (
        <Alert variant="warning" className="TopicJourney-alert">
          {error}
        </Alert>
      )}

      {!error && loading && events.length === 0 && (
        <div className="TopicJourney-loading">
          <Spinner animation="border" size="sm" />
          <span>{t("dsm.audit.loading")}</span>
        </div>
      )}

      <ol className="TopicJourney-list">
        {stages.map((stage, index) => (
          <StageCard
            key={stage.key}
            stage={stage}
            index={index}
            currentStageIndex={currentStageIndex}
            locale={locale}
            onSelectActivity={openActivityDetail}
            isManuallyExpanded={expandedStageKey === stage.key}
            onToggleExpanded={toggleStageExpansion}
          />
        ))}
      </ol>

      <TopicActivityDetailsDrawer
        show={activityDetailOpen}
        loading={activityDetailLoading}
        error={activityDetailError}
        detail={activityDetail}
        locale={locale}
        onHide={closeActivityDetail}
      />
    </aside>
  );
}
