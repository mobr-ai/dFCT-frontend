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
    states: ["contribution_proposed", "contribution_verified", "contribution_disputed"],
    actions: ["submit_evidence", "verify_evidence", "dispute_evidence"],
    fuzzy: ["contribution", "evidence"],
  },
  {
    key: "rewards",
    icon: faTrophy,
    states: ["reward_evaluated", "reward_distributed", "reward_depleted"],
    actions: ["evaluate_reward", "distribute_reward", "deplete_reward"],
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
  return event?.anchorPayloadHash || event?.payloadHash || event?.payload_hash || "";
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

  const diffSeconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return t("dsm.audit.relativeSeconds", { count: diffSeconds });
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return t("dsm.audit.relativeMinutes", { count: diffMinutes });
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
  return t(`dsm.audit.anchorStatuses.${key}`, humanize(status || "not_requested"));
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
  if (stage.states.includes(toState) || stage.states.includes(fromState)) return true;

  return (stage.fuzzy || []).some((token) =>
    action.includes(token) ||
    toState.includes(token) ||
    fromState.includes(token) ||
    machine.includes(token) ||
    entityKind.includes(token) ||
    source.includes(token)
  );
}

function latestEventForStage(stage, events) {
  return [...events].reverse().find((event) => stageMatchesEvent(stage, event)) || null;
}

function deriveCurrentStageIndex(stages) {
  const lastCompleted = stages.reduce(
    (latest, stage, index) => (stage.event ? index : latest),
    -1,
  );

  if (lastCompleted < 0) return 0;
  if (lastCompleted >= stages.length - 1) return stages.length - 1;
  return lastCompleted + 1;
}

function deriveJourneyStatus(t, topic, stages) {
  const topicStatus = normalizeKey(topic?.status);
  const hasRejected = stages.some(
    (stage) =>
      normalizeKey(stage.event?.action) === "reject_topic" ||
      normalizeKey(stage.event?.toState) === "topic_rejected" ||
      topicStatus === "rejected" ||
      topicStatus === "topic_rejected",
  );

  if (hasRejected) return t("dsm.audit.journeyStatus.rejected");

  if (topicStatus.includes("active") || stages.some((stage) => stage.key === "activation" && stage.event)) {
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

function StageCard({ stage, index, currentStageIndex, locale }) {
  const { t } = useTranslation();
  const event = stage.event;
  const isCompleted = Boolean(event);
  const isCurrent = !isCompleted && index === currentStageIndex;
  const isLocked = !isCompleted && index > currentStageIndex;
  const hash = eventHash(event);
  const tx = event ? txUrl(event) : "";
  const source = event ? eventSource(event) : "";

  return (
    <li
      className={[
        "TopicJourney-stage",
        `TopicJourney-stage--${stage.key}`,
        index % 2 ? "is-offset" : "",
        isCompleted ? "is-completed" : "",
        isCurrent ? "is-current" : "",
        isLocked ? "is-locked" : "",
      ].filter(Boolean).join(" ")}
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
              bg={isCompleted ? anchorStatusVariant(event?.anchorStatus) : isLocked ? "secondary" : "info"}
              className="TopicJourney-badge"
            >
              {isCompleted
                ? anchorStatusLabel(t, event?.anchorStatus)
                : isLocked
                  ? t("dsm.audit.locked")
                  : t("dsm.audit.current")}
            </Badge>
          </div>

          {isCompleted ? (
            <>
              <div className="TopicJourney-transition">
                <span>{stateLabel(t, event.fromState || "initial")}</span>
                <span aria-hidden="true">→</span>
                <span>{stateLabel(t, event.toState)}</span>
              </div>

              <div className="TopicJourney-meta">
                <span>{actionLabel(t, event.action)}</span>
                {relativeEventDate(event, t) && <span>{relativeEventDate(event, t)}</span>}
                {event.actorUserId && <span>{t("dsm.audit.actorUser", { userId: event.actorUserId })}</span>}
              </div>

              <div className="TopicJourney-proof">
                {hash && (
                  <span title={hash}>
                    {t("dsm.audit.payloadHash")}: {shortHash(hash)}
                  </span>
                )}
                {source && <span>{t("dsm.audit.source")}: {humanize(source)}</span>}
                {event.anchorChain && <span>{t("dsm.audit.chain")}: {humanize(event.anchorChain)}</span>}
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
                {eventDate(event, locale) && <span>{eventDate(event, locale)}</span>}
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

export default function TopicLifecycleAuditTrail({ user, topic, topicId, limit = 50 }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || navigator.language || "en-US";
  const isAuthenticated = Boolean(user?.access_token);

  const {
    events,
    loading,
    error,
    canLoad,
    refresh,
  } = useTopicLifecycleEvents(user, topicId, {
    limit,
    enabled: isAuthenticated,
  });

  useAutoRefresh({
    enabled: canLoad,
    refresh,
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: false,
    onError: () => {},
  });

  const stages = JOURNEY_STAGES.map((stage) => ({
    ...stage,
    event: latestEventForStage(stage, events),
  }));
  const currentStageIndex = deriveCurrentStageIndex(stages);
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
