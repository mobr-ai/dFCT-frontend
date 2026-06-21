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
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import "./../styles/NavigationSidebar.css";
import GlobalTopicSearch from "./search/GlobalTopicSearch";

function NavigationSidebar({ isOpen, setIsOpen, isPinned = false, setIsPinned }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (window.innerWidth < 1024) return null;

  const closeIfUnpinned = () => {
    if (!isPinned) setIsOpen(false);
  };

  const togglePinned = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsOpen(nextPinned);
  };

  return (
    <Menu
      className={`Navbar-navigation-bar ${isPinned ? "is-pinned" : ""}`}
      isOpen={isOpen || isPinned}
      customBurgerIcon={false}
      noOverlay={isPinned}
      disableOverlayClick={isPinned}
      onStateChange={(state) => {
        if (!isPinned) setIsOpen(state.isOpen);
      }}
    >
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
        to="/gov"
        className={`Navbar-item ${
          location.pathname.includes("/gov") ? "active" : ""
        }`}
      >
        <FontAwesomeIcon icon={faGavel} /> {t("governance")}
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
    </Menu>
  );
}

export default NavigationSidebar;
