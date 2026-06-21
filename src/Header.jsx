import { useEffect, useState } from "react";
import "./styles/NavigationSidebar.css";
import NavigationSidebar from "./components/NavigationSidebar.jsx";
import NavBar from "./components/NavBar.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const SIDEBAR_PINNED_KEY = "dfct.sidebarPinned";

function Header(props) {
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_PINNED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(sidebarPinned));
    } catch {
      // Ignore storage failures.
    }

    document.documentElement.toggleAttribute(
      "data-sidebar-pinned",
      sidebarPinned
    );

    if (sidebarPinned) {
      props.setSidebarOpen(true);
    }
  }, [sidebarPinned, props]);

  const sidebarIsOpen = sidebarPinned || props.sidebarIsOpen;


  const handleSidebarToggle = () => {
    if (sidebarPinned) {
      setSidebarPinned(false);
      props.setSidebarOpen(false);
      return;
    }

    props.setSidebarOpen(!props.sidebarIsOpen);
  };

  return (
    <>
      {props.userData && (
        <button className="Navbar-toggle-btn" onClick={handleSidebarToggle}>
          <FontAwesomeIcon icon={faBars} />
        </button>
      )}

      {props.userData && (
        <NavigationSidebar
          isOpen={sidebarIsOpen}
          setIsOpen={props.setSidebarOpen}
          isPinned={sidebarPinned}
          setIsPinned={setSidebarPinned}
        />
      )}

      <NavBar
        userData={props.userData}
        setUser={props.setUser}
        setLoading={props.setLoading}
      />
    </>
  );
}

export default Header;
