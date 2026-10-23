import "../../styles/TopicBreakdownPage.css";
import { useTranslation } from "react-i18next";
import Linkify from "linkify-react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Accordion from "react-bootstrap/Accordion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperclip,
  faSearch,
  faThumbsDown,
  faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";

const linkifyOpts = {
  defaultProtocol: "https",
  target: "_blank",
};

function normalizeClaimId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function getClaimId(claim) {
  return claim?.claim_id ?? claim?.claimId;
}

function getClaimSummary(verificationSummary, claim) {
  const claimId = normalizeClaimId(getClaimId(claim));

  return (verificationSummary?.claims || []).find(
    (item) => normalizeClaimId(item.claimId ?? item.claim_id) === claimId,
  );
}

function normalizeTags(tags) {
  if (!tags) return [];

  return String(tags)
    .replaceAll("{", "")
    .replaceAll('"', "")
    .replaceAll("}", "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function votePercent(count, total) {
  if (!total) return 0;
  return Math.round((Number(count || 0) / Number(total || 0)) * 100);
}

function actionClass(...parts) {
  return ["Breakdown-claim-actionButton", ...parts].filter(Boolean).join(" ");
}


const ClaimItem = ({
  index,
  claim,
  showEvidenceModal,
  topicId,
  claimSummary,
  onClaimVote,
  onClaimReview,
  votingClaimId,
  reviewingClaimId,
  votingEnabled,
  reviewEnabled,
}) => {
  const { t } = useTranslation();

  const claimId = getClaimId(claim);
  const normalizedClaimId = normalizeClaimId(claimId);
  const isVoting = normalizeClaimId(votingClaimId) === normalizedClaimId;
  const isReviewing = normalizeClaimId(reviewingClaimId) === normalizedClaimId;

  const agreeCount = Number(claimSummary?.agreeCount || 0);
  const disagreeCount = Number(claimSummary?.disagreeCount || 0);
  const totalVotes = Number(claimSummary?.totalVotes || agreeCount + disagreeCount);
  const currentUserVote = claimSummary?.currentUserVote || null;
  const agreePct = votePercent(agreeCount, totalVotes);
  const disagreePct = votePercent(disagreeCount, totalVotes);
  const outputTags = normalizeTags(claimSummary?.verdictTag || claim.output_tags);
  const reviewSummary = claimSummary?.reviewSummary || {};
  const totalReviews = Number(reviewSummary.totalReviews || 0);
  const latestReview = reviewSummary.latestReview || null;
  const currentUserReview = reviewSummary.currentUserReview || null;

  const contributionSummary =
    claimSummary?.contributions || {};
  const contributionCount = Number(
    contributionSummary.count || 0,
  );
  const currentUserContribution =
    contributionSummary.currentUser || {};
  const hasContributed = Boolean(
    currentUserContribution.hasContributed,
  );
  const currentUserContributionStatus =
    currentUserContribution.latest?.status || null;

  return (
    <Accordion.Item eventKey={String(index)}>
      <Accordion.Header className="Breakdown-topic-claims-header">
        <b>{claim.statement}</b>
      </Accordion.Header>

      <Accordion.Body>
        <div className="Breakdown-topic-claims-body">
          <div className="Breakdown-claim-evidence">
            <Linkify as="p" options={linkifyOpts}>
              {`${claim.pro_evidence || ""} ${claim.con_evidence || ""}`.trim()}
            </Linkify>
          </div>

          {outputTags.length > 0 && (
            <div className="Breakdown-content-tag-container">
              {outputTags.map((tag, tagIndex) => (
                <div
                  key={`${claimId || index}-tag-${tagIndex}`}
                  className="Breakdown-topic-claims-tag"
                >
                  <Badge bg="secondary">{t(tag)}</Badge>
                </div>
              ))}
            </div>
          )}

          <div
            className="Breakdown-claim-perception"
            aria-label={t("claimVoting.communityPerception")}
          >
            <div className="Breakdown-claim-perceptionHeader">
              <span>{t("claimVoting.communityPerception")}</span>
              <small>{t("claimVoting.totalVotes", { count: totalVotes })}</small>
            </div>

            <div className="Breakdown-claim-perceptionBar" aria-hidden="true">
              <span
                className="Breakdown-claim-perceptionAgree"
                style={{ width: `${agreePct}%` }}
              />
              <span
                className="Breakdown-claim-perceptionDisagree"
                style={{ width: `${disagreePct}%` }}
              />
            </div>

            <div className="Breakdown-claim-perceptionLegend">
              <span>{t("claimVoting.agreePercent", { percent: agreePct })}</span>
              <span>{t("claimVoting.disagreePercent", { percent: disagreePct })}</span>
            </div>
          </div>

          {(totalReviews > 0 || currentUserReview) && (
            <div className="Breakdown-claim-reviewSummary">
              <div className="Breakdown-claim-reviewSummaryHeader">
                <span>{t("claimVoting.structuredReviews")}</span>
                <small>{t("claimVoting.totalReviews", { count: totalReviews })}</small>
              </div>

              <div className="Breakdown-claim-reviewSummaryGrid">
                {latestReview?.verdictTag && (
                  <span>
                    <strong>{t("claimVoting.latestReview")}:</strong>{" "}
                    {t(`claimVoting.verdicts.${latestReview.verdictTag}`)}
                  </span>
                )}

                {currentUserReview?.verdictTag && (
                  <span>
                    <strong>{t("claimVoting.yourReview")}:</strong>{" "}
                    {t(`claimVoting.verdicts.${currentUserReview.verdictTag}`)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="Breakdown-topic-claims-toolbar">
            <div className="Breakdown-claim-actionCluster Breakdown-claim-actionCluster--primary">
              <Button
                variant="link"
                disabled={!votingEnabled || isVoting || !claimId}
                aria-pressed={currentUserVote === "agree"}
                onClick={() => onClaimVote?.(claimId, "agree")}
                className={actionClass(
                  "Breakdown-claim-voteButton",
                  "is-agree",
                  currentUserVote === "agree" && "is-active",
                )}
              >
                <FontAwesomeIcon icon={faThumbsUp} />
                <span>{isVoting ? t("claimVoting.saving") : t("claimVoting.agree")}</span>
                <span className="Breakdown-claim-voteCount">{agreeCount}</span>
              </Button>

              <Button
                variant="link"
                disabled={!votingEnabled || isVoting || !claimId}
                aria-pressed={currentUserVote === "disagree"}
                onClick={() => onClaimVote?.(claimId, "disagree")}
                className={actionClass(
                  "Breakdown-claim-voteButton",
                  "is-disagree",
                  currentUserVote === "disagree" && "is-active",
                )}
              >
                <FontAwesomeIcon icon={faThumbsDown} />
                <span>{isVoting ? t("claimVoting.saving") : t("claimVoting.disagree")}</span>
                <span className="Breakdown-claim-voteCount">{disagreeCount}</span>
              </Button>

              <Button
                variant="link"
                disabled={!reviewEnabled || isReviewing || !claimId}
                onClick={() => onClaimReview?.(claim)}
                className={actionClass("Breakdown-claim-reviewButton", "is-review")}
              >
                <FontAwesomeIcon icon={faSearch} />
                <span>
                  {isReviewing ? t("claimVoting.reviewing") : t("reviewClaim")}
                </span>
                {totalReviews > 0 && (
                  <span className="Breakdown-claim-voteCount">{totalReviews}</span>
                )}
              </Button>
            </div>

            <div className="Breakdown-claim-actionCluster Breakdown-claim-actionCluster--evidence">
              <Button
                variant="link"
                className={actionClass("is-evidence")}
                onClick={() => showEvidenceModal(claimId)}
              >
                <FontAwesomeIcon icon={faPaperclip} />
                <span>
                  {t("evidenceContribution.submitEvidence")}
                </span>
              </Button>

              {contributionCount > 0 && (
                <span className="Breakdown-claim-contributionCount">
                  {t(
                    "evidenceContribution.contributionCount",
                    { count: contributionCount },
                  )}
                </span>
              )}

              {hasContributed && (
                <span className="Breakdown-claim-contributionMine">
                  ✓ {t("evidenceContribution.youContributed")}
                  {currentUserContributionStatus && (
                    <>
                      {" · "}
                      {t(
                        `evidenceContribution.status.${currentUserContributionStatus}`,
                      )}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {!votingEnabled && (
            <small className="Breakdown-claim-votingHint">
              {t("claimVoting.activeTopicRequired")}
            </small>
          )}
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

function ClaimList({
  content = [],
  showEvidenceModal,
  topicId,
  verificationSummary,
  verificationLoading = false,
  votingClaimId,
  reviewingClaimId,
  votingEnabled = false,
  reviewEnabled = false,
  onClaimVote,
  onClaimReview,
}) {
  const { t } = useTranslation();

  if (!Array.isArray(content) || content.length === 0) return null;

  return (
    <div className="Breakdown-topic-claimsWrap">
      {verificationLoading && (
        <div className="Breakdown-claim-summaryLoading">
          {t("claimVoting.loadingSummary")}
        </div>
      )}

      <Accordion className="Breakdown-topic-claims" flush>
        {content.map((item, index) => (
          <ClaimItem
            key={item.claim_id || item.claimId || index}
            index={index}
            claim={item}
            showEvidenceModal={showEvidenceModal}
            topicId={topicId}
            claimSummary={getClaimSummary(verificationSummary, item)}
            votingClaimId={votingClaimId}
            reviewingClaimId={reviewingClaimId}
            votingEnabled={votingEnabled}
            reviewEnabled={reviewEnabled}
            onClaimVote={onClaimVote}
            onClaimReview={onClaimReview}
          />
        ))}
      </Accordion>
    </div>
  );
}

export default ClaimList;
