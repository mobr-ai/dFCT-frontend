import "./styles/TopicBreakdownPage.css";
import "./styles/NavigationSidebar.css";
import TopicSidebar from "./TopicSidebar";
import TopicToolbar from "./TopicToolbar";
import EvidenceModal from "./components/EvidenceModal";
import Badge from "react-bootstrap/Badge";
import LoadingPage from "./LoadingPage";
import ContentList from "./components/ContentList";
import ClaimList from "./components/ClaimList";
import ContentCarousel from "./components/ContentCarousel";
import i18n from "i18next";
import { Button } from "react-bootstrap";
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
import React, { useState, useEffect, useRef } from "react";

function getHashtags(
  contentList,
  jsx = false,
  limit = 5,
  onClickTag = () => {}
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
                .join("")
            );
        })
        .flat()
    ),
  ].slice(0, limit);

  if (jsx) {
    return tags.map((tag) => (
      <div key={tag} className="Breakdown-topic-claims-tag">
        <Badge
          key={tag}
          className="Breakdown-hashtag"
          bg="secondary"
          // style={{ cursor: 'pointer' }}
          onClick={() => onClickTag(tag)}
        >
          #{tag}
        </Badge>
      </div>
    ));
  }
  return tags;
}

// Topic Component
const Topic = ({
  topicId,
  title,
  currentStatus,
  createdAt,
  updatedAt,
  rewardAmount,
  description,
  claimList,
  article,
  contentList,
  user,
  shareModalShow,
  setShareModalShow,
  evidenceModalShow,
  setEvidenceModalShow,
}) => {
  const { t } = useTranslation();
  const [evidenceModalTitle, setEvidenceModalTitle] = useState(title);
  const [evidenceType, setEvidenceType] = useState();
  const [claimId, setClaimId] = useState();
  const locale = i18n.language || navigator.language || "en-US"; // defaults to current i18n setting or browser
  const navigate = useNavigate();

  const handleTagClick = (tag) => {
    // Navigate to LandingPage with search query
    navigate(`/?q=${encodeURIComponent(tag)}`);
  };

  const showEvidenceModal = (title, evidenceType, claimId) => {
    setEvidenceType(evidenceType);
    setEvidenceModalTitle(title);
    setClaimId(claimId);
    setEvidenceModalShow(true);
  };

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
        {t("status")}: <strong>{t(currentStatus)}</strong> • {t("rewardAmount")}
        : {rewardAmount || 0} $DFCT
      </small>
      <TopicToolbar
        user={user}
        shareModalShow={shareModalShow}
        setShareModalShow={setShareModalShow}
        title={title}
        hashtags={getHashtags(contentList)}
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
              locale
            )} • ${t("updatedAt")}: ${new Date(updatedAt).toLocaleString(
              locale
            )}`
          : `${t("createdAt")}: ${new Date(createdAt).toLocaleString(locale)}`}
      </small>
      <p>{description}</p>
      <p>{getHashtags(contentList, true, 6, handleTagClick)}</p>
      {claimList && claimList.length > 0 && <h3>{t("claims")}</h3>}
      <ClaimList
        content={claimList}
        showEvidenceModal={showEvidenceModal}
        topicId={topicId}
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
  const { topicPromise, userTopicsPromise } = useLoaderData();
  const { user } = useOutletContext();

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
  }, []);

  return (
    <div className="Breakdown-body">
      <Suspense fallback={<LoadingPage />}>
        <div className="Breakdown-middle-column">
          <Await resolve={topicPromise}>
            {(topicData) => {
              scrollUp();
              return (
                <Topic
                  topicId={JSON.parse(topicData).topic_id}
                  title={JSON.parse(topicData).title}
                  currentStatus={JSON.parse(topicData).status}
                  createdAt={JSON.parse(topicData).created_at}
                  updatedAt={JSON.parse(topicData).updated_at}
                  rewardAmount={JSON.parse(topicData).reward_amount}
                  description={JSON.parse(topicData).description}
                  claimList={JSON.parse(topicData).claims || []}
                  article={JSON.parse(topicData).article}
                  contentList={JSON.parse(topicData).content}
                  user={user}
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
        <div className="Breakdown-right-column"></div>
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
