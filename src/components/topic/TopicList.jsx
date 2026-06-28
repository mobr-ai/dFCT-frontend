import "../../styles/TopicList.css";
import "../../styles/landing/FeedCards.css";
import Card from "react-bootstrap/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState } from "react";
import { useAuthRequest } from "../../hooks/useAuthRequest";

function TopicList({ content, type, showSideBar }) {
  const [visibleTopics, setVisibleTopics] = useState(content);
  const { user, setLoading } = useOutletContext();
  const { authFetch } = useAuthRequest(user);

  useEffect(() => {
    setVisibleTopics(content);
  }, [content]);

  const handleRemove = (id) => {
    const el = document.getElementById(`topic-card-${id}`);
    if (el) {
      el.classList.add("fade-out");
      setTimeout(() => {
        setVisibleTopics((prev) => prev.filter((t) => t.id !== id));
      }, 400); // matches animation duration
    }
  };

  const getElapsedTime = (timeStr) => {
    const pubTime = new Date(timeStr);

    if (Number.isNaN(pubTime.getTime())) {
      return "";
    }

    const now = new Date();

    let years = now.getFullYear() - pubTime.getFullYear();
    const beforeYearAnniversary =
      now.getMonth() < pubTime.getMonth() ||
      (now.getMonth() === pubTime.getMonth() &&
        now.getDate() < pubTime.getDate());

    if (beforeYearAnniversary) {
      years -= 1;
    }

    if (years >= 1) {
      return `${years}y`;
    }

    let months =
      (now.getFullYear() - pubTime.getFullYear()) * 12 +
      now.getMonth() -
      pubTime.getMonth();

    if (now.getDate() < pubTime.getDate()) {
      months -= 1;
    }

    if (months >= 1) {
      return `${months}mo`;
    }

    const elapsedSeconds = Math.max(
      1,
      Math.floor((now.getTime() - pubTime.getTime()) / 1000),
    );

    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsedSeconds >= day) {
      return `${Math.floor(elapsedSeconds / day)}d`;
    }

    if (elapsedSeconds >= hour) {
      return `${Math.floor(elapsedSeconds / hour)}h`;
    }

    if (elapsedSeconds >= minute) {
      return `${Math.floor(elapsedSeconds / minute)}m`;
    }

    return `${elapsedSeconds}s`;
  };

  const truncateString = (string = "", maxLength = 200) => {
    return string.length > maxLength
      ? `${string.substring(0, maxLength)}…`
      : string;
  };

  const normalizeTag = (tag) => {
    const value =
      typeof tag === "string"
        ? tag
        : tag?.name || tag?.label || tag?.title || tag?.concept || "";

    const cleanValue = String(value).trim();
    if (!cleanValue) return null;

    return cleanValue.startsWith("#") ? cleanValue : `#${cleanValue}`;
  };

  const getTopicTags = (topic) => {
    const candidateTags = [
      topic?.hashtags,
      topic?.tags,
      topic?.concepts,
      topic?.keywords,
      topic?.labels,
      topic?.semanticTags,
      topic?.semantic_tags,
    ];

    return candidateTags
      .flatMap((value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          return value
            .split(/[;,\s]+/)
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
        return [];
      })
      .map(normalizeTag)
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
      .slice(0, 6);
  };

  const TopicCard = ({ topic, type, onDelete, style, index = 0 }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const location = useLocation();
    const isMyTopicsPage = location.pathname === "/mytopics";
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const videoPlaybackRef = useRef({
      isVisible: false,
      isReady: false,
      isPlaying: false,
      lastPlayAttempt: 0,
    });
    const topicTags = getTopicTags(topic);

    const checkContentType = (url) => {
      if (!url) return "unknown";
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];
      const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "flv"];
      const extension = url
        .split(".")
        .pop()
        .toLowerCase()
        .split("?")[0]
        .split("#")[0];
      if (imageExtensions.includes(extension)) return "image";
      if (videoExtensions.includes(extension)) return "video";
      return "unknown";
    };

    const handleClick = () => {
      if (showSideBar) showSideBar(false);
      setLoading(true);
      navigate(`/t/${user.id}/${topic.id}`);
    };

    const handleDelete = async () => {
      if (!window.confirm(t("confirmDeleteTopic"))) return;

      try {
        const response = await authFetch(`/api/topic/${user.id}/${topic.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          onDelete(); // call parent callback to animate removal
        } else {
          const error = await response.json();
          alert(error.error || "Error deleting topic");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to delete topic.");
      }
    };

    useEffect(() => {
      setMediaLoaded(false);

      const fallbackTimer = window.setTimeout(() => {
        setMediaLoaded(true);
      }, 2200);

      return () => window.clearTimeout(fallbackTimer);
    }, [topic.cover]);

    const syncVideoPlayback = () => {
      const video = videoRef.current;
      const playback = videoPlaybackRef.current;

      if (!video || !playback.isReady) return;

      if (!playback.isVisible) {
        if (!video.paused) video.pause();
        return;
      }

      if (!video.paused || playback.isPlaying) return;

      const now = Date.now();
      if (now - playback.lastPlayAttempt < 900) return;

      playback.lastPlayAttempt = now;
      playback.isPlaying = true;

      video
        .play()
        .catch(() => {})
        .finally(() => {
          playback.isPlaying = false;
        });
    };

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return undefined;

      const observer = new IntersectionObserver(
        ([entry]) => {
          videoPlaybackRef.current.isVisible =
            entry.isIntersecting && entry.intersectionRatio >= 0.9;
          syncVideoPlayback();
        },
        {
          threshold: [0, 0.9],
          rootMargin: "220px 0px 220px 0px",
        },
      );

      observer.observe(video);

      return () => {
        observer.disconnect();
        video.pause();
        videoPlaybackRef.current.isVisible = false;
      };
    }, [topic.cover]);

    if (!user || topic.title === "Topic template") return null;

    const isFeedCard = type === "main" || type === "explore";

    return (
      <Card
        id={`topic-card-${topic.id}`}
        variant="dark"
        className={`Topic-card Topic-card-${type} ${isFeedCard ? "Topic-feed-card" : ""} ${type === "explore" ? "Topic-explore-card" : ""} ${mediaLoaded ? "is-media-loaded" : "is-media-loading"}`}
        onClick={() => navigate(`/t/${user.id}/${topic.id}`)}
        style={style}
      >
        {isMyTopicsPage && (
          <button
            className="Topic-delete-btn"
            onClick={(e) => {
              e.stopPropagation(); // prevent triggering card click
              handleDelete();
            }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
        {checkContentType(topic.cover) === "video" ? (
          <video
            ref={videoRef}
            src={topic.cover}
            className={`Topic-card-img ${isFeedCard ? "Topic-feed-card-img" : ""} ${type === "explore" ? "Topic-explore-card-img" : ""}`}
            muted
            loop
            preload="metadata"
            playsInline
            disablePictureInPicture
            poster={
              topic.thumbnail ||
              topic.thumbnail_url ||
              topic.thumbnailUrl ||
              topic.preview ||
              topic.preview_image ||
              topic.previewImage ||
              undefined
            }
            onLoadedMetadata={() => setMediaLoaded(true)}
            onError={() => setMediaLoaded(true)}
            onLoadedData={() => {
              videoPlaybackRef.current.isReady = true;
              setMediaLoaded(true);
              syncVideoPlayback();
            }}
            onCanPlay={() => {
              videoPlaybackRef.current.isReady = true;
              setMediaLoaded(true);
              syncVideoPlayback();
            }}
            onClick={handleClick}
          />
        ) : (
          <Card.Img
            variant="top"
            onClick={handleClick}
            className={`Topic-card-img ${isFeedCard ? "Topic-feed-card-img" : ""} ${type === "explore" ? "Topic-explore-card-img" : ""}`}
            src={topic.cover || "/placeholder.png"}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setMediaLoaded(true)}
            onError={() => setMediaLoaded(true)}
          />
        )}
        <Card.Body>
          <Card.Title className="Topic-card-title">{topic.title}</Card.Title>
          <Card.Subtitle className="text-muted">
            {t("Updated") +
              " " +
              (getElapsedTime(topic.updatedAt) === "1s"
                ? t("moments ago")
                : getElapsedTime(topic.updatedAt) + " " + t("ago"))}
          </Card.Subtitle>
          <Card.Text>{truncateString(topic.description)}</Card.Text>

          {topicTags.length > 0 && (
            <div className="Topic-card-tags">
              {topicTags.map((tag) => (
                <span key={tag} className="Topic-card-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    content && (
      <div
        className={`Topic-list-container-${type} ${type === "main" ? "Topic-feed-list" : ""} ${type === "explore" ? "Topic-explore-grid" : ""}`}
      >
        {visibleTopics.map((topic, index) => (
          <TopicCard
            key={topic.id}
            type={type}
            topic={topic}
            style={{ "--topic-index": index }}
            index={index}
            onDelete={() => handleRemove(topic.id)}
          />
        ))}
      </div>
    )
  );
}

export default TopicList;
