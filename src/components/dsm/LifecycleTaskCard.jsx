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

const CONTRIBUTION_STATUS_KEYS = {
  0: "proposed",
  1: "reviewed",
  2: "updated",
  3: "disputed",
  4: "rejected",
  5: "verified",
  6: "evaluated",
  7: "rewardsDistributed",
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

const BLIND_REVIEWER_CODENAMES = [
  "Proof Falcon",
  "Signal Weaver",
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
];

function firstValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    return value;
  }

  return "";
}

function boolValue(...values) {
  const value = firstValue(...values);

  return value === true || value === "true" || value === 1 || value === "1";
}

function getTaskType(task = {}) {
  return task.taskType || task.task_type || "";
}

function isContributionReviewTask(task = {}) {
  return getTaskType(task) === "contribution_review";
}

function isClaimReviewTask(task = {}) {
  return getTaskType(task) === "claim_review_curation";
}

function isTopicReviewTask(task = {}) {
  return getTaskType(task) === "topic_review";
}

function anonymousReviewerLabel(value, fallback = "Proof Falcon") {
  if (value === undefined || value === null || value === "") return fallback;

  const raw = String(value);
  const numeric = Number(raw);
  const seed = Number.isFinite(numeric)
    ? numeric
    : raw.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return BLIND_REVIEWER_CODENAMES[Math.abs(seed) % BLIND_REVIEWER_CODENAMES.length];
}

function normalizedClaimReviewFromTask(task = {}) {
  const source = task.claimReview || {};

  if (!isClaimReviewTask(task) && !source.reviewId && !task.reviewId) {
    return null;
  }

  return {
    ...source,
    reviewId: firstValue(source.reviewId, source.review_id, task.reviewId, task.review_id),
    claimId: firstValue(source.claimId, source.claim_id, task.claimId, task.claim_id),
    topicId: firstValue(source.topicId, source.topic_id, task.topicId, task.topic_id),
    topicUserId: firstValue(source.topicUserId, source.topic_user_id, task.topicUserId, task.topic_user_id),
    submittedBy: firstValue(source.submittedBy, source.submitted_by, source.userId, source.user_id),
    verdictTag: firstValue(source.verdictTag, source.verdict_tag),
    confidence: firstValue(source.confidence),
    rationale: firstValue(source.rationale, source.notes),
    reviewStatus: firstValue(source.reviewStatus, source.review_status),
    curatedForLlmContext: boolValue(source.curatedForLlmContext, source.curated_for_llm_context),
    claimStatement: firstValue(source.claimStatement, source.claim_statement, source.statement),
    topicTitle: firstValue(source.topicTitle, source.topic_title, source.topic?.title),
    topic: source.topic || null,
    createdAt: firstValue(source.createdAt, source.created_at),
    updatedAt: firstValue(source.updatedAt, source.updated_at),
  };
}

function normalizedContributionFromTask(task = {}) {
  const source = task.contribution || {};

  if (!isContributionReviewTask(task) && !source.contributionId && !task.contributionId) {
    return null;
  }

  return {
    ...source,
    contributionId: firstValue(
      source.contributionId,
      source.contribution_id,
      task.contributionId,
      task.contribution_id,
    ),
    topicId: firstValue(source.topicId, source.topic_id, task.topicId, task.topic_id),
    submittedBy: firstValue(source.submittedBy, source.submitted_by),
    status: firstValue(source.status),
    content: firstValue(source.content),
    contentType: firstValue(source.contentType, source.content_type),
    createdAt: firstValue(source.createdAt, source.created_at),
    updatedAt: firstValue(source.updatedAt, source.updated_at),
  };
}

