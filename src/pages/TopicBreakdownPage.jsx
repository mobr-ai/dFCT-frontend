import "../styles/TopicBreakdownPage.css";
import "../styles/WelcomePage.css";
import "../styles/NavigationSidebar.css";
import { TopicSidebar } from "../components/topic";
import { TopicToolbar } from "../components/topic";
import { EvidenceModal } from "../components/submission";
import { TopicLifecycleAuditTrail } from "../components/dsm";
import Badge from "react-bootstrap/Badge";
import LoadingPage from "./LoadingPage";
import AuthPage from "./AuthPage";
import { ContentList } from "../components/content";
import { ClaimList } from "../components/topic";
import { ContentCarousel } from "../components/content";
import i18n from "../i18n";
import { Button, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import {
  useLoaderData,
  Await,
  useOutletContext,
  useNavigate,
} from "react-router-dom";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef, useCallback } from "react";
import TextTransition, { presets } from "react-text-transition";
import { CARDANO_EXPLORER_URL } from "../chains/cardano/constants";
import { useAuthRequest } from "../hooks/useAuthRequest";
import {
  fetchTopicVerificationSummary,
  castClaimVote,
} from "../api/claimVerification";

function isActiveTopicStatus(status) {
  return Number(status) === 2 || String(status || "").toLowerCase() === "active";
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
    transaction_hash: transactionHash,
    proposed_by: proposedBy,
  } = topic;

  const [evidenceModalTitle, setEvidenceModalTitle] = useState(title);
  const [evidenceType, setEvidenceType] = useState();
  const [claimId, setClaimId] = useState();
  const [verificationSummary, setVerificationSummary] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [votingClaimId, setVotingClaimId] = useState(null);
  const [authPromptShow, setAuthPromptShow] = useState(false);
  const locale = i18n.language || navigator.language || "en-US"; // defaults to current i18n setting or browser
  const navigate = useNavigate();
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const handleTopicUpdate = ({ message, updatedTopic, datumHash }) => {
    setTopic((prev) => ({ ...prev, ...updatedTopic }));
    if (message) showToast(message, "success");
  };

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

  // Map refs for each content item
  const contentRefs = useRef({});
  contentList.forEach((item) => {
    contentRefs.current[item.local_url] =
      contentRefs.current[item.local_url] || React.createRef();
  });

  // Scroll handler
  const handleCarouselClick = (localUrl) => {
    const targetRef = contentRefs.current[localUrl];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="Breakdown-topic-container">
      <h1 className="Breakdown-topic-title">{title}</h1>
      <small className="Breakdown-topic-subheading">
        <span>
          {t("status")}:
          <b>
            <TextTransition
              springConfig={presets.wobbly}
              className="Breakdown-topic-status"
            >
              {transactionHash ? (
                <a
                  href={`${CARDANO_EXPLORER_URL}/transaction/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(currentStatus)}
                </a>
              ) : (
                t(currentStatus)
              )}
            </TextTransition>
          </b>
        </span>
        <span>•</span>
        <span>
          {t("rewardPool")}:{" "}
          <TextTransition springConfig={presets.gentle}>
            {transactionHash ? (
              <a
                href={`${CARDANO_EXPLORER_URL}/transaction/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {rewardAmount || 0} $DFCT
              </a>
            ) : (
              `${rewardAmount || 0} $DFCT`
            )}
          </TextTransition>
        </span>
      </small>

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
      />
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
        onClaimVote={handleClaimVote}
      />
      <TopicAuthPromptModal
        show={authPromptShow}
        onHide={() => setAuthPromptShow(false)}
      />
      <div className="Breakdown-topic-article">{article}</div>
      {contentList && contentList.length > 0 && (
        <ContentList content={contentList} refsMap={contentRefs.current} />
      )}
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
        <div className="Breakdown-right-column">
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
