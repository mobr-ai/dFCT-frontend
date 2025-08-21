import "./../styles/NavBar.css";
import ReactTextTransition, { presets } from "react-text-transition";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faMagnifyingGlassArrowRight,
  faFolderOpen,
  faCog,
  faGavel,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./../i18n";
import avatarImg from "./../icons/avatar.png";

// const brandText = ['d-F', 'de', 'd-', 'd-F4C'];
// const suffixText = ['CT', 'facto', 'FaCTo', 'T0'];
const brandText = ["d-", "de", "fact", "tool"];
const suffixText = ["FCT", "centralized", "-checking", "kit"];

function NavBar(props) {
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const topClick = useCallback(() => {
    if (window.location.pathname.startsWith("/proposal")) navigate("/gov");
    else if (window.location.pathname !== "/") navigate("/");
    else {
      document
        .getElementsByClassName("bm-menu")[0]
        ?.scrollTo({ top: 0, behavior: "smooth" });
      document
        .getElementsByClassName("Landing-middle-column")[0]
        ?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [navigate]);

  useEffect(() => {
    const intervalId = setInterval(
      () => {
        setBrandIndex((index) =>
          index < brandText.length ? index + 1 : index
        );
        setSuffixBrandIndex((index) =>
          index < suffixText.length ? index + 1 : index
        );
      },
      600 // every ms
    );

    return () => clearTimeout(intervalId);
  }, []);

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
          props.userData.username.length > 16 ? props.userData.username : null
        }
        onError={(e) => (e.target.src = avatarImg)}
        roundedCircle
        style={{ width: "30px", marginRight: "5px" }}
      />
      {" " + props.userData.username.length > 16
        ? props.userData.username.slice(0, 13) + "…"
        : props.userData.username}
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
          {props.userData && (
            <section className="inline">
              <ReactTextTransition springConfig={presets.gentle} inline>
                {brandText[brandIndex % brandText.length]}
              </ReactTextTransition>
              {suffixText[suffixIndex % suffixText.length]}
            </section>
          )}
          {!props.userData && "d-FCT"}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          {props.userData && (
            <>
              <Nav className="me-auto d-lg-none">
                {" "}
                {/* Visible only in mobile */}
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
                  <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} />{" "}
                  {t("verifyContent")}
                </Nav.Link>
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
                    navigate("/gov");
                    setExpanded(false);
                  }}
                  active={location.pathname.includes("/gov")}
                >
                  <FontAwesomeIcon icon={faGavel} /> {t("governance")}
                </Nav.Link>
                <Nav.Link
                  onClick={() => {
                    navigate("/settings");
                    setExpanded(false);
                  }}
                  active={location.pathname === "/settings"}
                >
                  <FontAwesomeIcon icon={faCog} /> {t("settings")}
                </Nav.Link>
              </Nav>
              <NavDropdown.Divider />
            </>
          )}

          <Nav className="ml-auto NavBar-top-container">
            <Nav.Link
              onClick={() => {
                window.open(
                  // "https://github.com/mobr-ai/dfct-cardano/blob/main/docs/TechnicalReport-M1.pdf?raw=true"
                  "https://www.youtube.com/watch?v=jdnXWIeVVYQ"
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
                <NavDropdown.Item
                  onClick={() => {
                    logout();
                    setExpanded(false);
                  }}
                >
                  {t("logOut")}
                </NavDropdown.Item>
                <NavDropdown.Divider className="d-none d-lg-block" />
                <NavDropdown.Item
                  className="d-none d-lg-block"
                  onClick={() => {
                    navigate("/settings");
                    setExpanded(false);
                  }}
                >
                  {t("settings")}
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
