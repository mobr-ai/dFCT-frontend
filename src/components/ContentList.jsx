import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlayCircle,
  faVolumeMute,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";
import "./../styles/TopicBreakdownPage.css";
import { useTranslation } from "react-i18next";
import Image from "react-bootstrap/Image";
import Linkify from "linkify-react";
import Badge from "react-bootstrap/Badge";

const linkifyOpts = {
  defaultProtocol: "https",
  target: "_blank",
};

const ContentCard = ({ item, innerRef }) => {
  const { t } = useTranslation();
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Track mute state
  const [showMuteIcon, setShowMuteIcon] = useState(false); // Control mute icon visibility
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const muteOffsetRef = useRef(null); // Default offset

  const toggleMute = (e) => {
    e.stopPropagation(); // Prevent play/pause toggle
    const video = videoRef.current;
    const newMuted = !video.muted;
    video.muted = newMuted;
    setIsMuted(newMuted);

    if (!newMuted) {
      // Fade out mute icon after 3s if unmuted
      setShowMuteIcon(true);
      setTimeout(() => setShowMuteIcon(false), 3000);
    } else {
      setShowMuteIcon(true); // Keep icon if muted
    }
  };

  const handlePlay = () => {
    setOverlayVisible(false);
    if (!isMuted) {
      // Start fade out when playing unmuted
      setTimeout(() => setShowMuteIcon(false), 3000);
    } else {
      setShowMuteIcon(true);
    }
  };

  const handlePause = () => {
    setOverlayVisible(true);
    setShowMuteIcon(true); // Always show icon when paused
  };

  const enterFullscreen = () => {
    if (
      !document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.msFullscreenElement
    ) {
      const video = videoRef.current;
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        // Safari
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        // IE/Edge
        video.msRequestFullscreen();
      }
    }
  };

  useEffect(() => {
    const updateMuteButtonPosition = () => {
      if (videoRef.current) {
        const videoWidth = videoRef.current.offsetWidth;
        const containerWidth = videoRef.current.parentElement.offsetWidth;
        const offset = containerWidth - videoWidth;
        muteOffsetRef.current = `${offset / 2 + 10}px`; // Save the offset
      }
    };

    if (videoLoaded) {
      updateMuteButtonPosition();
      window.addEventListener("resize", updateMuteButtonPosition);
    }

    return () => window.removeEventListener("resize", updateMuteButtonPosition);
  }, [videoLoaded]);

  useEffect(() => {
    const video = videoRef.current;

    const handleVolumeChange = () => {
      if (video) setIsMuted(video.muted); // Sync with native controls
    };

    if (video) {
      video.addEventListener("volumechange", handleVolumeChange);
    }

    return () => {
      if (video) video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [videoLoaded]);

  return (
    <div className="Breakdown-content-card" ref={innerRef}>
      {item.content_type === "image" && (
        <a href={item.src_url} target="_blank" rel="noreferrer">
          <Image
            src={item.local_url}
            alt={item.content_title}
            className="Breakdown-content-container loaded"
          />
        </a>
      )}
      {item.content_type === "video" && (
        <div
          className="Breakdown-video-wrapper"
          onDoubleClick={enterFullscreen}
        >
          <video
            className={`Breakdown-content-container ${
              videoLoaded ? "loaded" : ""
            }`}
            ref={videoRef}
            onLoadedMetadata={() => setVideoLoaded(true)}
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            playsInline
            muted={isMuted}
            preload="metadata"
          >
            <source src={item.local_url} type="video/mp4" />
          </video>
          {overlayVisible && (
            <div
              className="Breakdown-video-overlay"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling to the video controls
                const video = videoRef.current;
                if (video.paused) {
                  video.play();
                }
              }}
            >
              <FontAwesomeIcon icon={faPlayCircle} size="3x" />
            </div>
          )}
          {videoLoaded && showMuteIcon && (
            <div
              // ref={muteButtonRef}
              className="Breakdown-mute-button"
              style={{
                right: muteOffsetRef.current, // Always apply saved offset
                opacity: isMuted && !videoRef.current?.paused ? 1 : undefined, // Always show when playing & muted
              }}
              onClick={toggleMute}
            >
              <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
            </div>
          )}
        </div>
      )}
      {item.content_type === "audio" && (
        <audio className="Breakdown-audio-container" controls>
          <source src={item.local_url} type="audio/mpeg" />
        </audio>
      )}
      <div className="Breakdown-content-source">
        <Linkify as="div" options={linkifyOpts}>
          <u>{t("source")}</u>:&nbsp;&nbsp;{encodeURI(item.src_url)}
        </Linkify>
      </div>
      <p>
        <Linkify as="div" options={linkifyOpts}>
          {item.description}
        </Linkify>
      </p>
      {item.output_tags && (
        <div className="Breakdown-content-tag-container">
          {item.output_tags
            .replaceAll("{", "")
            .replaceAll('"', "")
            .replaceAll("}", "")
            .split(",")
            .map((tag, idx) => (
              <div key={idx} className="Breakdown-topic-claims-tag">
                <Badge bg="secondary">{t(tag)}</Badge>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

function ContentList({ content, refsMap }) {
  const { t } = useTranslation();

  return (
    <div className="Breakdown-content-list">
      <h3>{t("references")}</h3>
      {content.map((item, index) => (
        <ContentCard
          key={index}
          item={item}
          innerRef={refsMap[item.local_url]}
        />
      ))}
    </div>
  );
}

export default ContentList;
