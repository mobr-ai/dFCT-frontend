// src/components/landing/LandingSnapTopicFeed.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LandingTopicCard, getTopicId, getTopicMediaItems } from "./LandingTopicViews.jsx";
import { useVerticalSwipeFeed } from "../../hooks/useVerticalSwipeFeed.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function LandingSnapTopicFeed({
  topics,
  title,
  loadingMore,
  onNearEnd,
  labels,
}) {
  const safeTopics = useMemo(() => (Array.isArray(topics) ? topics : []), [topics]);
  const feedRef = useRef(null);
  const sectionRefs = useRef([]);
  const lastWheelAtRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [visualTick, setVisualTick] = useState(0);

  const goToIndex = useCallback(
    (nextIndex) => {
      if (!safeTopics.length) return;
      setActiveIndex(clamp(nextIndex, 0, safeTopics.length - 1));
    },
    [safeTopics.length]
  );

  const goDelta = useCallback(
    (delta) => {
      if (!safeTopics.length) return;
      setActiveIndex((current) => clamp(current + delta, 0, safeTopics.length - 1));
    },
    [safeTopics.length]
  );

  const scrollToFirstTopic = useCallback((behavior = "smooth") => {
    setActiveIndex(0);
    setVisualTick(0);
    lastWheelAtRef.current = 0;

    requestAnimationFrame(() => {
      const feed = feedRef.current;
      const firstSection = sectionRefs.current[0];

      feed?.scrollTo?.({ top: 0, left: 0, behavior });
      firstSection?.scrollIntoView?.({
        behavior,
        block: "start",
        inline: "nearest",
      });

      window.setTimeout(() => {
        feed?.scrollTo?.({ top: 0, left: 0, behavior });
      }, 80);
    });
  }, []);

  useEffect(() => {
    const handleLandingScrollTop = () => {
      scrollToFirstTopic("smooth");
    };

    window.addEventListener("dfct:landing-scroll-top", handleLandingScrollTop);
    document.addEventListener("dfct:landing-scroll-top", handleLandingScrollTop);

    return () => {
      window.removeEventListener("dfct:landing-scroll-top", handleLandingScrollTop);
      document.removeEventListener("dfct:landing-scroll-top", handleLandingScrollTop);
    };
  }, [scrollToFirstTopic]);

  const swipeHandlers = useVerticalSwipeFeed({
    activeIndex,
    itemCount: safeTopics.length,
    onChange: goToIndex,
  });

  useEffect(() => {
    if (!safeTopics.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => clamp(current, 0, safeTopics.length - 1));
  }, [safeTopics.length]);

  useEffect(() => {
    setVisualTick(0);
  }, [activeIndex]);

  useEffect(() => {
    const activeTopic = safeTopics[activeIndex];
    const mediaItems = getTopicMediaItems(activeTopic);

    if (!mediaItems || mediaItems.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setVisualTick((current) => (current + 1) % mediaItems.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [activeIndex, safeTopics]);

  useEffect(() => {
    const activeSection = sectionRefs.current[activeIndex];
    if (!activeSection) return;

    activeSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [activeIndex]);

  useEffect(() => {
    if (!onNearEnd || safeTopics.length < 1) return;
    if (activeIndex >= safeTopics.length - 3) onNearEnd();
  }, [activeIndex, onNearEnd, safeTopics.length]);

  const handleWheel = useCallback(
    (event) => {
      if (safeTopics.length <= 1) return;

      const absY = Math.abs(event.deltaY);
      const absX = Math.abs(event.deltaX);

      if (absY < 18 || absY < absX * 1.15) return;

      const now = performance.now();

      // One-by-one again, just with a lighter lock so repeated wheel gestures feel responsive.
      if (now - lastWheelAtRef.current < 145) {
        if (event.cancelable) if (event.cancelable) event.preventDefault();
        return;
      }

      lastWheelAtRef.current = now;
      if (event.cancelable) if (event.cancelable) event.preventDefault();

      goDelta(event.deltaY > 0 ? 1 : -1);
    },
    [goDelta, safeTopics.length]
  );


  useEffect(() => {
    const node = feedRef.current;
    if (!node) return undefined;

    node.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  if (!safeTopics.length) {
    return (
      <div className="Landing-snap-empty" role="status">
        {loadingMore ? "Loading topics..." : "No topics available."}
      </div>
    );
  }

  return (
    <div
      className="Landing-snap-feed"

      ref={feedRef}
      tabIndex={0}
      aria-label={title || "Recent topics"}
      {...swipeHandlers}
    >
      {safeTopics.map((topic, index) => {
        const topicId = getTopicId(topic) || `snap-topic-${index}`;
        const mediaItems = getTopicMediaItems(topic);
        const mediaIndex =
          mediaItems.length > 0
            ? index === activeIndex
              ? visualTick % mediaItems.length
              : 0
            : 0;

        return (
          <section
            key={topicId}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
            className={`Landing-snap-slide ${index === activeIndex ? "is-active" : ""}`}
            data-index={index}
          >
            <LandingTopicCard
              topic={topic}
              variant="spotlight"
              mediaIndex={mediaIndex}
              labels={labels}
              active={index === activeIndex}
            />
          </section>
        );
      })}

      {loadingMore && (
        <div className="Landing-snap-loading" role="status">
          Loading more topics...
        </div>
      )}
    </div>
  );
}
