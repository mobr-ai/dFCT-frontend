import "../../styles/TopicBreakdownPage.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Linkify from "linkify-react";
import Accordion from "react-bootstrap/Accordion";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";

const linkifyOpts = {
  defaultProtocol: "https",
  target: "_blank",
};

function claimIdFrom(claim) {
  return claim?.claim_id ?? claim?.claimId;
}

function cleanVerdictTags(rawTags) {
  if (!rawTags) return [];

  return String(rawTags)
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll('"', "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatPercent(value) {
  const normalized = Number(value || 0);
  return `${Math.round(normalized * 100)}%`;
}

function ClaimItem({
  index,
  claim,
  showEvidenceModal,
  claimSummary,
  onClaimVote,
  votingClaimId,
  canVote,
}) {
  const { t } = useTranslation();

  const claimId = claimIdFrom(claim);
  const isVoting = String(votingClaimId || "") === String(claimId || "");
  const currentUserVote = claimSummary?.currentUserVote || null;
  const agreeCount = Number(claimSummary?.agreeCount || 0);
  const disagreeCount = Number(claimSummary?.disagreeCount || 0);
  const totalVotes = Number(claimSummary?.totalVotes || agreeCount + disagreeCount);
  const agreeRatio = Number(claimSummary?.agreeRatio || 0);
  const verdictTags = cleanVerdictTags(claim.output_tags);

  const handleVote = (vote) => {
    if (!claimId || !onClaimVote) return;
    onClaimVote(claimId, vote);
  };

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

          {verdictTags.length > 0 && (
            <div className="Breakdown-content-tag-container">
              {verdictTags.map((tag, tagIndex) => (
                <div
                  key={`${claimId || index}-tag-${tagIndex}`}
                  className="Breakdown-topic-claims-tag"
                >
                  <Badge bg="secondary">{t(tag)}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="Breakdown-claim-perception-card">
            <div className="Breakdown-claim-perception-copy">
              <span className="Breakdown-claim-perception-eyebrow">
                {t("claimVerification.communityPerception")}
              </span>
              <strong>
                {totalVotes > 0
                  ? t("claimVerification.agreeRatio", {
                      percent: formatPercent(agreeRatio),
                    })
                  : t("claimVerification.noVotesYet")}
              </strong>
              <small>
                {t("claimVerification.votesCount", { count: totalVotes })}
              </small>
            </div>

            <div
              className="Breakdown-claim-perception-meter"
              aria-label={t("claimVerification.communityPerception")}
            >
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, agreeRatio * 100))}%`,
                }}
              />
            </div>

            <div className="Breakdown-claim-perception-stats">
              <span>
                {t("claimVerification.agreeCount", { count: agreeCount })}
              </span>
              <span>
                {t("claimVerification.disagreeCount", { count: disagreeCount })}
              </span>
            </div>
          </div>

          <div className="Breakdown-topic-claims-toolbar">
            <div>
              <ButtonGroup size="sm" className="Breakdown-claim-vote-group">
                <Button
                  variant={currentUserVote === "agree" ? "success" : "dark"}
                  disabled={!canVote || isVoting}
                  onClick={() => handleVote("agree")}
                  title={!canVote ? t("claimVerification.loginRequired") : undefined}
                >
                  {currentUserVote === "agree"
                    ? t("claimVerification.agreed")
                    : t("claimVerification.agree")}
                </Button>

                <Button
                  variant={currentUserVote === "disagree" ? "danger" : "dark"}
                  disabled={!canVote || isVoting}
                  onClick={() => handleVote("disagree")}
                  title={!canVote ? t("claimVerification.loginRequired") : undefined}
                >
                  {currentUserVote === "disagree"
                    ? t("claimVerification.disagreed")
                    : t("claimVerification.disagree")}
                </Button>

                <Button variant="dark" disabled>
                  {t("reviewClaim")}
                </Button>
              </ButtonGroup>
            </div>

            <div>
              <ButtonGroup size="sm">
                <Button
                  variant="success"
                  onClick={() =>
                    showEvidenceModal(t("addProEvidence"), "proEvidence", claimId)
                  }
                >
                  {t("addProEvidence")}
                </Button>

                <Button
                  variant="danger"
                  onClick={() =>
                    showEvidenceModal(t("addConEvidence"), "conEvidence", claimId)
                  }
                >
                  {t("addConEvidence")}
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
}

function ClaimList({
  content = [],
  showEvidenceModal,
  verificationSummary,
  onClaimVote,
  votingClaimId,
  canVote = false,
}) {
  const summaryByClaimId = useMemo(() => {
    const entries = Array.isArray(verificationSummary?.claims)
      ? verificationSummary.claims
      : [];

    return entries.reduce((acc, summary) => {
      if (summary?.claimId !== undefined && summary?.claimId !== null) {
        acc[String(summary.claimId)] = summary;
      }
      return acc;
    }, {});
  }, [verificationSummary]);

  return (
    <Accordion className="Breakdown-topic-claims" flush>
      {content.map((item, index) => {
        const claimId = claimIdFrom(item);

        return (
          <ClaimItem
            key={claimId || index}
            index={index}
            claim={item}
            showEvidenceModal={showEvidenceModal}
            claimSummary={summaryByClaimId[String(claimId)]}
            onClaimVote={onClaimVote}
            votingClaimId={votingClaimId}
            canVote={canVote}
          />
        );
      })}
    </Accordion>
  );
}

export default ClaimList;
