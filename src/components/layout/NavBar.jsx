import "../../styles/NavBar.css";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMagnifyingGlassArrowRight,
  faFolderOpen,
  faCog,
  faGavel,
  faCreditCard,
  faUserShield,
  faCircleQuestion,
  faGlobe,
  faClipboardCheck,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import avatarImg from "../../icons/avatar.png";
import AnimatedBrand from "../branding/AnimatedBrand";
import GlobalTopicSearch from "../search/GlobalTopicSearch";
import { useAdminAccess } from "../../hooks/useAdminAccess";
import { useBillingStatus } from "../../hooks/useBillingStatus";

function numberFrom(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function formatCredits(value) {
  const n = numberFrom(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(6).replace(/\.?0+$/, "");
}

function compactUserName(user) {
  const value = user?.username || user?.email || "d-FCT user";
  return value.length > 16 ? `${value.slice(0, 13)}…` : value;
}

function NavBar(props) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = useAdminAccess(props.userData);
  const billingStatus = useBillingStatus(props.userData);
  const billingCredits = formatCredits(
    billingStatus.balance?.credits_available ??
      billingStatus.balance?.available_credits ??
      billingStatus.balance?.balance,
  );
  const freeTopicsRemaining = numberFrom(
    billingStatus.access?.free_topics_remaining ??
      billingStatus.access?.freeTopicsRemaining,
  );
  const accessTier =
    billingStatus.access?.access_tier || billingStatus.access?.tier || "standard";
  const hasCreditBalance = numberFrom(
    billingStatus.balance?.credits_available,
    billingStatus.balance?.available_credits,
    billingStatus.balance?.balance,
  ) > 0;
  const billingStatusLabel = hasCreditBalance
    ? `${billingCredits} DFCT`
    : t("billingAccess.freeTopicsCompact", {
        count: freeTopicsRemaining,
      });
  const showBillingStatus =
    Boolean(props.userData) && billingStatus.loaded && !billingStatus.apiUnavailable;

  const topClick = useCallback(() => {
    const clearSearchHome = () => {
      navigate("/", { replace: true });
      requestAnimationFrame(() => {
        document
          .getElementsByClassName("bm-menu")[0]
          ?.scrollTo({ top: 0, behavior: "smooth" });
        document
          .getElementsByClassName("Landing-middle-column")[0]
          ?.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    };

    if (window.location.pathname.startsWith("/proposal")) {
      navigate("/gov");
      return;
    }

    clearSearchHome();
  }, [navigate]);

  const logout = () => {
    props.setUser(null);
  };

  const login = () => {
    navigate("/login");
  };

  const changeLanguage = (lng) => {
    localStorage.setItem("i18nextLng", lng); // i18next checks this on init
    window.history.replaceState(null, "", window.location.pathname);
    navigate(0); // Reload the page to trigger language change
  };

  const userMenu = props.userData && (
    <Container id="navbar-user-dropdown-container">
      <Image
        src={props.userData.avatar ? props.userData.avatar : avatarImg}
        alt="Profile avatar"
        title={
          (props.userData.username || "").length > 16
            ? props.userData.username
            : null
        }
        onError={(e) => (e.target.src = avatarImg)}
        roundedCircle
        className="Navbar-user-avatar"
      />
      <span className="Navbar-user-name">{compactUserName(props.userData)}</span>
      {showBillingStatus && (
        <span className="Navbar-billing-status-badge">
          {billingStatusLabel}
        </span>
      )}
    </Container>
  );

  return (
    <Navbar
      data-bs-theme="dark"
      expand="lg"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      className="bg-body-tertiary justify-content-end"
      sticky="top"
    >
      <Container>
        <Navbar.Brand className="Navbar-brand-container" onClick={topClick}>
          <img
            alt=""
            src="/favicon.png"
            width="30"
            height="30"
            className="d-inline-block align-top Navbar-brand-img"
          />{" "}
          <AnimatedBrand enabled={Boolean(props.userData)} />
        </Navbar.Brand>
        {props.userData && <GlobalTopicSearch placement="navbar" />}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          {props.userData && (
            <>
              <div className="Navbar-mobile-search d-lg-none">
                <GlobalTopicSearch placement="mobile" />
              </div>
              <Nav className="me-auto d-lg-none Navbar-mobile-menu">
                <Nav.Link
                  onClick={() => {
                    navigate("/");
                    setExpanded(false);
                  }}
                  active={location.pathname === "/"}
                >
                  <FontAwesomeIcon icon={faHome} /> {t("home")}
                </Nav.Link>

                <Nav.Link
                  onClick={() => {
                    navigate("/submit");
                    setExpanded(false);
                  }}
                  active={location.pathname === "/submit"}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} /> {t("verifyContent")}
                </Nav.Link>

                <NavDropdown.Divider />

                <Nav.Link
                  onClick={() => {
                    navigate("/mytopics");
                    setExpanded(false);
                  }}
                  active={location.pathname.includes("/mytopics")}
                >
                  <FontAwesomeIcon icon={faFolderOpen} /> {t("myTopics")}
                </Nav.Link>

                <Nav.Link
                  onClick={() => {
                    navigate("/workbench/topic-review");
                    setExpanded(false);
                  }}
                  active={location.pathname.includes("/workbench/topic-review")}
                >
                  <FontAwesomeIcon icon={faClipboardCheck} /> {t("topicReview.nav")}
                </Nav.Link>

                <NavDropdown.Divider />

                <Nav.Link
                  onClick={() => {
                    navigate("/gov");
                    setExpanded(false);
                  }}
                  active={location.pathname.includes("/gov")}
                >
                  <FontAwesomeIcon icon={faGavel} /> {t("governance")}
                </Nav.Link>

                <Nav.Link
                  onClick={() => {
                    navigate("/billing");
                    setExpanded(false);
                  }}
                  active={location.pathname === "/billing"}
                >
                  <FontAwesomeIcon icon={faCreditCard} /> {t("billingAccess.nav")}
                </Nav.Link>

                {isAdmin && (
                  <Nav.Link
                    onClick={() => {
                      navigate("/admin/billing");
                      setExpanded(false);
                    }}
                    active={location.pathname.startsWith("/admin")}
                  >
                    <FontAwesomeIcon icon={faUserShield} /> {t("adminBilling.navAdmin")}
                  </Nav.Link>
                )}

                <Nav.Link
                  onClick={() => {
                    navigate("/settings");
                    setExpanded(false);
                  }}
                  active={location.pathname === "/settings"}
                >
                  <FontAwesomeIcon icon={faCog} /> {t("settings")}
                </Nav.Link>

                <NavDropdown.Divider />

                <Nav.Link
                  onClick={() => {
                    window.open("https://youtu.be/ip4RaxWSorQ");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faCircleQuestion} /> {t("learnMore")}
                </Nav.Link>

                <NavDropdown
                  title={
                    <>
                      <FontAwesomeIcon icon={faGlobe} /> {t("language")}
                    </>
                  }
                  id="navbar-mobile-language-dropdown"
                >
                  <NavDropdown.Item
                    onClick={() => {
                      changeLanguage("pt");
                      setExpanded(false);
                    }}
                  >
                    🇧🇷 Português (BR)
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    onClick={() => {
                      changeLanguage("en");
                      setExpanded(false);
                    }}
                  >
                    🇺🇸 English (US)
                  </NavDropdown.Item>
                </NavDropdown>

                <NavDropdown.Divider />

                <Nav.Link
                  className="Navbar-mobile-logout-link"
                  onClick={() => {
                    logout();
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} /> {t("logOut")}
                </Nav.Link>
              </Nav>
            </>
          )}

          <Nav className="ml-auto NavBar-top-container d-none d-lg-flex">
            {isAdmin && (
              <Nav.Link
                className="Navbar-admin-link"
                onClick={() => {
                  navigate("/admin/billing");
                  setExpanded(false);
                }}
                active={location.pathname.startsWith("/admin")}
              >
                {t("adminBilling.navAdmin")}
              </Nav.Link>
            )}

            <Nav.Link
              onClick={() => {
                window.open(
                  // "https://github.com/mobr-ai/dfct-cardano/blob/main/docs/TechnicalReport-M1.pdf?raw=true"
                  // "https://www.youtube.com/watch?v=jdnXWIeVVYQ"
                  "https://youtu.be/ip4RaxWSorQ",
                );
              }}
            >
              {t("learnMore")}
            </Nav.Link>

            <NavDropdown title={t("language")} id="navbar-dropdown">
              <NavDropdown.Item
                onClick={() => {
                  changeLanguage("pt");
                  setExpanded(false);
                }}
              >
                🇧🇷 Português (BR){" "}
                {i18n.language.split("-")[0] === "pt" ? (
                  <div className="Navbar-checkmark" />
                ) : (
                  ""
                )}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item
                onClick={() => {
                  changeLanguage("en");
                  setExpanded(false);
                }}
              >
                🇺🇸 English (US){" "}
                {i18n.language.split("-")[0] === "en" ? (
                  <div className="Navbar-checkmark" />
                ) : (
                  ""
                )}
              </NavDropdown.Item>
            </NavDropdown>

            {!props.userData && (
              <Nav.Link
                onClick={() => {
                  login();
                }}
              >
                {t("logIn")}
              </Nav.Link>
            )}

            {props.userData && (
              <NavDropdown title={userMenu} id="navbar-dropdown">
                {showBillingStatus && (
                  <>
                    <div className="Navbar-account-summary">
                      <div className="Navbar-account-profile">
                        <Image
                          src={props.userData.avatar ? props.userData.avatar : avatarImg}
                          alt="Profile avatar"
                          onError={(e) => (e.target.src = avatarImg)}
                          roundedCircle
                          className="Navbar-account-avatar"
                        />
                        <div>
                          <strong>{compactUserName(props.userData)}</strong>
                          <span>
                            {hasCreditBalance
                              ? t("billingAccess.creditBalanceLabel")
                              : t("billingAccess.freeAccessLabel")}
                          </span>
                        </div>
                      </div>

                      <div className={`Navbar-account-stats ${hasCreditBalance ? "is-credit" : "is-free"}`}>
                        <div className="Navbar-account-stat">
                          <span>{t("billingAccess.creditsAvailable")}</span>
                          <strong>{billingCredits} DFCT</strong>
                        </div>

                        {!hasCreditBalance && (
                          <>
                            <div className="Navbar-account-stat">
                              <span>{t("billingAccess.freeTopicsRemaining")}</span>
                              <strong>{freeTopicsRemaining}</strong>
                            </div>
                            <div className="Navbar-account-stat is-wide">
                              <span>{t("billingAccess.accessTier")}</span>
                              <strong>{accessTier}</strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <NavDropdown.Divider />
                  </>
                )}

                <NavDropdown.Item
                  onClick={() => {
                    navigate("/");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faHome} /> {t("home")}
                </NavDropdown.Item>

                <NavDropdown.Divider />

                <NavDropdown.Item
                  onClick={() => {
                    navigate("/mytopics");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faFolderOpen} /> {t("myTopics")}
                </NavDropdown.Item>

                <NavDropdown.Item
                  onClick={() => {
                    navigate("/workbench/topic-review");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faClipboardCheck} />{" "}
                  {t("topicReview.nav")}
                </NavDropdown.Item>

                <NavDropdown.Divider />

                <NavDropdown.Item
                  onClick={() => {
                    navigate("/billing");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faCreditCard} />{" "}
                  {t("billingAccess.nav")}
                </NavDropdown.Item>

                {isAdmin && (
                  <NavDropdown.Item
                    className="Navbar-admin-dropdown-item"
                    onClick={() => {
                      navigate("/admin/billing");
                      setExpanded(false);
                    }}
                  >
                    <FontAwesomeIcon icon={faUserShield} />{" "}
                    {t("adminBilling.navAdmin")}
                  </NavDropdown.Item>
                )}

                <NavDropdown.Item
                  onClick={() => {
                    navigate("/settings");
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faCog} /> {t("settings")}
                </NavDropdown.Item>

                <NavDropdown.Divider />

                <NavDropdown.Item
                  className="Navbar-logout-dropdown-item"
                  onClick={() => {
                    logout();
                    setExpanded(false);
                  }}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} /> {t("logOut")}
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
