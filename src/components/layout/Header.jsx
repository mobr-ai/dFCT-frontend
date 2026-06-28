import { useEffect, useState } from "react";
import "../../styles/NavigationSidebar.css";
import NavigationSidebar from "./NavigationSidebar.jsx";
import NavBar from "./NavBar.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const SIDEBAR_PINNED_KEY = "dfct.sidebarPinned";

function Header(props) {
  const headerProps = props || {};
  const sidebarIsOpen = Boolean(headerProps.sidebarIsOpen);
  const setSidebarOpen =
    typeof headerProps.setSidebarOpen === "function"
      ? headerProps.setSidebarOpen
      : () => {};

  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_PINNED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isSidebarDesktop, setIsSidebarDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const effectiveSidebarPinned = sidebarPinned && isSidebarDesktop;
  const effectiveSidebarOpen = sidebarIsOpen || effectiveSidebarPinned;

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(sidebarPinned));
    } catch {
      // Ignore storage failures.
    }
  }, [sidebarPinned]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia("(min-width: 1024px)");

    const syncSidebarViewport = () => {
      const desktop = Boolean(query.matches);
      setIsSidebarDesktop(desktop);

      // Mobile has no persistent sidebar. Never write false to localStorage here.
      if (!desktop) {
        setSidebarOpen(false);
      }
    };

    syncSidebarViewport();

    if (query.addEventListener) {
      query.addEventListener("change", syncSidebarViewport);
      return () => query.removeEventListener("change", syncSidebarViewport);
    }

    query.addListener(syncSidebarViewport);
    return () => query.removeListener(syncSidebarViewport);
  }, [setSidebarOpen]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-sidebar-pinned",
      effectiveSidebarPinned ? "true" : "false"
    );

    if (effectiveSidebarPinned) {
      setSidebarOpen(true);
    }

    return () => {
      document.documentElement.removeAttribute("data-sidebar-pinned");
    };
  }, [effectiveSidebarPinned, setSidebarOpen]);

  const handleSidebarToggle = () => {
    if (effectiveSidebarPinned) return;
    setSidebarOpen(!sidebarIsOpen);
  };

  const handleSidebarPinnedChange = (nextPinned) => {
    const normalizedPinned = Boolean(nextPinned);

    setSidebarPinned(normalizedPinned);

    if (isSidebarDesktop) {
      setSidebarOpen(normalizedPinned);
    } else {
      setSidebarOpen(false);
    }
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
          isOpen={effectiveSidebarOpen}
          setIsOpen={setSidebarOpen}
          isPinned={effectiveSidebarPinned}
          setIsPinned={handleSidebarPinnedChange}
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
