import "../styles/TopicBreakdownPage.css";
import "../styles/WelcomePage.css";
import "../styles/NavigationSidebar.css";
import { TopicSidebar } from "../components/topic";
import { TopicToolbar } from "../components/topic";
import { RewardPoolModal } from "../components/topic";
import TopicFinancialSummary from "../components/topic/TopicFinancialSummary";
import { EvidenceModal } from "../components/submission";
import { TopicLifecycleAuditTrail } from "../components/dsm";
import Badge from "react-bootstrap/Badge";
import LoadingPage from "./LoadingPage";
import AuthPage from "./AuthPage";
import { ContentList } from "../components/content";
import { ClaimList } from "../components/topic";
import { ContentCarousel } from "../components/content";
import i18n from "../i18n";
import { Button, Form, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUp,
  faFile,
  faFileAlt,
  faFileAudio,
  faFileImage,
  faFilePdf,
  faFileVideo,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import {
  useLoaderData,
  Await,
  useOutletContext,
  useNavigate,
} from "react-router-dom";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuthRequest } from "../hooks/useAuthRequest";
import {
  fetchTopicVerificationSummary,
  castClaimVote,
  reviewClaim,
} from "../api/claimVerification";

function isActiveTopicStatus(status) {
  return Number(status) === 2 || String(status || "").toLowerCase() === "active";
}

const CLAIM_REVIEW_VERDICTS = [
  "true",
  "mostly_true",
  "partially_true",
  "misleading",
  "false",
  "unverified",
];

function normalizeTopicClaimId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function getTopicClaimId(claim) {
  return claim?.claim_id ?? claim?.claimId;
}

function findClaimSummaryForClaim(verificationSummary, claim) {
  const claimId = normalizeTopicClaimId(getTopicClaimId(claim));

  return (verificationSummary?.claims || []).find(
    (item) => normalizeTopicClaimId(item.claimId ?? item.claim_id) === claimId,
  );
}

