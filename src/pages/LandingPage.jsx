import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/LandingPage.css";
import "../styles/landing/FeedLayout.css";
import "../styles/landing/FeedCards.css";
import "../styles/landing/FeedSnap.css";
import "../styles/NavigationSidebar.css";
import i18n from "../i18n";
import logo from "../icons/logo.svg";
import { TopicList } from "../components/topic";
import LandingSnapTopicFeed from "../components/landing/LandingSnapTopicFeed.jsx";
import { LandingCompactTopicGrid, LandingCompactTopicList } from "../components/landing/LandingTopicViews.jsx";
import LoadingPage from "./LoadingPage.jsx";
import { useAuthRequest } from "../hooks/useAuthRequest";
import { Button, Container, Spinner } from "react-bootstrap";
import {
  useOutletContext,
  useNavigate,
  useLocation,
  useLoaderData,
  Await,
} from "react-router-dom";
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlassArrowRight,
  faMagnifyingGlass,
  faTimes,
  faArrowUp,
  faUpDown,
  faGrip,
  faListUl,} from "@fortawesome/free-solid-svg-icons";
import { InputGroup, FormControl } from "react-bootstrap";
import ReactTextTransition, { presets } from "react-text-transition";


function LandingTopicsResolver({
  loadedTopics,
  topics,
  setTopics,
  setTotalTopics,
  setLoading,
}) {
  useEffect(() => {
    if (loadedTopics && (!topics || topics.length === 0)) {
      setTopics(loadedTopics.topics || []);
      setTotalTopics(loadedTopics.total || 0);
      setLoading(false);

      requestAnimationFrame(() => {
        document
          .querySelector(".Landing-middle-column")
          ?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }, [loadedTopics, topics, setTopics, setTotalTopics, setLoading]);

  return null;
}

const landingFeedViewModes = ["snap", "grid", "list"];

const getLandingFeedViewStorageKey = (type) =>
  type === "user" ? "dfctSubmittedTopicView" : "dfctLandingHomeFeedView";

const getLandingFeedDefaultMode = (type) => (type === "user" ? "grid" : "snap");

const normalizeLandingFeedViewMode = (mode, type) =>
  landingFeedViewModes.includes(mode) ? mode : getLandingFeedDefaultMode(type);

const readLandingFeedViewMode = (type) => {
  const fallback = getLandingFeedDefaultMode(type);

  try {
    return normalizeLandingFeedViewMode(
      window.localStorage.getItem(getLandingFeedViewStorageKey(type)) || fallback,
      type
    );
  } catch {
    return fallback;
  }
};


const getLandingFeedViewIcon = (mode) => {
  if (mode === "grid") return faGrip;
  if (mode === "list") return faListUl;
  return faUpDown;
};

function LandingPage(props) {
  const { t } = useTranslation();
  const { userTopicsPromise, allTopicsPromise } = useLoaderData();
  const { user, loading, setLoading } = useOutletContext();
  const { authFetch } = useAuthRequest(user);
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState();
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollUpButton, setShowScrollUpButton] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") || "";
  const brandText = ["d-", "de", "fact", "tool"];
  const suffixText = ["FCT", "centralized", "-checking", "kit"];
  const dragCounter = useRef(0);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [exploreVisibleCount, setExploreVisibleCount] = useState(12);
  const [searchSettling, setSearchSettling] = useState(false);
  const [isCompactFeedViewport, setIsCompactFeedViewport] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [feedViewMode, setFeedViewMode] = useState(() => readLandingFeedViewMode(props.type));
  const [homeFeedViewMode, setHomeFeedViewMode] = useState(() => {
    try {
      return (
        window.localStorage.getItem("dfctLandingHomeFeedView") ||
        window.localStorage.getItem("dfctLandingFeedView") ||
        "snap"
      );
    } catch {
      return "snap";
    }
  });
  const [submittedTopicsViewMode, setSubmittedTopicsViewMode] = useState(() => {
    try {
      return (
        window.localStorage.getItem("dfctSubmittedTopicsView") ||
        window.localStorage.getItem("dfctSubmittedTopicView") ||
        "grid"
      );
    } catch {
      return "grid";
    }
  });
  useEffect(() => {
    setFeedViewMode(readLandingFeedViewMode(props.type));
  }, [props.type]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setIsCompactFeedViewport(Boolean(query.matches));

    update();

    if (query.addEventListener) {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  const normalizedSearchQuery = searchQuery.trim();
  const isExploreMode = searching || Boolean(normalizedSearchQuery);
  const displayedTopics = isExploreMode ? searchResults : topics;
  const visibleDisplayedTopics = isExploreMode
    ? displayedTopics.slice(0, exploreVisibleCount)
    : displayedTopics;
  const isHomeFeedMode = user && !loading && !isExploreMode && props.type !== "user";
  const isSubmittedTopicsMode = user && !loading && !isExploreMode && props.type === "user";
  const hasFeedViewControls = isHomeFeedMode || isSubmittedTopicsMode;
  const activeFeedViewMode = isSubmittedTopicsMode ? submittedTopicsViewMode : homeFeedViewMode;
  const normalizedFeedViewMode = ["snap", "grid", "list"].includes(activeFeedViewMode)
    ? activeFeedViewMode
    : isSubmittedTopicsMode
      ? "grid"
      : "snap";
  const isSnapFeedMode = hasFeedViewControls && normalizedFeedViewMode === "snap";

  // Sync search from navbar/sidebar query parameter without flashing the full feed.
  useEffect(() => {
    setSearchQuery(initialQuery);
    setSearching(Boolean(initialQuery));
    setExploreVisibleCount(12);
    setSearchSettling(Boolean(initialQuery));

    if (!initialQuery) {
      setSearchResults([]);
      setSearchSettling(false);
    }
  }, [initialQuery]);

  const scrollUp = () => {
    document
      .querySelector(".Landing-snap-feed")
      ?.scrollTo({ top: 0, behavior: "smooth" });
    document
      .getElementsByClassName("Landing-middle-column")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    document
      .getElementsByClassName("Landing-body")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadTopics = useCallback(
    async (newPage) => {
      if (typeof newPage === "undefined") return;
      setLoadingMore(true);

      try {
        const perPage = window.sessionStorage.getItem("perPage") || 9;
        const lang =
          i18n.language.split("-")[0] ||
          window.localStorage.i18nextLng.split("-")[0];
        var request = "";

        if (props.type === "user") {
          request = `/api/user/${user.id}/topics/${lang}/${newPage}/${perPage}`;
        } else if (props.type === "all") {
          request = `/api/topics/${lang}/${newPage}/${perPage}`;
        }

        const fetcher = props.type === "user" ? authFetch : fetch;
        const response = await fetcher(request, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (data.topics.length === 0) {
          setShowScrollUpButton(true);
          return;
        }

        if (Number(data.page) !== page) {
          setPage(Number(data.page));
          setTopics([...topics, ...data.topics]);
        }
      } catch (error) {
        console.error("Failed to load topics:", error);
      } finally {
        setLoadingMore(false);
      }
    },
    [setTopics, setPage, user, page, topics, props.type, authFetch]
  );

  useEffect(() => {
    const scrollElement = document.querySelector(".Landing-middle-column");

    const handleScroll = () => {
      const scrollElement = document.querySelector(".Landing-middle-column");

      if (!scrollElement) return;

      const nearBottom =
        scrollElement.scrollTop + scrollElement.clientHeight >=
        scrollElement.scrollHeight - 50;
      const perPage = window.sessionStorage.getItem("perPage") || 9;

      if (nearBottom && isExploreMode && !searchLoading) {
        setExploreVisibleCount((current) =>
          Math.min(current + 12, displayedTopics.length)
        );
        return;
      }

      if (nearBottom && !loadingMore && !searching) {
        if (page * perPage < totalTopics) {
          const nextPage = page + 1;
          loadTopics(nextPage);
        } else {
          if (!showScrollUpButton) {
            setTimeout(() => {
              setShowScrollUpButton(true);
            }, 500);
          }
        }
      }
    };

    scrollElement?.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);

    return () => {
      scrollElement?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    page,
    topics,
    totalTopics,
    loadingMore,
    loadTopics,
    searching,
    showScrollUpButton,
    isExploreMode,
    searchLoading,
    displayedTopics.length,
  ]);

  useEffect(() => {
    if (user) return undefined;

    const intervalId = setInterval(
      () => {
        setBrandIndex((index) =>
          index < brandText.length ? index + 1 : index
        );
        setSuffixBrandIndex((index) =>
          index < suffixText.length ? index + 1 : index
        );
      },
      600
    );

    return () => clearInterval(intervalId);
  }, [brandText.length, suffixText.length, user]);

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    dragCounter.current = 0;

    const files = Array.from(event.dataTransfer.files);
    if (files && files.length > 0) {
      navigate("/submit", { state: { files } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current++;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  };

  const clearSearch = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setSearchQuery("");
    setSearchResults([]);
    setExploreVisibleCount(12);
    setTimeout(scrollUp, 300);
  };

  useEffect(() => {
    const fetchTopics = async () => {
      const lang = i18n.language.split("-")[0];
      const query = searchQuery.trim();

      if (query) {
        setSearching(true);
        setSearchLoading(true);
        setSearchSettling(true);
        setExploreVisibleCount(12);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&lang=${lang}`
        );
        const data = await response.json();

        setSearchResults(data.topics || []);
        setSearchLoading(false);
        window.setTimeout(() => setSearchSettling(false), 120);
        setLoading(false);
      } else {
        setSearching(false);
        setSearchResults([]);
        setExploreVisibleCount(12);
        setSearchLoading(false);
        setSearchSettling(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      if (user) fetchTopics();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, user, setLoading]);

  useEffect(() => {
    // Reset when switching between / and /mytopics
    setTopics([]);
    setTotalTopics(0);
    setPage(1);
    setSearching(false);
    setSearchResults([]);
    setExploreVisibleCount(12);
    setSearchSettling(false);
    setLoading(true);
  }, [location.pathname, setLoading]);

  const handleFeedViewChange = useCallback((nextMode) => {
    const normalizedNextMode = ["snap", "grid", "list"].includes(nextMode)
      ? nextMode
      : props.type === "user"
        ? "grid"
        : "snap";

    if (props.type === "user") {
      setSubmittedTopicsViewMode(normalizedNextMode);

      try {
        window.localStorage.setItem("dfctSubmittedTopicsView", normalizedNextMode);
        window.localStorage.setItem("dfctSubmittedTopicView", normalizedNextMode);
      } catch {
        // Ignore storage failures; the control still works for this session.
      }
    } else {
      setHomeFeedViewMode(normalizedNextMode);

      try {
        window.localStorage.setItem("dfctLandingFeedView", normalizedNextMode);
        window.localStorage.setItem("dfctLandingHomeFeedView", normalizedNextMode);
      } catch {
        // Ignore storage failures; the control still works for this session.
      }
    }

    if (typeof setFeedViewMode === "function") {
      setFeedViewMode(normalizedNextMode);
    }
  }, [props.type]);

  const handleFeedNearEnd = useCallback(() => {
    if (loadingMore || searching) return;

    const perPage = Number(window.sessionStorage.getItem("perPage") || 9);

    if (page * perPage < totalTopics) {
      loadTopics(page + 1);
      return;
    }

    if (!showScrollUpButton) {
      setShowScrollUpButton(true);
    }
  }, [loadTopics, loadingMore, page, searching, showScrollUpButton, totalTopics]);

  return (
    <div className={`Landing-body ${isExploreMode ? "Landing-body-explore" : "Landing-body-feed"} ${searchSettling ? "Landing-search-settling" : ""}`}>
      <Container
        className={`Landing-middle-column ${hasFeedViewControls ? "Landing-middle-column-has-view-controls" : ""} ${isHomeFeedMode ? "Landing-middle-column-feed-home" : ""} ${isSubmittedTopicsMode ? "Landing-middle-column-submitted" : ""} ${isSnapFeedMode ? "Landing-middle-column-snap" : ""}`}
        fluid
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onMouseLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="Landing-drag-overlay">
            <div className="Landing-drag-overlay-message">
              <FontAwesomeIcon
                icon={faMagnifyingGlassArrowRight}
                className="Landing-drop-icon"
              />
              <div className="Landing-upload-text">{t("dragAndDropMsg")}</div>
            </div>
          </div>
        )}
        {!user && (
          <div className="Landing-header-top" style={{ position: "absolute" }}>
            <section>
              <img src={logo} className="Landing-logo-static" alt="logo" />
            </section>
            <section className="inline Landing-logo-text">
              <Container className="Landing-logo-text-transition">
                <ReactTextTransition springConfig={presets.gentle} inline>
                  {brandText[brandIndex % brandText.length]}
                </ReactTextTransition>
                {suffixText[suffixIndex % suffixText.length]}
              </Container>
              <Container className="Landing-signup-login-buttons">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate("/login")}
                >
                  {t("loginButton")}
                </Button>
                <Button
                  variant="dark"
                  size="lg"
                  onClick={() => navigate("/signup")}
                >
                  {t("signUpButton")}
                </Button>
              </Container>
            </section>
          </div>
        )}

        {user && !loading && (
          <>
            {hasFeedViewControls && (
              <div
                className="Landing-view-controls"
                aria-label={t("landingFeed.viewLabel")}
              >
                <div className="Landing-view-control-inner" role="group">
                  {[
                    ["snap", t("landingFeed.viewSnap")],
                    ["grid", t("landingFeed.viewGrid")],
                    ["list", t("landingFeed.viewList")],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      data-feed-view-mode={mode}
                      className={`Landing-view-control-btn ${normalizedFeedViewMode === mode ? "is-active" : ""}`}
                      aria-pressed={normalizedFeedViewMode === mode}
                      title={label}
                      aria-label={label}
                      onPointerUp={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleFeedViewChange(mode);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleFeedViewChange(mode);
                      }}
                    >
                      <FontAwesomeIcon
                        icon={getLandingFeedViewIcon(mode)}
                        className="Landing-view-control-icon"
                        aria-hidden="true"
                      />
                      <span className="Landing-view-control-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!searchLoading && !isHomeFeedMode && !(isSubmittedTopicsMode && isSnapFeedMode) && (
              <div className="Landing-section-title">
                <h3>
                  {isExploreMode
                    ? t("landingFeed.exploreResults")
                    : props.type === "user"
                      ? t("myTopics")
                      : t("recentTopics")}
                </h3>
                <p className="Landing-feed-meta">
                  {isExploreMode
                    ? t("landingFeed.exploreResultsSubtitle", {
                        count: displayedTopics.length,
                      })
                    : props.type === "user"
                      ? t("landingFeed.myTopicsSubtitle")
                      : t("landingFeed.recentSubtitle")}
                </p>
              </div>
            )}
            {isSnapFeedMode ? (
              <LandingSnapTopicFeed
                topics={visibleDisplayedTopics}
                title={isSubmittedTopicsMode ? t("myTopics") : t("recentTopics")}
                loadingMore={loadingMore}
                onNearEnd={handleFeedNearEnd}
                labels={{
                  openTopic: t("landingFeed.openTopic"),
                }}
              />
            ) : (isHomeFeedMode || (isSubmittedTopicsMode && isCompactFeedViewport)) && normalizedFeedViewMode === "grid" ? (
              <LandingCompactTopicGrid
                topics={visibleDisplayedTopics}
                labels={{
                  grid: t("landingFeed.viewGrid"),
                  openTopic: t("landingFeed.openTopic"),
                }}
              />
            ) : isSubmittedTopicsMode && normalizedFeedViewMode === "grid" ? (
              <TopicList
                content={visibleDisplayedTopics}
                type="explore"
              />
            ) : hasFeedViewControls && normalizedFeedViewMode === "list" ? (
              <LandingCompactTopicList
                topics={visibleDisplayedTopics}
                labels={{
                  list: t("landingFeed.viewList"),
                  openTopic: t("landingFeed.openTopic"),
                }}
              />
            ) : (
              <TopicList
                content={visibleDisplayedTopics}
                type={isExploreMode || props.type === "user" ? "explore" : "main"}
              />
            )}
          </>
        )}

        {user && (
          <Suspense fallback={<LoadingPage />}>
            <Await
              resolve={
                searchResults?.length > 0 || props.type === "user"
                  ? userTopicsPromise
                  : allTopicsPromise
              }
            >
              {(loadedTopics) => (
                <LandingTopicsResolver
                  loadedTopics={loadedTopics}
                  topics={topics}
                  setTopics={setTopics}
                  setTotalTopics={setTotalTopics}
                  setLoading={setLoading}
                />
              )}
            </Await>
            {user &&
              showScrollUpButton &&
              !loadingMore &&
              !loading &&
              visibleDisplayedTopics.length > 3 && (
                <Button
                  variant="secondary"
                  className="Landing-scroll-up"
                  onClick={scrollUp}
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </Button>
              )}
          </Suspense>
        )}

        {!loading &&
          user &&
          searching &&
          !searchLoading &&
          searchQuery &&
          searchResults.length === 0 && (
            <p className="Landing-no-results-msg">{t("noResultsFound")}</p>
          )}

        {user &&
          !loading &&
          !searching &&
          !searchQuery &&
          searchResults.length === 0 &&
          totalTopics === 0 && (
            <div className="Landing-no-topics-msg">
              <section>
                <img src={logo} className="Landing-logo-static" alt="logo" />
              </section>
              {t("nothingHere")}
              <br />
              <p style={{ marginTop: "1rem" }}>
                <strong>{t("firstSubmission")}</strong>
              </p>
              <br />
              <Button
                className="Landing-first-submission-btn"
                variant="dark"
                size="md"
                onClick={() => navigate("/submit")}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} />
                &nbsp;{t("tryNow")}
              </Button>
            </div>
          )}
        {user && !loading && loadingMore && (
          <LoadingPage
            type="simple"
            style={{
              position: "sticky",
              bottom: "1rem",
              marginBottom: "2rem",
              display: "list-item",
              listStyleType: "disclosure-closed",
              listStylePosition: "inside",
            }}
          />
        )}
      </Container>
    </div>
  );
}

export default LandingPage;