function normalizedTopicFromTask(task = {}, claimReview = null, contribution = null) {
  const source = task.topic || claimReview?.topic || {};
  const metadataTopic = task.metadata?.topic || {};

  return {
    ...source,
    topicId: firstValue(
      source.topicId,
      source.topic_id,
      task.topicId,
      task.topic_id,
      claimReview?.topicId,
      contribution?.topicId,
      task.entityKind === "topic" ? task.entityId : "",
      task.entity_kind === "topic" ? task.entity_id : "",
      metadataTopic.topicId,
      metadataTopic.topic_id,
    ),
    proposedBy: firstValue(
      source.proposedBy,
      source.proposed_by,
      source.userId,
      source.user_id,
      task.topicUserId,
      task.topic_user_id,
      claimReview?.topicUserId,
      task.proposedBy,
      task.proposed_by,
      metadataTopic.proposedBy,
      metadataTopic.proposed_by,
    ),
    title: firstValue(
      source.title,
      source.topicTitle,
      source.topic_title,
      claimReview?.topicTitle,
      task.title,
      task.topicTitle,
      task.topic_title,
      task.entityTitle,
      task.entity_title,
      task.metadata?.title,
      task.metadata?.topicTitle,
      task.metadata?.topic_title,
      metadataTopic.title,
      metadataTopic.topicTitle,
      metadataTopic.topic_title,
    ),
    description: firstValue(
      source.description,
      source.topicDescription,
      source.topic_description,
      source.summary,
      task.description,
      task.topicDescription,
      task.topic_description,
      task.entityDescription,
      task.entity_description,
      task.metadata?.description,
      task.metadata?.topicDescription,
      task.metadata?.topic_description,
      metadataTopic.description,
      metadataTopic.topicDescription,
      metadataTopic.topic_description,
      metadataTopic.summary,
    ),
    language: firstValue(
      source.language,
      task.language,
      task.metadata?.language,
      metadataTopic.language,
    ),
    status: firstValue(source.status, task.topicStatus, task.topic_status),
    rewardAmount: firstValue(source.rewardAmount, source.reward_amount, task.rewardAmount, task.reward_amount),
    coverUrl: firstValue(
      source.coverUrl,
      source.cover_url,
      task.coverUrl,
      task.cover_url,
      task.metadata?.coverUrl,
      task.metadata?.cover_url,
      metadataTopic.coverUrl,
      metadataTopic.cover_url,
    ),
    coverContentType: firstValue(
      source.coverContentType,
      source.cover_content_type,
      task.coverContentType,
      task.cover_content_type,
      task.metadata?.coverContentType,
      task.metadata?.cover_content_type,
      metadataTopic.coverContentType,
      metadataTopic.cover_content_type,
    ),
    coverTitle: firstValue(
      source.coverTitle,
      source.cover_title,
      task.coverTitle,
      task.cover_title,
      task.metadata?.coverTitle,
      task.metadata?.cover_title,
      metadataTopic.coverTitle,
      metadataTopic.cover_title,
    ),
  };
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

function contributionPreview(content) {
  if (!content) return "";

  if (typeof content === "object") {
    return firstValue(content.description, content.summary, content.title, JSON.stringify(content));
  }

  const raw = String(content);

  try {
    const parsed = JSON.parse(raw);
    return firstValue(parsed.description, parsed.summary, parsed.title, raw);
  } catch {
    return raw;
  }
}

function formatPercent(value) {
  if (value === undefined || value === null || value === "") return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  return `${Math.round(numeric)}%`;
}

function cardEyebrowKey(task) {
  if (isClaimReviewTask(task)) return "topicReview.cardEyebrowClaimReview";
  if (isContributionReviewTask(task)) return "topicReview.cardEyebrowContribution";
  if (isTopicReviewTask(task)) return "topicReview.cardEyebrowTopicProposal";
  return "topicReview.cardEyebrow";
}

function mediaLabelKey(task, hasCover, isVideoCover) {
  if (isClaimReviewTask(task)) return hasCover ? "topicReview.mediaArticle" : "topicReview.mediaClaimReview";
  if (isContributionReviewTask(task)) return "topicReview.mediaContribution";
  if (isTopicReviewTask(task)) return hasCover ? "topicReview.mediaTopic" : "topicReview.mediaFallback";
  if (!hasCover) return "topicReview.mediaFallback";
  return isVideoCover ? "topicReview.mediaVideo" : "topicReview.mediaImage";
}

function mediaFallbackText(task, title, t) {
  if (isClaimReviewTask(task)) return t("topicReview.reviewMediaFallback");

  return topicInitials(title);
}

function completedDecisionKey({ mode, topic, claimReview }) {
  if (mode !== "completed") return null;

  if (claimReview?.reviewStatus === "accepted") return "approved";
  if (claimReview?.reviewStatus === "rejected") return "rejected";

  return REVIEW_DECISION_KEYS[topic.status] || null;
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

  const claimReview = normalizedClaimReviewFromTask(task);
  const contribution = normalizedContributionFromTask(task);
  const topic = normalizedTopicFromTask(task, claimReview, contribution);
  const taskType = getTaskType(task);

  const taskId = task.taskId ?? task.task_id ?? task.id;
  const topicId = topic.topicId;
  const topicUserId = topic.proposedBy;
  const isBusy = actionTaskId === taskId;
  const isClaimReview = Boolean(claimReview);
  const isTopicReview = isTopicReviewTask(task);

  const taskStateKey = TASK_STATE_KEYS[task.status] || "available";
  const topicStatusKey = TOPIC_STATUS_KEYS[topic.status] || "proposed";
  const contributionStatusKey = CONTRIBUTION_STATUS_KEYS[contribution?.status] || "proposed";
  const claimReviewStatusKey = claimReview?.reviewStatus || "proposed";
  const reviewDecisionKey = completedDecisionKey({ mode, topic, claimReview });
  const hasCover = Boolean(topic.coverUrl);
  const isVideoCover = topic.coverContentType === "video";
  const formattedDate = formatDate(task.createdAt || claimReview?.createdAt || contribution?.createdAt);

  const showBreakdownLink = Boolean(topicId && topicUserId);
  const rewardAmount = Number(topic.rewardAmount || 0);
  const confidence = formatPercent(claimReview?.confidence);

  const title = claimReview?.claimStatement
    || topic.title
    || (contribution
      ? t("topicReview.untitledContribution", { contributionId: contribution.contributionId })
      : t("topicReview.untitledTask", { taskId }));

  const description = claimReview?.rationale
    || topic.description
    || contributionPreview(contribution?.content);

  const reviewerLabel = claimReview
    ? t("topicReview.anonymousReviewer", {
      label: anonymousReviewerLabel(claimReview.submittedBy || claimReview.reviewId),
    })
    : "";

  return (
    <Card
      className={`DsmTaskCard DsmTaskCard--${mode} DsmTaskCard--${taskStateKey}${
        isClaimReview ? " DsmTaskCard--claimReview DsmTaskCard--reviewContent" : " DsmTaskCard--reviewContent"
      }${isTopicReview ? " DsmTaskCard--topicProposal" : ""}${highlighted ? " DsmTaskCard--highlighted" : ""}`}
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
                aria-label={topic.coverTitle || title}
              />
            ) : hasCover ? (
              <img
                src={topic.coverUrl}
                alt={topic.coverTitle || title}
                loading="lazy"
              />
            ) : (
              <div className="DsmTaskCard-mediaFallback" aria-hidden="true">
                <span>{mediaFallbackText(task, title, t)}</span>
              </div>
            )}

            <div className="DsmTaskCard-mediaShade" />
            <span className="DsmTaskCard-mediaLabel">
              {t(mediaLabelKey(task, hasCover, isVideoCover))}
            </span>
          </div>

          <div className="DsmTaskCard-main">
            <div className="DsmTaskCard-topline">
              <div>
                <span className="DsmTaskCard-eyebrow">
                  {t(cardEyebrowKey(task))}
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

            {isClaimReview && topic.title && (
              <div className="DsmTaskCard-topicContext">
                <span>{t("topicReview.sourceArticle")}</span>
                <strong>{topic.title}</strong>
              </div>
            )}

            <Card.Title className="DsmTaskCard-title">
              {title}
            </Card.Title>

            {isClaimReview && (
              <div className="DsmTaskCard-reviewSnapshot">
                <div>
                  <span>{t("topicReview.reviewVerdict")}</span>
                  <strong>
                    {t(`claimVoting.verdicts.${claimReview.verdictTag}`, {
                      defaultValue: claimReview.verdictTag,
                    })}
                    {confidence ? ` · ${confidence}` : ""}
                  </strong>
                </div>

                {reviewerLabel && (
                  <div>
                    <span>{t("topicReview.reviewAuthor")}</span>
                    <strong>{reviewerLabel}</strong>
                  </div>
                )}
              </div>
            )}

            {description && (
              <Card.Text className="DsmTaskCard-description">
                {(isClaimReview || isTopicReview) && (
                  <span className="DsmTaskCard-descriptionLabel">
                    {t(isClaimReview ? "topicReview.reviewComment" : "topicReview.topicProposalSummary")}
                  </span>
                )}
                {description}
              </Card.Text>
            )}

            <div
              className="DsmTaskCard-metaGrid"
              aria-label={t("topicReview.taskMetadata")}
            >
              <span className="DsmTaskCard-metaPill">
                <strong>{t("topicReview.taskType")}</strong>
                {t(`topicReview.taskTypes.${taskType}`, { defaultValue: taskType })}
              </span>

              {isTopicReview && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.reviewStatus")}</strong>
                  {t(`topicReview.taskStates.${taskStateKey}`)}
                </span>
              )}

              {!isClaimReview && !isTopicReview && topicId && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.topicId")}</strong>
                  {topicId}
                </span>
              )}

              {!isClaimReview && !isTopicReview && topic.language && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.language")}</strong>
                  {String(topic.language || "").toUpperCase()}
                </span>
              )}

              {!isClaimReview && !isTopicReview && topic.status !== "" && topic.status !== undefined && topic.status !== null && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.topicStatus")}</strong>
                  {t(`topicReview.topicStatuses.${topicStatusKey}`)}
                </span>
              )}

              {contribution?.contributionId && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.contributionId")}</strong>
                  {contribution.contributionId}
                </span>
              )}

              {contribution && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.contributionStatus")}</strong>
                  {t(`topicReview.contributionStatuses.${contributionStatusKey}`)}
                </span>
              )}

              {isClaimReview && claimReview?.reviewStatus && (
                <span className="DsmTaskCard-metaPill">
                  <strong>{t("topicReview.reviewStatus")}</strong>
                  {t(`topicReview.claimReviewStatuses.${claimReviewStatusKey}`)}
                </span>
              )}

              {isClaimReview && claimReview?.curatedForLlmContext && (
                <span className="DsmTaskCard-metaPill DsmTaskCard-metaPill--success">
                  <strong>{t("topicReview.curatedContext")}</strong>
                  {t("topicReview.yes")}
                </span>
              )}

              {!isClaimReview && rewardAmount > 0 && (
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
