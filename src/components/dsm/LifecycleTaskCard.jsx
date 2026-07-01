import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TOPIC_STATUS_KEYS = {
  0: "proposed",
  1: "reviewed",
  2: "active",
  3: "closed",
  4: "rejected",
  5: "draft",
};

const TASK_STATE_KEYS = {
  open: "available",
  assigned: "inQueue",
  completed: "completed",
  expired: "expired",
  cancelled: "cancelled",
};

const REVIEW_DECISION_KEYS = {
  1: "approved",
  4: "rejected",
};

function formatDate(value) {
  if (!value) return null;

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function topicInitials(title) {
  return String(title || "d-FCT")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "DF";
}

export default function LifecycleTaskCard({
  task,
  mode = "available",
  actionTaskId,
  highlighted = false,
  onAccept,
  children,
}) {
  const { t } = useTranslation();

  const topic = task.topic || {};
  const taskId = task.taskId;
  const topicId = topic.topicId;
  const topicUserId = topic.proposedBy;
  const isBusy = actionTaskId === taskId;

  const taskStateKey = TASK_STATE_KEYS[task.status] || "available";
  const topicStatusKey = TOPIC_STATUS_KEYS[topic.status] || "proposed";
  const reviewDecisionKey =
    mode === "completed" ? REVIEW_DECISION_KEYS[topic.status] : null;
  const hasCover = Boolean(topic.coverUrl);
  const isVideoCover = topic.coverContentType === "video";
  const formattedDate = formatDate(task.createdAt);

  const showBreakdownLink = Boolean(topicId && topicUserId);
  const rewardAmount = Number(topic.rewardAmount || 0);

  return (
    <Card
      className={`DsmTaskCard DsmTaskCard--${mode} DsmTaskCard--${taskStateKey}${
        highlighted ? " DsmTaskCard--highlighted" : ""
      }`}
    >
      <Card.Body>
        <div className="DsmTaskCard-shell">
          <div className="DsmTaskCard-media">
            {hasCover && isVideoCover ? (
              <video
                src={topic.coverUrl}
                muted
                playsInline
                preload="metadata"
                aria-label={topic.coverTitle || topic.title}
              />
            ) : hasCover ? (
              <img
                src={topic.coverUrl}
                alt={topic.coverTitle || topic.title}
                loading="lazy"
              />
            ) : (
              <div className="DsmTaskCard-mediaFallback" aria-hidden="true">
                <span>{topicInitials(topic.title)}</span>
              </div>
            )}

            <div className="DsmTaskCard-mediaShade" />
            <span className="DsmTaskCard-mediaLabel">
              {hasCover
                ? isVideoCover
                  ? t("topicReview.mediaVideo")
                  : t("topicReview.mediaImage")
                : t("topicReview.mediaFallback")}
            </span>
          </div>

          <div className="DsmTaskCard-main">
            <div className="DsmTaskCard-topline">
              <div>
                <span className="DsmTaskCard-eyebrow">
                  {t("topicReview.cardEyebrow")}
                </span>
                {reviewDecisionKey ? (
                  <span
                    className={`DsmTaskCard-state DsmTaskCard-state--completed DsmTaskCard-reviewDecision DsmTaskCard-reviewDecision--${reviewDecisionKey}`}
                  >
                    {t(`topicReview.reviewDecisions.${reviewDecisionKey}`)}
                  </span>
                ) : (
                  <span className={`DsmTaskCard-state DsmTaskCard-state--${taskStateKey}`}>
                    {t(`topicReview.taskStates.${taskStateKey}`)}
                  </span>
                )}
              </div>

              {formattedDate && (
                <span className="DsmTaskCard-date">{formattedDate}</span>
              )}
            </div>

            <Card.Title className="DsmTaskCard-title">
              {topic.title}
            </Card.Title>

            {topic.description && (
              <Card.Text className="DsmTaskCard-description">
                {topic.description}
              </Card.Text>
            )}

            <div
              className="DsmTaskCard-metaGrid"
              aria-label={t("topicReview.taskMetadata")}
            >
              <span className="DsmTaskCard-metaPill">
                <strong>{t("topicReview.topicId")}</strong>
                {topicId}
              </span>

              <span className="DsmTaskCard-metaPill">
                <strong>{t("topicReview.language")}</strong>
                {String(topic.language || "").toUpperCase()}
              </span>

              <span className="DsmTaskCard-metaPill">
                <strong>{t("topicReview.topicStatus")}</strong>
                {t(`topicReview.topicStatuses.${topicStatusKey}`)}
              </span>

              {rewardAmount > 0 && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.reward")}</strong>
                  {t("topicReview.rewardValue", { value: rewardAmount })}
                </span>
              )}
            </div>

            <div className="DsmTaskCard-actions">
              {mode === "available" && (
                <Button
                  variant="primary"
                  disabled={isBusy || !taskId}
                  onClick={() => onAccept?.(taskId)}
                >
                  {isBusy ? t("dsm.accepting") : t("topicReview.startReview")}
                </Button>
              )}

              {showBreakdownLink && (
                <Button
                  as={Link}
                  to={`/t/${topicUserId}/${topicId}`}
                  variant="outline-primary"
                >
                  {t("topicReview.viewBreakdown")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {children}
      </Card.Body>
    </Card>
  );
}
