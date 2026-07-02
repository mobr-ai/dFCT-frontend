// src/components/landing/LandingTopicViews.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faClock } from "@fortawesome/free-solid-svg-icons";

const PLACEHOLDER_IMAGE_URL = "/placeholder.png";

const rootMediaUrlKeys = [
  "cover_url", "coverUrl", "cover",
  "image_url", "imageUrl", "image",
  "thumbnail_url", "thumbnailUrl", "thumbnail",
  "thumb_url", "thumbUrl", "thumb",
  "poster_url", "posterUrl", "poster",
  "preview_url", "previewUrl", "preview",
  "media_url", "mediaUrl",
  "video_url", "videoUrl",
  "audio_url", "audioUrl",
];

const entryMediaUrlKeys = [
  ...rootMediaUrlKeys,
  "local_url", "localUrl",
  "file_url", "fileUrl",
  "original_url", "originalUrl",
  "download_url", "downloadUrl",
  "s3_url", "s3Url",
  "source_url", "sourceUrl",
  "asset_url", "assetUrl",
  "content_url", "contentUrl",
  "url", "src",
];

const collectionKeys = [
  "contents", "Contents",
  "content_items", "contentItems",
  "content_list", "contentList",
  "topic_contents", "topicContents",
  "topic_content", "topicContent",
  "content", "Content",
  "media", "Media",
  "files", "Files",
  "attachments", "Attachments",
  "evidence", "Evidence",
  "resources", "Resources",
  "uploads", "Uploads",
  "images", "Images",
  "videos", "Videos",
  "audios", "Audios",
];

const routeUrlKeys = [
  "topic_url", "topicUrl",
  "topic_path", "topicPath",
  "share_url", "shareUrl",
  "share_path", "sharePath",
  "permalink",
  "href",
  "path",
];

const imageUrlRe = /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i;
const videoUrlRe = /\.(m4v|mov|mp4|ogg|ogv|webm)(\?|#|$)/i;
const audioUrlRe = /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|weba)(\?|#|$)/i;

const normalizeUrl = (value) => (typeof value === "string" ? value.trim() : "");

const isPlaceholderUrl = (url) => {
  const normalized = normalizeUrl(url);
  return !normalized || normalized === PLACEHOLDER_IMAGE_URL || normalized.endsWith("/placeholder.png");
};

const getString = (...values) =>
  values.find((value) => typeof value === "string" && value.trim())?.trim() || "";

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return [value];
  return [];
};

const getNested = (obj, path) =>
  path.split(".").reduce((current, key) => (
    current && typeof current === "object" ? current[key] : undefined
  ), obj);

export const getTopicId = (topic) =>
  topic?.topic_id ??
  topic?.topicId ??
  topic?.id ??
  topic?._id ??
  topic?.topic?.id ??
  topic?.topic?.topic_id ??
  "";

const getOwnerId = (topic) =>
  topic?.user_id ??
  topic?.userId ??
  topic?.owner_user_id ??
  topic?.ownerUserId ??
  topic?.author_user_id ??
  topic?.authorUserId ??
  topic?.creator_user_id ??
  topic?.creatorUserId ??
  topic?.created_by_user_id ??
  topic?.createdByUserId ??
  topic?.submitter_id ??
  topic?.submitterId ??
  topic?.created_by ??
  topic?.createdBy ??
  getNested(topic, "user.user_id") ??
  getNested(topic, "user.userId") ??
  getNested(topic, "user.id") ??
  getNested(topic, "author.user_id") ??
  getNested(topic, "author.userId") ??
  getNested(topic, "author.id") ??
  getNested(topic, "owner.user_id") ??
  getNested(topic, "owner.userId") ??
  getNested(topic, "owner.id") ??
  getNested(topic, "creator.user_id") ??
  getNested(topic, "creator.userId") ??
  getNested(topic, "creator.id") ??
  "";

export const getTopicTitle = (topic) =>
  getString(topic?.title, topic?.name, topic?.claim, topic?.headline) || "Untitled topic";

export const getTopicDescription = (topic) =>
  getString(topic?.description, topic?.summary, topic?.context, topic?.claim_text, topic?.claimText);

const toInternalPath = (url) => {
  const raw = normalizeUrl(url);
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Ignore invalid route-like values.
  }

  return "";
};