function ClaimReviewModal({
  show,
  onHide,
  claim,
  claimSummary,
  onSubmit,
  submitting = false,
}) {
  const { t } = useTranslation();
  const currentReview = claimSummary?.reviewSummary?.currentUserReview;

  const [verdictTag, setVerdictTag] = useState("unverified");
  const [confidence, setConfidence] = useState(50);
  const [rationale, setRationale] = useState("");

  useEffect(() => {
    if (!show) return;

    setVerdictTag(currentReview?.verdictTag || "unverified");
    setConfidence(
      currentReview?.confidence === undefined || currentReview?.confidence === null
        ? 50
        : Number(currentReview.confidence),
    );
    setRationale(currentReview?.rationale || "");
  }, [currentReview, show]);

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit?.({
      verdictTag,
      confidence: Number(confidence),
      rationale,
    });
  };

  return (
    <Modal
      show={show}
      onHide={submitting ? undefined : onHide}
      centered
      keyboard={!submitting}
      backdrop={submitting ? "static" : true}
      className="Breakdown-claim-review-modal"
      contentClassName="Breakdown-claim-review-modalContent"
    >
      <Form onSubmit={handleSubmit}>
        <Modal.Header>
          <div className="Breakdown-claim-review-heading">
            <span className="Breakdown-claim-review-modalEyebrow">
              {t("claimVoting.reviewModalEyebrow")}
            </span>
            <Modal.Title>{t("claimVoting.reviewModalTitle")}</Modal.Title>
            <p>{t("claimVoting.reviewModalSubtitle")}</p>
          </div>

          <button
            type="button"
            className="Breakdown-claim-review-close"
            aria-label={t("close")}
            onClick={onHide}
            disabled={submitting}
          >
            ×
          </button>
        </Modal.Header>

        <Modal.Body>
          {claim?.statement && (
            <div className="Breakdown-claim-review-claimBox">
              <strong>{t("claimVoting.claimUnderReview")}</strong>
              <p>{claim.statement}</p>
            </div>
          )}

          <section className="Breakdown-claim-review-section">
            <div className="Breakdown-claim-review-sectionHeader">
              <span>{t("claimVoting.verdictLabel")}</span>
              <small>{t("claimVoting.verdictHelp")}</small>
            </div>

            <div className="Breakdown-claim-review-verdictGrid">
              {CLAIM_REVIEW_VERDICTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={submitting}
                  className={[
                    "Breakdown-claim-review-verdictPill",
                    verdictTag === value && "is-selected",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setVerdictTag(value)}
                >
                  <span>{t(`claimVoting.verdicts.${value}`)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="Breakdown-claim-review-section">
            <div className="Breakdown-claim-review-sectionHeader">
              <span>{t("claimVoting.confidenceLabel")}</span>
              <strong>{t("claimVoting.confidenceValue", { value: confidence })}</strong>
            </div>

            <input
              className="Breakdown-claim-review-confidenceRange"
              type="range"
              min="0"
              max="100"
              step="1"
              value={confidence}
              disabled={submitting}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />

            <div className="Breakdown-claim-review-confidenceScale">
              <span>{t("claimVoting.confidenceLow")}</span>
              <span>{t("claimVoting.confidenceHigh")}</span>
            </div>
          </section>

          <section className="Breakdown-claim-review-section">
            <div className="Breakdown-claim-review-sectionHeader">
              <span>{t("claimVoting.rationaleLabel")}</span>
              <small>{t("claimVoting.rationaleHelp")}</small>
            </div>

            <Form.Control
              as="textarea"
              rows={4}
              maxLength={4000}
              value={rationale}
              disabled={submitting}
              placeholder={t("claimVoting.rationalePlaceholder")}
              onChange={(event) => setRationale(event.target.value)}
            />
          </section>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !verdictTag}>
            {submitting ? t("claimVoting.reviewing") : t("claimVoting.submitReview")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function TopicAuthPromptModal({ show, onHide }) {
  const { t } = useTranslation();

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      keyboard
      backdrop
      className="Breakdown-auth-modal"
      backdropClassName="Breakdown-auth-modal-backdrop"
      contentClassName="Breakdown-auth-modal-content"
    >
      <Modal.Body>
        <div className="WelcomePage Breakdown-auth-welcome-shell">
          <button
            type="button"
            className="Breakdown-auth-close"
            aria-label={t("close")}
            onClick={onHide}
          >
            ×
          </button>

          <aside className="WelcomePage-auth Breakdown-auth-card">
            <div className="WelcomePage-authHeader">
              <span>{t("welcomePage.authEyebrow")}</span>
              <h2>{t("welcomePage.authTitle")}</h2>
              <p>{t("welcomePage.authBody")}</p>
            </div>

            <AuthPage type="login" />
          </aside>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function getHashtags(
  contentList,
  jsx = false,
  limit = 5,
  onClickTag = () => {},
) {
  let tags = [
    ...new Set(
      contentList
        .map((c) => {
          return c.concept_list
            .replaceAll("'", "")
            .replaceAll('"', "")
            .replaceAll("}", "")
            .replaceAll("{", "")
            .replaceAll("-", "")
            .split(",")
            .map((s) =>
              s
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(""),
            );
        })
        .flat(),
    ),
  ].slice(0, limit);

  if (jsx) {
    return tags.map((tag) => (
      <div key={tag} className="Breakdown-topic-claims-tag">
        <Badge
          key={tag}
          className="Breakdown-hashtag"
          bg="secondary"
          onClick={() => onClickTag(tag)}
        >
          #{tag}
        </Badge>
      </div>
    ));
  }
  return tags;
}


const REFERENCE_TYPE_ICONS = {
  image: faFileImage,
  video: faFileVideo,
  audio: faFileAudio,
  pdf: faFilePdf,
  link: faFileAlt,
  document: faFileAlt,
  file: faFile,
};

const REFERENCE_EXTENSION_TYPES = {
  image: ["avif", "bmp", "gif", "heic", "jpeg", "jpg", "png", "svg", "webp"],
  video: ["m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "webm"],
  audio: ["aac", "flac", "m4a", "mp3", "ogg", "wav"],
  pdf: ["pdf"],
  document: [
    "csv",
    "doc",
    "docx",
    "json",
    "md",
    "odt",
    "ppt",
    "pptx",
    "rtf",
    "txt",
    "xls",
    "xlsx",
    "xml",
  ],
};

function referenceSourceUrl(item = {}) {
  return (
    item.src_url ||
    item.srcUrl ||
    item.original_url ||
    item.originalUrl ||
    item.source_url ||
    item.sourceUrl ||
    ""
  );
}

function referenceCandidateUrl(item = {}) {
  return (
    referenceSourceUrl(item) ||
    item.local_url ||
    item.localUrl ||
    item.url ||
    item.source ||
    ""
  );
}

function referenceKey(item, index) {
  return String(
    item?.content_id ||
      item?.contentId ||
      item?.local_url ||
      item?.localUrl ||
      item?.url ||
      item?.source_url ||
      item?.sourceUrl ||
      item?.file_name ||
      item?.fileName ||
      item?.filename ||
      `reference-${index}`,
  );
}

function referenceFileName(item = {}, index = 0) {
  const directName =
    item.title ||
    item.name ||
    item.file_name ||
    item.fileName ||
    item.filename;

  if (directName) return String(directName);

  const candidate = String(referenceCandidateUrl(item) || "");
  if (candidate) {
    try {
      const parsed = new URL(candidate, window.location.origin);
      const segment = parsed.pathname.split("/").filter(Boolean).pop();
      if (segment) return decodeURIComponent(segment);
    } catch {
      const segment = candidate.split(/[?#]/)[0].split("/").filter(Boolean).pop();
      if (segment) return decodeURIComponent(segment);
    }
  }

  return `Reference ${index + 1}`;
}

function referenceExtensionFromValue(value) {
  const candidate = String(value || "").trim().toLowerCase();
  const match = candidate.match(/\.([a-z0-9]{1,8})(?:[?#\s]|$)/);
  return match?.[1] || "";
}

function referenceExtension(item = {}) {
  const candidate = [
    item.file_name,
    item.fileName,
    item.filename,
    referenceCandidateUrl(item),
  ]
    .filter(Boolean)
    .join(" ");

  return referenceExtensionFromValue(candidate);
}

function referenceTypeFromExtension(extension) {
  for (const [type, extensions] of Object.entries(REFERENCE_EXTENSION_TYPES)) {
    if (extensions.includes(extension)) return type;
  }

  return "";
}

function referenceType(item = {}) {
  const sourceUrl = String(referenceSourceUrl(item) || "").trim();
  const sourceExtension = referenceExtensionFromValue(sourceUrl);
  const sourceFileType = referenceTypeFromExtension(sourceExtension);

  // A fetched web page can have an extracted image/video preview. The
  // reference icon should represent the source itself, not its cached preview.
  if (/^https?:\/\//i.test(sourceUrl)) {
    return sourceFileType || "link";
  }

  const explicitType = [
    item.content_type,
    item.contentType,
    item.mime_type,
    item.mimeType,
    item.media_type,
    item.mediaType,
    item.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const type of ["image", "video", "audio", "pdf"]) {
    if (explicitType.includes(type)) return type;
  }

  if (
    explicitType.includes("url") ||
    explicitType.includes("link") ||
    explicitType.includes("html")
  ) {
    return "link";
  }

  if (
    explicitType.includes("text") ||
    explicitType.includes("document") ||
    explicitType.includes("json") ||
    explicitType.includes("csv")
  ) {
    return "document";
  }

  const extension = referenceExtension(item);
  const extensionType = referenceTypeFromExtension(extension);
  if (extensionType) return extensionType;

  const candidateUrl = String(referenceCandidateUrl(item) || "");
  if (/^https?:\/\//i.test(candidateUrl)) return "link";

  return "file";
}

function normalizeReferenceContentId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function referenceContentId(item = {}) {
  return normalizeReferenceContentId(item.content_id ?? item.contentId);
}

function referenceAssessmentTone(assessment = {}) {
  const verdict = String(assessment.dominantVerdict || "").toLowerCase();

  if (["true", "mostly_true"].includes(verdict)) return "positive";
  if (["false", "misleading"].includes(verdict)) return "negative";
  if (["partially_true", "mixed"].includes(verdict)) return "mixed";
  if (verdict === "unverified") return "pending";

  if (assessment.voteLean === "agree") return "positive";
  if (assessment.voteLean === "disagree") return "negative";
  if (assessment.voteLean === "mixed") return "mixed";

  return "pending";
}

function buildReferenceAssessmentMap(
  contentList = [],
  claimList = [],
  verificationSummary = null,
) {
  const summaryByClaimId = new Map(
    (verificationSummary?.claims || []).map((summary) => [
      normalizeTopicClaimId(summary.claimId ?? summary.claim_id),
      summary,
    ]),
  );

  const claimsByContentId = new Map();

  for (const claim of claimList || []) {
    const contentId = normalizeReferenceContentId(
      claim.content_id ?? claim.contentId,
    );

    if (!contentId) continue;

    const linked = claimsByContentId.get(contentId) || [];
    linked.push(claim);
    claimsByContentId.set(contentId, linked);
  }

  const assessments = {};

  for (const content of contentList || []) {
    const contentId = referenceContentId(content);
    if (!contentId) continue;

    const linkedClaims = claimsByContentId.get(contentId) || [];
    let agreeCount = 0;
    let disagreeCount = 0;
    const curatedVerdicts = [];

    for (const claim of linkedClaims) {
      const claimId = normalizeTopicClaimId(getTopicClaimId(claim));
      const summary = summaryByClaimId.get(claimId);

      agreeCount += Number(summary?.agreeCount || 0);
      disagreeCount += Number(summary?.disagreeCount || 0);

      const curatedVerdict =
        summary?.reviewSummary?.latestCuratedReview?.verdictTag;

      if (curatedVerdict) curatedVerdicts.push(curatedVerdict);
    }

    const totalVotes = agreeCount + disagreeCount;
    const agreePercent = totalVotes
      ? Math.round((agreeCount / totalVotes) * 100)
      : 0;
    const disagreePercent = totalVotes
      ? Math.round((disagreeCount / totalVotes) * 100)
      : 0;

    const verdictCounts = curatedVerdicts.reduce((counts, verdict) => {
      counts[verdict] = (counts[verdict] || 0) + 1;
      return counts;
    }, {});

    const rankedVerdicts = Object.entries(verdictCounts).sort(
      (left, right) => right[1] - left[1],
    );

    let dominantVerdict = null;

    if (rankedVerdicts.length === 1) {
      dominantVerdict = rankedVerdicts[0][0];
    } else if (
      rankedVerdicts.length > 1 &&
      rankedVerdicts[0][1] > rankedVerdicts[1][1]
    ) {
      dominantVerdict = rankedVerdicts[0][0];
    } else if (rankedVerdicts.length > 1) {
      dominantVerdict = "mixed";
    }

    const voteLean =
      !totalVotes
        ? "pending"
        : agreePercent >= 60
          ? "agree"
          : disagreePercent >= 60
            ? "disagree"
            : "mixed";

    assessments[contentId] = {
      contentId,
      claimCount: linkedClaims.length,
      totalVotes,
      agreeCount,
      disagreeCount,
      agreePercent,
      disagreePercent,
      reviewedClaimCount: curatedVerdicts.length,
      dominantVerdict,
      voteLean,
    };
  }

  return assessments;
}

function ReferenceDesktop({
  contentList,
  refsMap,
  assessmentsByContentId,
  activeKey,
  onSelect,
  onClose,
  sectionRef,
}) {
  const { t } = useTranslation();
  const references = (contentList || []).map((item, index) => {
    const type = referenceType(item);
    return {
      item,
      index,
      key: referenceKey(item, index),
      type,
      icon: REFERENCE_TYPE_ICONS[type] || faFile,
      name: referenceFileName(item, index),
      assessment:
        assessmentsByContentId?.[referenceContentId(item)] || null,
    };
  });
  const activeReference =
    references.find((reference) => reference.key === activeKey) || null;

  return (
    <section
      ref={sectionRef}
      className="Breakdown-referenceDesktop"
      aria-labelledby="topic-references-title"
    >
      <header className="Breakdown-referenceDesktop-header">
        <div>
          <span>{t("topicReferences.eyebrow")}</span>
          <h3 id="topic-references-title">{t("topicReferences.title")}</h3>
        </div>
        <small>
          {t("topicReferences.count", { count: references.length })}
        </small>
      </header>

      <div
        className="Breakdown-referenceDesktop-grid"
        role="list"
        aria-label={t("topicReferences.desktopLabel")}
      >
        {references.map((reference) => {
          const selected = activeReference?.key === reference.key;
          return (
            <button
              key={reference.key}
              type="button"
              role="listitem"
              className={[
                "Breakdown-referenceFile",
                `is-${reference.type}`,
                selected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-expanded={selected}
              aria-controls="topic-reference-preview"
              onClick={() => onSelect(reference.key)}
              title={`${reference.name} · ${t(
                `topicReferences.types.${reference.type}`,
              )}`}
            >
              <span className="Breakdown-referenceFile-icon" aria-hidden="true">
                <FontAwesomeIcon icon={reference.icon} />
                <span
                  className={[
                    "Breakdown-referenceFile-assessment",
                    `tone-${referenceAssessmentTone(reference.assessment)}`,
                  ].join(" ")}
                />
              </span>
              <strong>{reference.name}</strong>
              <small>{t(`topicReferences.types.${reference.type}`)}</small>
            </button>
          );
        })}
      </div>

      <div
        id="topic-reference-preview"
        className={[
          "Breakdown-referencePreview",
          activeReference ? "is-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!activeReference}
      >
        <div className="Breakdown-referencePreview-collapse">
          {activeReference && (
            <article className="Breakdown-referenceWindow">
              <header className="Breakdown-referenceWindow-bar">
                <span
                  className={[
                    "Breakdown-referenceWindow-appIcon",
                    `is-${activeReference.type}`,
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <FontAwesomeIcon icon={activeReference.icon} />
                </span>
                <strong title={activeReference.name}>
                  {activeReference.name}
                </strong>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("topicReferences.closePreview")}
                  title={t("topicReferences.closePreview")}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </header>

              <div className="Breakdown-referenceWindow-body">
                <ContentList
                  content={[activeReference.item]}
                  refsMap={refsMap}
                  assessmentsByContentId={assessmentsByContentId}
                />
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function TopicDataResolver({
  parsedTopic,
  topicData,
  setTopicData,
  scrollUp,
  user,
  showToast,
  shareModalShow,
  setShareModalShow,
  evidenceModalShow,
  setEvidenceModalShow,
}) {
  useEffect(() => {
    if (parsedTopic && !topicData) {
      setTopicData(parsedTopic);
      scrollUp();
    }
  }, [parsedTopic, topicData, setTopicData, scrollUp]);

  const topicToRender = topicData || parsedTopic;

  if (!topicToRender) return null;

  return (
    <Topic
      topic={topicToRender}
      setTopic={setTopicData}
      user={user}
      showToast={showToast}
      shareModalShow={shareModalShow}
      setShareModalShow={setShareModalShow}
      evidenceModalShow={evidenceModalShow}
      setEvidenceModalShow={setEvidenceModalShow}
    />
  );
}

// Topic Component
const Topic = ({
  topic,
  setTopic,
  user,
  showToast,
  shareModalShow,
  setShareModalShow,
  evidenceModalShow,
  setEvidenceModalShow,
}) => {
  const { t } = useTranslation();
  const {
    topic_id: topicId,
    title,
    status: currentStatus,
    created_at: createdAt,
    updated_at: updatedAt,
    reward_amount: rewardAmount,
    distribution_fee_amount: distributionFeeAmount,
    description,
    article,
    claims: claimList,
    content: contentList,
    proposed_by: proposedBy,
    financialSummary:
      topicFinancialSummary,
  } = topic;
  const financialSummary =
    topicFinancialSummary || topic.financial_summary || null;

  const [evidenceModalTitle, setEvidenceModalTitle] = useState(title);
  const [evidenceType, setEvidenceType] = useState();
  const [claimId, setClaimId] = useState();
  const [verificationSummary, setVerificationSummary] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [votingClaimId, setVotingClaimId] = useState(null);
  const [reviewModalShow, setReviewModalShow] = useState(false);
  const [reviewingClaim, setReviewingClaim] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [authPromptShow, setAuthPromptShow] = useState(false);
  const [rewardPoolModalShow, setRewardPoolModalShow] = useState(false);
  const [activeReferenceKey, setActiveReferenceKey] = useState(null);
  const referencesSectionRef = useRef(null);
  const referenceAssessments = React.useMemo(
    () =>
      buildReferenceAssessmentMap(
        contentList,
        claimList,
        verificationSummary,
      ),
    [claimList, contentList, verificationSummary],
  );
  const locale = i18n.language || navigator.language || "en-US"; // defaults to current i18n setting or browser
  const navigate = useNavigate();
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  const openLifecycleDetails = useCallback(() => {
    const target = document.getElementById("topic-lifecycle-audit");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const handleTopicUpdate = ({ message, updatedTopic, datumHash }) => {
    setTopic((prev) => ({ ...prev, ...updatedTopic }));
    if (message) showToast(message, "success");
  };

  const handleRewardPoolUpdated = useCallback((payload) => {
    if (!payload) return;

    setTopic((prev) => {
      const currentSummary =
        prev?.financialSummary ||
        prev?.financial_summary ||
        {};
      const nextRewardPool = payload.rewardPool ?? null;

      return {
        ...prev,
        financialSummary: {
          ...currentSummary,
          rewardPool: nextRewardPool,
          rewardPoolAccountingReady:
            payload.rewardPoolAccountingReady ?? Boolean(nextRewardPool),
          hasFinancialActivity:
            currentSummary.hasFinancialActivity || Boolean(nextRewardPool),
        },
      };
    });
  }, [setTopic]);

  const handleTagClick = (tag) => {
    // Navigate to LandingPage with search query
    const cleanTag = String(tag || "").trim();
    if (!cleanTag) return;

    const hashtagQuery = cleanTag.startsWith("#") ? cleanTag : `#${cleanTag}`;
    navigate(`/?q=${encodeURIComponent(hashtagQuery)}`);
  };

  const showAuthPrompt = useCallback(() => {
    setAuthPromptShow(true);
  }, []);

  useEffect(() => {
    if (user?.access_token) {
      setAuthPromptShow(false);
    }
  }, [user?.access_token]);

  const showEvidenceModal = (title, evidenceType, claimId) => {
    if (!user?.access_token) {
      showAuthPrompt();
      return;
    }

    setEvidenceType(evidenceType);
    setEvidenceModalTitle(title);
    setClaimId(claimId);
    setEvidenceModalShow(true);
  };

  const loadVerificationSummary = useCallback(async ({ silent = false } = {}) => {
    if (!topicId || !user?.access_token) {
      setVerificationSummary(null);
      return null;
    }

    if (!silent) setVerificationLoading(true);

    try {
      const summary = await fetchTopicVerificationSummary(
        authRequestRef.current,
        topicId,
      );
      setVerificationSummary(summary);
      return summary;
    } catch {
      if (!silent) showToast?.(t("claimVoting.summaryFailed"), "secondary");
      return null;
    } finally {
      if (!silent) setVerificationLoading(false);
    }
  }, [showToast, t, topicId, user?.access_token]);

  useEffect(() => {
    loadVerificationSummary({ silent: true });
  }, [loadVerificationSummary]);

  const getReviewingClaimSummary = useCallback(
    () => findClaimSummaryForClaim(verificationSummary, reviewingClaim),
    [reviewingClaim, verificationSummary],
  );

  const closeClaimReviewModal = useCallback(() => {
    if (reviewSubmitting) return;
    setReviewModalShow(false);
    setReviewingClaim(null);
  }, [reviewSubmitting]);

  const handleOpenClaimReview = useCallback((nextClaim) => {
    if (!user?.access_token) {
      showAuthPrompt();
      return;
    }

    if (!isActiveTopicStatus(currentStatus)) {
      showToast?.(t("claimVoting.activeTopicRequired"), "secondary");
      return;
    }

    setReviewingClaim(nextClaim);
    setReviewModalShow(true);
  }, [currentStatus, showAuthPrompt, showToast, t, user?.access_token]);

  const handleClaimReview = useCallback(async (payload) => {
    if (!user?.access_token) {
      showAuthPrompt();
      return;
    }

    const nextClaimId = getTopicClaimId(reviewingClaim);
    if (!nextClaimId || reviewSubmitting) return;

    setReviewSubmitting(true);

    try {
      const result = await reviewClaim(authRequestRef.current, nextClaimId, payload);
      await loadVerificationSummary({ silent: true });

      showToast?.(
        result?.changed
          ? t("claimVoting.reviewSaved")
          : t("claimVoting.reviewAlreadySaved"),
        result?.changed ? "success" : "secondary",
      );

      setReviewModalShow(false);
      setReviewingClaim(null);
    } catch {
      showToast?.(t("claimVoting.reviewFailed"), "danger");
    } finally {
      setReviewSubmitting(false);
    }
  }, [
    loadVerificationSummary,
    reviewSubmitting,
    reviewingClaim,
    showAuthPrompt,
    showToast,
    t,
    user?.access_token,
  ]);

  const handleClaimVote = useCallback(async (nextClaimId, vote) => {
    if (!user?.access_token) {
      showAuthPrompt();
      return;
    }

    if (!nextClaimId || votingClaimId) return;

    setVotingClaimId(nextClaimId);

    try {
      const result = await castClaimVote(authRequestRef.current, nextClaimId, vote);
      await loadVerificationSummary({ silent: true });

      showToast?.(
        result?.changed
          ? t("claimVoting.voteUpdated")
          : t("claimVoting.voteAlreadyCounted"),
        result?.changed ? "success" : "secondary",
      );
    } catch {
      showToast?.(t("claimVoting.voteFailed"), "danger");
    } finally {
      setVotingClaimId(null);
    }
  }, [loadVerificationSummary, showAuthPrompt, showToast, t, user?.access_token, votingClaimId]);

  // Map refs for each content item.
  const contentRefs = useRef({});
  (contentList || []).forEach((item, index) => {
    const key = item.local_url || item.localUrl || referenceKey(item, index);
    contentRefs.current[key] =
      contentRefs.current[key] || React.createRef();
  });

  useEffect(() => {
    if (!activeReferenceKey) return;

    const referenceStillExists = (contentList || []).some(
      (item, index) => referenceKey(item, index) === activeReferenceKey,
    );

    if (!referenceStillExists) setActiveReferenceKey(null);
  }, [activeReferenceKey, contentList]);

  const openReference = useCallback((key, { scroll = false } = {}) => {
    setActiveReferenceKey((current) =>
      current === key && !scroll ? null : key,
    );

    if (scroll) {
      window.requestAnimationFrame(() => {
        referencesSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, []);

  // Carousel items open the matching desktop reference preview.
  const handleCarouselClick = (localUrl) => {
    const index = (contentList || []).findIndex(
      (item) =>
        item.local_url === localUrl ||
        item.localUrl === localUrl ||
        item.url === localUrl,
    );

    if (index < 0) return;
    openReference(referenceKey(contentList[index], index), { scroll: true });
  };

  return (
    <div className="Breakdown-topic-container">
      <h1 className="Breakdown-topic-title">{title}</h1>
      <div className="Breakdown-topic-commandBar">
        <TopicFinancialSummary
          status={currentStatus}
          financialSummary={financialSummary}
          legacyRewardAmount={rewardAmount}
          locale={locale}
          onOpenLifecycle={openLifecycleDetails}
          onOpenRewardPool={() => setRewardPoolModalShow(true)}
        />

        <TopicToolbar
          user={user}
          shareModalShow={shareModalShow}
          setShareModalShow={setShareModalShow}
          title={title}
          showToast={showToast}
          hashtags={getHashtags(contentList)}
          onTopicUpdated={handleTopicUpdate}
          topicId={topicId}
          status={currentStatus}
          proposedBy={proposedBy}
          financialSummary={financialSummary}
        />
      </div>
      {contentList && contentList.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <ContentCarousel
            contentList={contentList}
            onItemClick={handleCarouselClick}
          />
        </div>
      )}
      <small
        className="Breakdown-topic-subheading"
        style={{ fontStyle: "italic" }}
      >
        {createdAt !== updatedAt
          ? `${t("createdAt")}: ${new Date(createdAt).toLocaleString(
              locale,
            )} • ${t("updatedAt")}: ${new Date(updatedAt).toLocaleString(
              locale,
            )}`
          : `${t("createdAt")}: ${new Date(createdAt).toLocaleString(locale)}`}
      </small>
      <p>{description}</p>
      <div>{getHashtags(contentList, true, 6, handleTagClick)}</div>
      {claimList && claimList.length > 0 && <h3>{t("claims")}</h3>}
      <ClaimList
        content={claimList}
        showEvidenceModal={showEvidenceModal}
        topicId={topicId}
        verificationSummary={verificationSummary}
        verificationLoading={verificationLoading}
        votingClaimId={votingClaimId}
        votingEnabled={isActiveTopicStatus(currentStatus)}
        reviewEnabled={isActiveTopicStatus(currentStatus)}
        reviewingClaimId={getTopicClaimId(reviewingClaim)}
        onClaimVote={handleClaimVote}
        onClaimReview={handleOpenClaimReview}
      />
      <ClaimReviewModal
        show={reviewModalShow}
        onHide={closeClaimReviewModal}
        claim={reviewingClaim}
        claimSummary={getReviewingClaimSummary()}
        onSubmit={handleClaimReview}
        submitting={reviewSubmitting}
      />
      <TopicAuthPromptModal
        show={authPromptShow}
        onHide={() => setAuthPromptShow(false)}
      />
      <div className="Breakdown-topic-article">{article}</div>
      {contentList && contentList.length > 0 && (
        <ReferenceDesktop
          contentList={contentList}
          refsMap={contentRefs.current}
          assessmentsByContentId={referenceAssessments}
          activeKey={activeReferenceKey}
          onSelect={(key) => openReference(key)}
          onClose={() => setActiveReferenceKey(null)}
          sectionRef={referencesSectionRef}
        />
      )}
      <RewardPoolModal
        show={rewardPoolModalShow}
        onHide={() => setRewardPoolModalShow(false)}
        topicId={topicId}
        topicTitle={title}
        user={user}
        locale={locale}
        onRewardPoolUpdated={handleRewardPoolUpdated}
        onRequireAuth={showAuthPrompt}
        showToast={showToast}
      />
      <EvidenceModal
        show={evidenceModalShow}
        title={evidenceModalTitle}
        onHide={() => setEvidenceModalShow(false)}
        type={evidenceType}
        claimId={claimId}
        topicId={topicId}
      />
    </div>
  );
};

// Main page component
function TopicBreakdownPage() {
  const [showUserTopics, setShowUserTopics] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [shareModalShow, setShareModalShow] = useState(false);
  const [evidenceModalShow, setEvidenceModalShow] = useState(false);
  const [topicData, setTopicData] = useState(null);
  const { topicPromise, userTopicsPromise } = useLoaderData();
  const { user, showToast } = useOutletContext();

  const handleResize = () => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  const scrollUp = () => {
    document
      .getElementsByClassName("Breakdown-middle-column")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    document
      .getElementsByClassName("Breakdown-body")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize, false);
    scrollUp();

    return () => window.removeEventListener("resize", handleResize, false);
  }, []);

  return (
    <div className="Breakdown-body">
      <Suspense fallback={<LoadingPage />}>
        <div className="Breakdown-middle-column">
          <Await resolve={topicPromise}>
            {(resolved) => {
              const parsed =
                typeof resolved === "string" ? JSON.parse(resolved) : resolved;

              return (
                <TopicDataResolver
                  parsedTopic={parsed}
                  topicData={topicData}
                  setTopicData={setTopicData}
                  scrollUp={scrollUp}
                  user={user}
                  showToast={showToast}
                  shareModalShow={shareModalShow}
                  setShareModalShow={setShareModalShow}
                  evidenceModalShow={evidenceModalShow}
                  setEvidenceModalShow={setEvidenceModalShow}
                />
              );
            }}
          </Await>
          <Button
            variant="secondary"
            className="Breakdown-scroll-up"
            onClick={scrollUp}
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </Button>
        </div>
        <div className="Breakdown-right-column" id="topic-lifecycle-audit">
          {topicData?.topic_id && (
            <TopicLifecycleAuditTrail
              user={user}
              topic={topicData}
              topicId={topicData.topic_id}
            />
          )}
        </div>
      </Suspense>
      {user && (
        <Suspense>
          <Await resolve={userTopicsPromise}>
            {(userTopics) => (
              <TopicSidebar
                userTopics={userTopics.topics}
                pageWidth={dimensions.width}
                showUserTopics={showUserTopics}
                setShowUserTopics={setShowUserTopics}
              />
            )}
          </Await>
        </Suspense>
      )}
    </div>
  );
}

export default TopicBreakdownPage;
