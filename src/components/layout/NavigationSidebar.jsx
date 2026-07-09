import React from "react";
import Button from "react-bootstrap/Button";
import { slide as Menu } from "react-burger-menu";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMagnifyingGlassArrowRight,
  faFolderOpen,
  faCog,
  faGavel,
  faThumbtack,
  faClipboardCheck,
  faCreditCard,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "../../styles/NavigationSidebar.css";
import GlobalTopicSearch from "../search/GlobalTopicSearch";
import { useAdminAccess } from "../../hooks/useAdminAccess";

const SIDEBAR_DESKTOP_QUERY = "(min-width: 1024px)";

function useSidebarDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia(SIDEBAR_DESKTOP_QUERY).matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia(SIDEBAR_DESKTOP_QUERY);
    const update = () => setIsDesktop(Boolean(query.matches));

    update();

    if (query.addEventListener) {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return isDesktop;
}

function NavigationSidebarContent({
  isPinned,
  setIsPinned,
  setIsOpen,
  closeIfUnpinned,
  userData,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = useAdminAccess(userData);

  const togglePinned = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsOpen(nextPinned);
  };

  return (
    <div className="Navbar-sidebar-content">
      <div className="Navbar-sidebar-header">
        <div>
          <div className="Navbar-sidebar-eyebrow">d-FCT</div>
          <div className="Navbar-sidebar-title">{t("navigation")}</div>
        </div>

        <button
          type="button"
          className={`Navbar-pin-btn ${isPinned ? "is-active" : ""}`}
          onClick={togglePinned}
          title={isPinned ? t("sidebarUnpin") : t("sidebarPin")}
        >
          <FontAwesomeIcon icon={faThumbtack} />
        </button>
      </div>

      <Button
        variant="dark"
        size="md"
        className="Navbar-button"
        onClick={() => {
          navigate("/submit");
          closeIfUnpinned();
        }}
      >
        <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} />
        {t("verifyContent")}
      </Button>

      <GlobalTopicSearch
        placement="sidebar"
        onSearchCommitted={closeIfUnpinned}
      />

      <div className="Navbar-topics-title">{t("navigation")}</div>

      <Link
        onClick={closeIfUnpinned}
        to="/"
        className={`Navbar-item ${location.pathname === "/" ? "active" : ""}`}
      >
        <FontAwesomeIcon icon={faHome} /> {t("home")}
      </Link>

      {isAdmin && (
        <Link
          onClick={closeIfUnpinned}
          to="/admin"
          className={`Navbar-item ${
            location.pathname.startsWith("/admin") ? "active" : ""
          }`}
        >
          <FontAwesomeIcon icon={faUserShield} /> {t("adminBilling.navAdmin")}
        </Link>
      )}

      <Link
        onClick={closeIfUnpinned}
        to="/mytopics"
        className={`Navbar-item ${
          location.pathname.includes("/mytopics") ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faFolderOpen} /> {t("myTopics")}
      </Link>
      <Link
        onClick={closeIfUnpinned}
        to="/workbench/topic-review"
        className={`Navbar-item ${
          location.pathname.includes("/workbench/topic-review") ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faClipboardCheck} /> {t("topicReview.nav")}
      </Link>

      <Link
        onClick={closeIfUnpinned}
        to="/gov"
        className={`Navbar-item ${
          location.pathname.includes("/gov") ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faGavel} /> {t("governance")}
      </Link>

      <Link
        onClick={closeIfUnpinned}
        to="/billing"
        className={`Navbar-item ${
          location.pathname === "/billing" ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faCreditCard} /> {t("billingAccess.nav")}
      </Link>

      <Link
        onClick={closeIfUnpinned}
        to="/settings"
        className={`Navbar-item ${
          location.pathname === "/settings" ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faCog} /> {t("settings")}
      </Link>
    </div>
  );
}

function NavigationSidebar({
  isOpen,
  setIsOpen,
  isPinned = false,
  setIsPinned,
  userData,
}) {
  const isDesktop = useSidebarDesktop();

  let effectiveUserData = userData;
  if (!effectiveUserData && typeof window !== "undefined") {
    try {
      effectiveUserData = JSON.parse(
        window.localStorage.getItem("userData") || "null",
      );
    } catch {
      effectiveUserData = null;
    }
  }

  if (!isDesktop) return null;

  const closeIfUnpinned = () => {
    if (!isPinned) setIsOpen(false);
  };

  const content = (
    <NavigationSidebarContent
      isPinned={isPinned}
      setIsPinned={setIsPinned}
      setIsOpen={setIsOpen}
      closeIfUnpinned={closeIfUnpinned}
      userData={effectiveUserData}
    />
  );

  if (isPinned) {
    return (
      <aside
        className="Navbar-navigation-bar dfct-navigation-sidebar is-pinned"
        aria-label="d-FCT navigation"
      >
        {content}
      </aside>
    );
  }

  return (
    <Menu
      width="18rem"
      className="Navbar-navigation-bar dfct-navigation-sidebar"
      isOpen={isOpen}
      customBurgerIcon={false}
      onStateChange={(state) => setIsOpen(state.isOpen)}
    >
      {content}
    </Menu>
  );
}

export default NavigationSidebar;
