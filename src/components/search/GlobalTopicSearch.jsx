import React, { useEffect, useMemo, useState } from "react";
import { Button, FormControl, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function getQueryFromLocation(location) {
  return new URLSearchParams(location.search).get("q") || "";
}

export default function GlobalTopicSearch({
  placement = "navbar",
  onSearchCommitted,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const currentQuery = useMemo(() => getQueryFromLocation(location), [location]);
  const [value, setValue] = useState(currentQuery);

  useEffect(() => {
    setValue(currentQuery);
  }, [currentQuery]);

  const updateSearchRoute = (nextValue, options = {}) => {
    const trimmed = nextValue.trim();
    const params = new URLSearchParams(location.search);

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const currentPath =
      location.pathname === "/" ||
      location.pathname === "/topics" ||
      location.pathname === "/mytopics"
        ? location.pathname
        : "/";

    const nextSearch = params.toString();
    const nextUrl = `${currentPath}${nextSearch ? `?${nextSearch}` : ""}`;

    if (`${location.pathname}${location.search}` === nextUrl) return;

    navigate(nextUrl, { replace: options.replace ?? true });
  };

  const commitSearch = (nextValue) => {
    updateSearchRoute(nextValue);
    onSearchCommitted?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    window.clearTimeout(window.__dfctGlobalSearchTimer);
    commitSearch(value);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setValue(nextValue);

    window.clearTimeout(window.__dfctGlobalSearchTimer);
    window.__dfctGlobalSearchTimer = window.setTimeout(() => {
      updateSearchRoute(nextValue, { replace: true });
    }, 650);
  };

  const clearSearch = () => {
    window.clearTimeout(window.__dfctGlobalSearchTimer);
    setValue("");
    updateSearchRoute("", { replace: true });
  };

  return (
    <form
      className={`GlobalTopicSearch GlobalTopicSearch-${placement}`}
      onSubmit={handleSubmit}
      role="search"
      aria-label={t("landingFeed.exploreLabel")}
    >
      {placement === "sidebar" && (
        <div className="GlobalTopicSearch-copy">
          <strong>{t("landingFeed.exploreLabel")}</strong>
          <small>{t("landingFeed.exploreSubtitle")}</small>
        </div>
      )}

      <InputGroup className="GlobalTopicSearch-inputGroup">
        <FormControl
          value={value}
          onChange={handleChange}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
        {value ? (
          <Button
            type="button"
            className="GlobalTopicSearch-button"
            variant="outline-secondary"
            onClick={clearSearch}
            aria-label={t("cancel")}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        ) : (
          <Button
            type="submit"
            className="GlobalTopicSearch-button"
            variant="outline-secondary"
            aria-label={t("landingFeed.exploreLabel")}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </Button>
        )}
      </InputGroup>
    </form>
  );
}
