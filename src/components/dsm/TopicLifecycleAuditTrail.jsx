import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import { useTranslation } from "react-i18next";
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
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useTopicLifecycleEvents } from "../../hooks/useTopicLifecycleEvents";

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
    event?.anchorPayloadHash || event?.payloadHash || event?.payload_hash || ""
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
  const txHash = event?.anchorTxHash;
  if (txHash) return `${t("dsm.audit.txHash")}: ${shortHash(txHash)}`;

  const hash = eventHash(event);
  if (hash) return `${t("dsm.audit.proof")}: ${shortHash(hash)}`;

  return "";
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

  const goPrevious = () => {
    if (!hasMultiple) return;
    setActiveIndex((current) => (
      current <= 0 ? events.length - 1 : current - 1
    ));
  };

  const goNext = () => {
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
        className="TopicJourney-contributionPrimary"
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
              onClick={() => setActiveIndex(index)}
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

function StageCard({ stage, index, currentStageIndex, locale }) {
  const { t } = useTranslation();
  const event = stage.event;
  const isCompleted = Boolean(event);
  const isCurrent = index === currentStageIndex;
  const isLocked = !isCurrent && !isCompleted && index > currentStageIndex;
  const hash = eventHash(event);
  const tx = event ? txUrl(event) : "";
  const source = event ? eventSource(event) : "";
  const activityEvents = stage.activityEvents || [];
  const isContributionStage = stage.key === "contributions";

  return (
    <li
      className={[
        "TopicJourney-stage",
        `TopicJourney-stage--${stage.key}`,
        index % 2 ? "is-offset" : "",
        isCompleted ? "is-completed" : "",
        isCurrent ? "is-current" : "",
        isLocked ? "is-locked" : "",
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
          </div>

          {isContributionStage ? (
            <ContributionStageActivity
              events={activityEvents}
              locale={locale}
              isCurrent={isCurrent}
              isLocked={isLocked}
            />
          ) : isCompleted ? (
            <>
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

              <div className="TopicJourney-proof">
                {hash && (
                  <span title={hash}>
                    {t("dsm.audit.payloadHash")}: {shortHash(hash)}
                  </span>
                )}
                {source && (
                  <span>
                    {t("dsm.audit.source")}: {humanize(source)}
                  </span>
                )}
                {event.anchorChain && (
                  <span>
                    {t("dsm.audit.chain")}: {humanize(event.anchorChain)}
                  </span>
                )}
                {event.anchorTxHash && (
                  <span title={event.anchorTxHash}>
                    {t("dsm.audit.txHash")}:{" "}
                    {tx ? (
                      <a href={tx} target="_blank" rel="noopener noreferrer">
                        {shortHash(event.anchorTxHash)}
                      </a>
                    ) : (
                      shortHash(event.anchorTxHash)
                    )}
                  </span>
                )}
                {eventDate(event, locale) && (
                  <span>{eventDate(event, locale)}</span>
                )}
              </div>
            </>
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

  const { events, loading, error, canLoad, refresh } = useTopicLifecycleEvents(
    user,
    topicId,
    {
      limit,
      enabled: isAuthenticated,
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

  return (
    <aside className="TopicJourney" aria-label={t("dsm.audit.title")}>
      <div className="TopicJourney-header">
        <p>{t("dsm.audit.topicBreakdown")}</p>
        <strong>
          {t("dsm.audit.statusLabel")}: <span>{journeyStatus}</span>
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
          />
        ))}
      </ol>
    </aside>
  );
}