export const getTopicHref = (topic) => {
  for (const key of routeUrlKeys) {
    const internalPath = toInternalPath(topic?.[key]);
    if (internalPath) return internalPath;
  }

  const topicId = getTopicId(topic);
  if (!topicId) return "/";

  const ownerId = getOwnerId(topic);
  return `/t/${ownerId || 0}/${topicId}`;
};

const getUpdatedLabel = (topic) => {
  const value =
    topic?.elapsed_time ||
    topic?.elapsedTime ||
    topic?.updated_ago ||
    topic?.updatedAgo ||
    topic?.created_ago ||
    topic?.createdAgo ||
    "";

  if (!value) return "";
  const label = String(value).trim();
  if (!label) return "";
  return /ago$/i.test(label) || /^updated/i.test(label) ? label : `Updated ${label}`;
};

const declaredType = (entry) =>
  String(
    entry?.content_type ||
    entry?.contentType ||
    entry?.mime_type ||
    entry?.mimeType ||
    entry?.media_type ||
    entry?.mediaType ||
    entry?.file_type ||
    entry?.fileType ||
    entry?.type ||
    ""
  ).toLowerCase();

const inferType = (entry, url, key = "") => {
  const declared = declaredType(entry);
  const loweredKey = String(key).toLowerCase();

  if (declared.includes("audio") || loweredKey.includes("audio") || audioUrlRe.test(url)) return "audio";
  if (declared.includes("video") || loweredKey.includes("video") || videoUrlRe.test(url)) return "video";
  if (declared.includes("image") || loweredKey.includes("image") || imageUrlRe.test(url)) return "image";

  return "image";
};

const isLikelyMediaUrl = (entry, url, key = "") => {
  if (!url) return false;

  const declared = declaredType(entry);
  const loweredKey = String(key).toLowerCase();

  if (declared.includes("image") || declared.includes("video") || declared.includes("audio")) return true;
  if (url.startsWith("data:image/") || url.startsWith("data:video/") || url.startsWith("data:audio/")) return true;
  if (imageUrlRe.test(url) || videoUrlRe.test(url) || audioUrlRe.test(url)) return true;

  return (
    loweredKey.includes("cover") ||
    loweredKey.includes("image") ||
    loweredKey.includes("media") ||
    loweredKey.includes("poster") ||
    loweredKey.includes("preview") ||
    loweredKey.includes("thumbnail") ||
    loweredKey.includes("thumb") ||
    loweredKey.includes("video") ||
    loweredKey.includes("audio")
  );
};

const getPoster = (entry) =>
  normalizeUrl(
    entry?.poster_url ||
    entry?.posterUrl ||
    entry?.poster ||
    entry?.thumbnail_url ||
    entry?.thumbnailUrl ||
    entry?.thumbnail ||
    entry?.thumb_url ||
    entry?.thumbUrl ||
    entry?.thumb ||
    entry?.preview_url ||
    entry?.previewUrl ||
    entry?.preview ||
    entry?.cover_url ||
    entry?.coverUrl ||
    entry?.cover ||
    entry?.image_url ||
    entry?.imageUrl ||
    entry?.image
  );

const hasItemUrl = (items, url) => items.some((item) => item.url === url);

const pushMedia = (items, entry, rawUrl, key = "") => {
  const url = normalizeUrl(rawUrl);
  if (!isLikelyMediaUrl(entry, url, key)) return;
  if (hasItemUrl(items, url)) return;

  const type = inferType(entry, url, key);
  const poster = getPoster(entry);

  items.push({
    url,
    type,
    poster: type === "audio" ? PLACEHOLDER_IMAGE_URL : poster,
    fallbackUrl: type === "audio" ? PLACEHOLDER_IMAGE_URL : poster || PLACEHOLDER_IMAGE_URL,
    backdropUrl: type === "image" ? url : poster || "",
    alt: getString(entry?.alt, entry?.title, entry?.filename, entry?.file_name, entry?.name),
    source: key,
  });
};

const mediaPriority = (item) => {
  if (item?.type === "image") return 0;
  if (item?.type === "video") return 1;
  if (item?.type === "audio") return 2;
  if (item?.type === "placeholder") return 3;
  return 4;
};

