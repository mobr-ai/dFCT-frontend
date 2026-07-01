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

const CONTRIBUTION_STATUS_KEYS = {
  0: "proposed",
  1: "reviewed",
  2: "disputed",
  3: "updated",
  4: "rejected",
  5: "verified",
  6: "evaluated",
  7: "rewardsDistributed",
  8: "poolEvaluated",
};

const REVIEW_DECISION_KEYS = {
  1: "approved",
  4: "rejected",
};

function normalizeTaskType(task) {
  return String(task?.taskType || task?.task_type || "topic_review");
}

function parseContributionContent(contribution) {
  const raw = contribution?.content;

  if (!raw) return {};
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return {
      description: String(raw),
    };
  }
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function topicTitleFrom(task, topic) {
  return firstTextValue(
    topic.title,
    topic.topicTitle,
    topic.topic_title,
    topic.contentTitle,
    topic.content_title,
    topic.articleTitle,
    topic.article_title,
    task.title,
    task.topicTitle,
    task.topic_title,
    task.entityTitle,
    task.entity_title,
    task.metadata?.topicTitle,
    task.metadata?.topic_title,
    task.metadata?.topic?.title,
    task.metadata?.topic?.topicTitle,
    task.metadata?.topic?.topic_title,
  );
}

function topicDescriptionFrom(task, topic) {
  return firstTextValue(
    topic.description,
    topic.topicDescription,
    topic.topic_description,
    topic.summary,
    topic.article,
    topic.content,
    task.description,
    task.topicDescription,
    task.topic_description,
    task.entityDescription,
    task.entity_description,
    task.metadata?.topicDescription,
    task.metadata?.topic_description,
    task.metadata?.topic?.description,
    task.metadata?.topic?.topicDescription,
    task.metadata?.topic?.topic_description,
    task.metadata?.topic?.summary,
    task.metadata?.topic?.article,
  );
}

function contributionTitleFrom(task, contribution, contributionContent) {
  return firstTextValue(
    contributionContent.contentTitle,
    contributionContent.content_title,
    contributionContent.title,
    contribution.title,
    contribution.contentTitle,
    contribution.content_title,
    task.title,
    task.entityTitle,
    task.entity_title,
  );
}

function contributionDescriptionFrom(task, contribution, contributionContent) {
  return firstTextValue(
    contributionContent.description,
    contributionContent.providedContext,
    contributionContent.provided_context,
    contributionContent.statement,
    contributionContent.content,
    contributionContent.contentId,
    contributionContent.content_id,
    contribution.description,
    contribution.providedContext,
    contribution.provided_context,
    task.description,
    task.entityDescription,
    task.entity_description,
  );
}

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

  const taskType = normalizeTaskType(task);
  const isContributionReview = taskType === "contribution_review";
  const topic = task.topic || {};
  const contribution = task.contribution || {};
  const contributionContent = parseContributionContent(contribution);

  const taskId = task.taskId;
  const topicId = topic.topicId || task.topicId || contribution.topicId;
  const topicUserId = topic.proposedBy || task.topicUserId;
  const isBusy = actionTaskId === taskId;

  const taskStateKey = TASK_STATE_KEYS[task.status] || "available";
  const topicStatusKey = TOPIC_STATUS_KEYS[topic.status] || "proposed";
  const contributionStatusKey =
    CONTRIBUTION_STATUS_KEYS[contribution.status] || "proposed";
  const reviewDecisionSource = isContributionReview
    ? contribution.status
    : topic.status;
  const reviewDecisionKey =
    mode === "completed" ? REVIEW_DECISION_KEYS[reviewDecisionSource] : null;

  const mediaUrl = isContributionReview
    ? contributionContent.localUrl || contributionContent.srcUrl
    : topic.coverUrl;
  const mediaContentType = isContributionReview
    ? contributionContent.contentType
    : topic.coverContentType;
  const hasCover = Boolean(mediaUrl);
  const isVideoCover = mediaContentType === "video";
  const formattedDate = formatDate(task.createdAt);

  const showBreakdownLink = Boolean(topicId && topicUserId);
  const rewardAmount = Number(topic.rewardAmount || 0);
  const cardTitle = isContributionReview
    ? contributionTitleFrom(task, contribution, contributionContent) ||
      t("topicReview.untitledContribution", {
        contributionId: contribution.contributionId || task.entityId || taskId,
      })
    : topicTitleFrom(task, topic) ||
      t("topicReview.untitledTopic", {
        topicId: topicId || task.entityId || taskId,
      });
  const cardDescription = isContributionReview
    ? contributionDescriptionFrom(task, contribution, contributionContent)
    : topicDescriptionFrom(task, topic);
  const eyebrowKey = isContributionReview
    ? "topicReview.cardEyebrowContribution"
    : "topicReview.cardEyebrow";

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
                src={mediaUrl}
                muted
                playsInline
                preload="metadata"
                aria-label={contributionContent.contentTitle || topic.coverTitle || cardTitle}
              />
            ) : hasCover ? (
              <img
                src={mediaUrl}
                alt={topic.coverTitle || topic.title}
                loading="lazy"
              />
            ) : (
              <div className="DsmTaskCard-mediaFallback" aria-hidden="true">
                <span>{topicInitials(cardTitle)}</span>
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
                  {t(eyebrowKey)}
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
              {cardTitle}
            </Card.Title>

            {cardDescription && (
              <Card.Text className="DsmTaskCard-description">
                {cardDescription}
              </Card.Text>
            )}

            <div
              className="DsmTaskCard-metaGrid"
              aria-label={t("topicReview.taskMetadata")}
            >
              <span className="DsmTaskCard-metaPill">
                <strong>{t("topicReview.taskType")}</strong>
                {t(`dsm.taskTypes.${taskType}`)}
              </span>

              {topicId && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.topicId")}</strong>
                  {topicId}
                </span>
              )}

              {isContributionReview && contribution.contributionId && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.contributionId")}</strong>
                  {contribution.contributionId}
                </span>
              )}

              {isContributionReview && contribution.submittedBy && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.submittedBy")}</strong>
                  {contribution.submittedBy}
                </span>
              )}

              {isContributionReview && contributionContent.contentType && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.contentType")}</strong>
                  {String(contributionContent.contentType).toUpperCase()}
                </span>
              )}

              {topic.language && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.language")}</strong>
                  {String(topic.language || "").toUpperCase()}
                </span>
              )}

              {isContributionReview ? (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.contributionStatus")}</strong>
                  {t(`topicReview.contributionStatuses.${contributionStatusKey}`)}
                </span>
              ) : (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.topicStatus")}</strong>
                  {t(`topicReview.topicStatuses.${topicStatusKey}`)}
                </span>
              )}

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