export const getTopicMediaItems = (topic) => {
  const items = [];
  if (!topic || typeof topic !== "object") return items;

  rootMediaUrlKeys.forEach((key) => pushMedia(items, topic, topic[key], key));

  collectionKeys.forEach((key) => {
    asArray(topic[key]).forEach((entry) => {
      if (typeof entry === "string") {
        pushMedia(items, { url: entry }, entry, key);
        return;
      }

      if (!entry || typeof entry !== "object") return;

      entryMediaUrlKeys.forEach((urlKey) => {
        pushMedia(items, entry, entry[urlKey], urlKey);
      });
    });
  });

  const firstImage = items.find((item) => item.type === "image" && !isPlaceholderUrl(item.url));

  const normalized = items.map((item) => {
    if (item.type !== "video") return item;

    const poster = item.poster || firstImage?.url || "";
    return {
      ...item,
      poster,
      fallbackUrl: poster || PLACEHOLDER_IMAGE_URL,
      backdropUrl: poster || "",
    };
  });

  if (normalized.length === 0) {
    normalized.push({
      url: PLACEHOLDER_IMAGE_URL,
      type: "placeholder",
      poster: PLACEHOLDER_IMAGE_URL,
      fallbackUrl: PLACEHOLDER_IMAGE_URL,
      backdropUrl: "",
      alt: getTopicTitle(topic),
      source: "placeholder",
    });
  }

  return normalized.sort((a, b) => mediaPriority(a) - mediaPriority(b));
};

function useDesktopHoverMode() {
  const [desktopHover, setDesktopHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setDesktopHover(Boolean(query.matches));

    update();

    if (query.addEventListener) {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return desktopHover;
}

function useVisiblePlayback(ref, enabled) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === "undefined") {
      setVisible(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.55));
      },
      {
        threshold: [0, 0.35, 0.55, 0.75, 1],
        rootMargin: "80px 0px",
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [enabled, ref]);

  return visible;
}


const createdDateKeys = [
  "created_at",
  "createdAt",
  "created",
  "created_time",
  "createdTime",
  "created_date",
  "createdDate",
  "submitted_at",
  "submittedAt",
  "published_at",
  "publishedAt",
  "publication_date",
  "publicationDate",
  "inserted_at",
  "insertedAt",
];

const updatedDateKeys = [
  "updated_at",
  "updatedAt",
  "updated",
  "last_updated",
  "lastUpdated",
  "modified_at",
  "modifiedAt",
  "updated_time",
  "updatedTime",
  "reviewed_at",
  "reviewedAt",
  "status_updated_at",
  "statusUpdatedAt",
];

const normalizeFeedLocale = (language) => {
  const raw = String(language || "").toLowerCase();

  if (raw.startsWith("pt")) return "pt-BR";
  if (raw.startsWith("en")) return "en-US";

  return undefined;
};

const parseTopicDate = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;

    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(normalized)) {
      return parseTopicDate(numeric);
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const getTopicDateByKeys = (topic, keys) => {
  for (const key of keys) {
    const date = parseTopicDate(topic?.[key]);
    if (date) return date;
  }

  return null;
};

const formatTopicDateShort = (date, locale) => {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
};

const formatTopicDateFull = (date, locale) => {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
};

const formatTopicRelative = (date, locale) => {
  if (!date) return "";

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const divisions = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];

  const [unit, amountMs] =
    divisions.find(([, amount]) => absMs >= amount) || ["second", 1000];

  const value = Math.round(diffMs / amountMs);

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
  } catch {
    return formatTopicDateShort(date, locale);
  }
};

const localizeElapsedLabel = (label, locale) => {
  const raw = String(label || "")
    .replace(/^updated\s+/i, "")
    .trim();

  if (!raw) return "";

  const lowered = raw.toLowerCase();

  const fixedMap = {
    "just now": ["second", 0],
    "now": ["second", 0],
    "today": ["day", 0],
    "yesterday": ["day", -1],
    "last week": ["week", -1],
    "last month": ["month", -1],
    "last year": ["year", -1],
  };

  if (fixedMap[lowered]) {
    const [unit, value] = fixedMap[lowered];

    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
    } catch {
      return raw;
    }
  }

  const agoMatch = lowered.match(
    /^(?:about\s+)?(?:(a|an)|(\d+))\s+(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/
  );

  if (!agoMatch) return raw;

  const value = agoMatch[1] ? 1 : Number(agoMatch[2]);
  const unitMap = {
    second: "second",
    seconds: "second",
    minute: "minute",
    minutes: "minute",
    hour: "hour",
    hours: "hour",
    day: "day",
    days: "day",
    week: "week",
    weeks: "week",
    month: "month",
    months: "month",
    year: "year",
    years: "year",
  };

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -value,
      unitMap[agoMatch[3]]
    );
  } catch {
    return raw;
  }
};

function TopicTimestampOverlay({ topic, variant }) {
  const { t, i18n } = useTranslation();
  const locale = normalizeFeedLocale(i18n.resolvedLanguage || i18n.language);

  const createdDate = getTopicDateByKeys(topic, createdDateKeys);
  const updatedDate = getTopicDateByKeys(topic, updatedDateKeys);

  if (!createdDate && !updatedDate && !getUpdatedLabel(topic)) return null;

  const createdLabel = t("landingFeed.timestamp.created", "Created");
  const updatedLabel = t("landingFeed.timestamp.lastUpdate", "Last update");

  const createdShort = formatTopicDateShort(createdDate, locale);
  const updatedHuman =
    localizeElapsedLabel(getUpdatedLabel(topic), locale) ||
    formatTopicRelative(updatedDate, locale) ||
    formatTopicDateShort(updatedDate, locale);

  const title = [
    createdDate ? `${createdLabel}: ${formatTopicDateFull(createdDate, locale)}` : "",
    updatedDate ? `${updatedLabel}: ${formatTopicDateFull(updatedDate, locale)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className={`Landing-topic-timestamp Landing-topic-timestamp-${variant}`} title={title}>
      {createdShort && (
        <span className="Landing-topic-timestamp-item">
          <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
          <span>{createdShort}</span>
        </span>
      )}
      {updatedHuman && (
        <span className="Landing-topic-timestamp-item">
          <FontAwesomeIcon icon={faClock} aria-hidden="true" />
          <span>{updatedHuman}</span>
        </span>
      )}
    </div>
  );
}


function MediaPlaceholder({ state = "unavailable", title }) {
  const isLoading = state === "loading";

  return (
    <div className={`Landing-topic-media-placeholder ${isLoading ? "is-loading" : "is-unavailable"}`}>
      <img
        className="Landing-topic-media-placeholder-img"
        src={PLACEHOLDER_IMAGE_URL}
        alt={isLoading ? "" : title}
        aria-hidden={isLoading}
        loading={isLoading ? "eager" : "lazy"}
        decoding="async"
      />
      {isLoading && (
        <span className="Landing-topic-media-loader" aria-hidden="true">
          <span />
        </span>
      )}
    </div>
  );
}

function TopicImage({ src, fallbackSrc = PLACEHOLDER_IMAGE_URL, alt, compact }) {
  const imgRef = useRef(null);
  const initialSrc = normalizeUrl(src) || fallbackSrc || PLACEHOLDER_IMAGE_URL;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [loaded, setLoaded] = useState(isPlaceholderUrl(initialSrc));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const nextSrc = normalizeUrl(src) || fallbackSrc || PLACEHOLDER_IMAGE_URL;
    setCurrentSrc(nextSrc);
    setLoaded(isPlaceholderUrl(nextSrc));
    setFailed(false);
  }, [src, fallbackSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || isPlaceholderUrl(currentSrc)) return undefined;

    const markIfReady = () => {
      if (img.complete && img.naturalWidth > 0) {
        setLoaded(true);
      }
    };

    markIfReady();
    const timer = window.setTimeout(markIfReady, 120);

    return () => window.clearTimeout(timer);
  }, [currentSrc]);

  if (failed || !currentSrc || isPlaceholderUrl(currentSrc)) {
    return <MediaPlaceholder state="unavailable" title={alt} />;
  }

  return (
    <>
      {!loaded && <MediaPlaceholder state="loading" title={alt} />}
      <img
        ref={imgRef}
        className={`Landing-topic-visual-media ${loaded ? "is-ready" : "is-loading"}`}
        src={currentSrc}
        alt={alt}
        loading={compact ? "lazy" : "eager"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          const nextFallback = normalizeUrl(fallbackSrc) || PLACEHOLDER_IMAGE_URL;

          if (currentSrc !== nextFallback) {
            setCurrentSrc(nextFallback);
            setLoaded(isPlaceholderUrl(nextFallback));
            return;
          }

          setFailed(true);
          setLoaded(true);
        }}
      />
    </>
  );
}

function TopicVideo({ media, title, active = true, compact = false }) {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const desktopHoverMode = useDesktopHoverMode();
  const mobileVisible = useVisiblePlayback(frameRef, compact && !desktopHoverMode);

  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const fallbackSrc = media?.poster || media?.fallbackUrl || PLACEHOLDER_IMAGE_URL;
  const hasRealPoster = !isPlaceholderUrl(fallbackSrc);

  const shouldPlay = compact
    ? desktopHoverMode
      ? hovered
      : mobileVisible
    : active;

  useEffect(() => {
    setFailed(false);
    setReady(false);
  }, [media?.url, fallbackSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;

    if (shouldPlay) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          // Muted autoplay may still be denied; keep the loading/preview state stable.
        });
      }
    } else {
      video.pause();
    }
  }, [shouldPlay, failed]);

  const markReady = () => {
    setReady(true);
  };

  const handleLoadedMetadata = (event) => {
    const video = event.currentTarget;

    try {
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < 0.05) {
        video.currentTime = Math.min(0.14, video.duration / 4);
      }
    } catch {
      // Remote videos may reject early seeking.
    }
  };

  if (failed) {
    return (
      <div className="Landing-topic-video-frame" ref={frameRef}>
        <MediaPlaceholder state="unavailable" title={title} />
        <span className="Landing-topic-visual-type-badge">Video</span>
      </div>
    );
  }

  return (
    <div
      className="Landing-topic-video-frame"
      ref={frameRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!ready && <MediaPlaceholder state="loading" title={title} />}

      <video
        ref={videoRef}
        className={`Landing-topic-visual-media Landing-topic-visual-video ${ready ? "is-ready" : "is-loading"}`}
        src={media.url}
        poster={hasRealPoster ? fallbackSrc : undefined}
        preload="metadata"
        muted
        loop
        playsInline
        autoPlay={!compact && active}
        controls={false}
        aria-label={title}
        onLoadedMetadata={handleLoadedMetadata}
        onLoadedData={markReady}
        onSeeked={markReady}
        onPlaying={markReady}
        onError={() => setFailed(true)}
      />

      <span className="Landing-topic-visual-type-badge">Video</span>
    </div>
  );
}

function TopicAudio({ media, title }) {
  return (
    <>
      <MediaPlaceholder state="unavailable" title={media?.alt || title} />
      <span className="Landing-topic-visual-type-badge">Audio</span>
    </>
  );
}

function TopicVisualBokeh({ media, backdropUrl, compact = false, active = true }) {
  const imageBackdrop = normalizeUrl(backdropUrl);
  const videoBackdrop =
    media?.type === "video" && !compact ? normalizeUrl(media?.url) : "";
  const poster =
    media?.poster && !isPlaceholderUrl(media.poster) ? media.poster : undefined;

  if (imageBackdrop) {
    return (
      <div
        className="Landing-topic-visual-bokeh Landing-topic-visual-bokeh-image"
        aria-hidden="true"
      >
        <img
          className="Landing-topic-visual-bokeh-media Landing-topic-visual-bokeh-media-fill"
          src={imageBackdrop}
          alt=""
          loading={compact ? "lazy" : "eager"}
          decoding="async"
        />
        <img
          className="Landing-topic-visual-bokeh-media Landing-topic-visual-bokeh-media-contain"
          src={imageBackdrop}
          alt=""
          loading={compact ? "lazy" : "eager"}
          decoding="async"
        />
      </div>
    );
  }

  if (videoBackdrop) {
    return (
      <div
        className="Landing-topic-visual-bokeh Landing-topic-visual-bokeh-video"
        aria-hidden="true"
      >
        <video
          className="Landing-topic-visual-bokeh-media Landing-topic-visual-bokeh-media-fill"
          src={videoBackdrop}
          poster={poster}
          preload={active ? "metadata" : "none"}
          muted
          loop
          playsInline
          autoPlay={active}
          controls={false}
          tabIndex={-1}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;

            try {
              if (
                Number.isFinite(video.duration) &&
                video.duration > 0 &&
                video.currentTime < 0.05
              ) {
                video.currentTime = Math.min(0.16, video.duration / 4);
              }
            } catch {
              // Some remote videos reject early seeking.
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="Landing-topic-visual-bokeh Landing-topic-visual-bokeh-fallback"
      aria-hidden="true"
    />
  );
}

function selectMediaForCard(mediaItems, variant, mediaIndex) {
  if (!mediaItems.length) return null;

  if (variant === "grid" || variant === "list") {
    return (
      mediaItems.find((item) => item.type === "video") ||
      mediaItems.find((item) => item.type === "image") ||
      mediaItems[0]
    );
  }

  return mediaItems[mediaIndex % mediaItems.length];
}

function LandingTopicMedia({ media, title, compact = false, active = true, timestampOverlay = null }) {
  const displayMedia = media || {
    type: "placeholder",
    url: PLACEHOLDER_IMAGE_URL,
    fallbackUrl: PLACEHOLDER_IMAGE_URL,
    backdropUrl: "",
  };

  const backdropUrl =
    displayMedia?.type === "image"
      ? displayMedia.url
      : displayMedia?.poster && !isPlaceholderUrl(displayMedia.poster)
        ? displayMedia.poster
        : displayMedia?.backdropUrl && !isPlaceholderUrl(displayMedia.backdropUrl)
          ? displayMedia.backdropUrl
          : "";

  return (
    <div className="Landing-topic-visual-frame">
      <TopicVisualBokeh
        media={displayMedia}
        backdropUrl={backdropUrl}
        compact={compact}
        active={active}
      />
      <div className="Landing-topic-visual-inner">
        {displayMedia?.type === "audio" ? (
          <TopicAudio media={displayMedia} title={title} />
        ) : displayMedia?.type === "video" && displayMedia?.url ? (
          <TopicVideo
            media={displayMedia}
            title={title}
            active={active}
            compact={compact}
          />
        ) : displayMedia?.type === "image" && displayMedia?.url ? (
          <TopicImage
            src={displayMedia.url}
            fallbackSrc={displayMedia.fallbackUrl || PLACEHOLDER_IMAGE_URL}
            alt={displayMedia.alt || title}
            compact={compact}
          />
        ) : (
          <MediaPlaceholder state="unavailable" title={title} />
        )}
        {timestampOverlay}
      </div>
    </div>
  );
}

export function LandingTopicCard({
  topic,
  variant = "spotlight",
  mediaIndex = 0,
  labels = {},
  active = true,
}) {
  const mediaItems = getTopicMediaItems(topic);
  const media = selectMediaForCard(mediaItems, variant, mediaIndex);

  const title = getTopicTitle(topic);
  const description = getTopicDescription(topic);
  const updated = getUpdatedLabel(topic);
  const href = getTopicHref(topic);

  const isGrid = variant === "grid";
  const isList = variant === "list";
  const isCompact = isGrid || isList;
  const showDescription = variant === "spotlight" || isList;

  return (
    <article className={`Landing-topic-card Landing-topic-card-${variant}`}>
      {variant !== "spotlight" && <TopicTimestampOverlay topic={topic} variant={variant} />}
      <Link
        className="Landing-topic-card-link"
        to={href}
        aria-label={`${labels.openTopic || "Open topic"}: ${title}`}
      >
        <LandingTopicMedia
          media={media}
          title={title}
          compact={isCompact}
          active={active}
          timestampOverlay={
            variant === "spotlight" ? (
              <TopicTimestampOverlay topic={topic} variant={variant} />
            ) : null
          }
        />

        <div className="Landing-topic-copy">
          {updated && <div className="Landing-topic-kicker">{updated}</div>}
          <h3>{title}</h3>
          {showDescription && description && <p>{description}</p>}
        </div>
      </Link>
    </article>
  );
}

export function LandingCompactTopicGrid({ topics, labels }) {
  const safeTopics = Array.isArray(topics) ? topics : [];

  return (
    <div className="Landing-compact-view Landing-compact-grid" aria-label={labels?.grid || "Grid view"}>
      {safeTopics.map((topic, index) => (
        <LandingTopicCard
          key={getTopicId(topic) || `grid-topic-${index}`}
          topic={topic}
          variant="grid"
          labels={labels}
        />
      ))}
    </div>
  );
}

export function LandingCompactTopicList({ topics, labels }) {
  const safeTopics = Array.isArray(topics) ? topics : [];

  return (
    <div className="Landing-compact-view Landing-compact-list" aria-label={labels?.list || "List view"}>
      {safeTopics.map((topic, index) => (
        <LandingTopicCard
          key={getTopicId(topic) || `list-topic-${index}`}
          topic={topic}
          variant="list"
          labels={labels}
        />
      ))}
    </div>
  );
}
