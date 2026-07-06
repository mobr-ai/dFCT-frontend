import TopicReviewWorkbench from "./workflows/topicReview/TopicReviewWorkbench.jsx";
import "./styles/index.css";
import "./styles/theme-tokens.css";
import "./styles/theme-overrides.css";
import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import LandingPage from "./pages/LandingPage";
import Header from "./components/layout/Header";
import ErrorPage from "./pages/ErrorPage";
import reportWebVitals from "./reportWebVitals";
import TopicBreakdownPage from "./pages/TopicBreakdownPage";
import TopicSubmissionPage from "./pages/TopicSubmissionPage";
import AuthPage from "./pages/AuthPage";
import WaitingList from "./pages/WaitingListPage";
import SettingsPage from "./pages/SettingsPage";
import BillingAccessPage from "./pages/BillingAccessPage.jsx";
import AdminBillingCreditsPage from "./pages/AdminBillingCreditsPage.jsx";
import i18n from "./i18n";
import { useTranslation } from "react-i18next";
import { Toast, ToastContainer } from "react-bootstrap";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  defer,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import GovernancePage from "./pages/GovernancePage";
import ProposalPage from "./pages/ProposalPage";
import WelcomePage from "./pages/WelcomePage";
import { installThemeRouteSync } from "./theme/themeStorage";

import { Buffer } from "buffer";
window.Buffer = Buffer;
installThemeRouteSync();

function Layout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(
    window.localStorage.userData
      ? JSON.parse(window.localStorage.userData)
      : null
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });
  const navigate = useNavigate();

  const showToast = (message, variant = "success") => {
    if (message && typeof message === "object") {
      setToast({
        show: true,
        message: message.message || "",
        variant: message.variant || message.type || variant,
      });
      return;
    }

    setToast({ show: true, message: String(message || ""), variant });
  };

  const handleLogin = useCallback(
    (userData) => {
      if (userData) {
        setUser(userData);
        window.localStorage.setItem("userData", JSON.stringify(userData));
        showToast(t("loginSuccess"), "success");
        navigate("/");
        setLoading(false);
      } else {
        setUser(null);
        window.localStorage.removeItem("userData");
        navigate("/");
        setLoading(false);
      }
    },
    [setLoading, setUser, navigate]
  );

  // save user data on changes
  useEffect(() => {
    window.localStorage.setItem("userData", JSON.stringify(user));
  }, [user]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Header
        userData={user}
        setLoading={setLoading}
        setUser={handleLogin}
        setSidebarOpen={setSidebarOpen}
        sidebarIsOpen={sidebarOpen}
      />
      <Outlet
        context={{ user, setUser, loading, setLoading, handleLogin, showToast }}
      />
      <ToastContainer
        position="bottom-end"
        className="p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          bg={toast.variant}
          onClose={() => setToast({ ...toast, show: false })}
          show={toast.show}
          delay={5000}
          autohide
        >
          <Toast.Body className="text-white">
            {String(toast.message || "").split("\n").map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </GoogleOAuthProvider>
  );
}


function HomePage() {
  const { user } = useOutletContext();

  if (user) {
    return <LandingPage type="all" />;
  }

  return <WelcomePage />;
}

const fetchAllTopics = async () => {
  const lang =
    i18n.language.split("-")[0] || window.localStorage.i18nextLng.split("-")[0];
  const page = window.sessionStorage.getItem("topicsPage") || 1;
  const perPage = window.sessionStorage.getItem("perPage") || 9;

  const response = await fetch(`/api/topics/${lang}/${page}/${perPage}`);
  return await response.json();
};

const allTopicsLoader = async () => {
  const allTopicsPromise = fetchAllTopics();
  return defer({ allTopicsPromise });
};

const homeLoader = async () => {
  if (!window.localStorage.userData) {
    return {};
  }

  return allTopicsLoader();
};

const fetchGovProposals = async (userData) => {
  const response = await fetch("/api/governance/proposals", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userData.access_token}`,
    },
  });

  if (response.status === 401) {
    console.warn("Unauthorized: redirecting to /login");
    window.localStorage.removeItem("userData");
    window.location.href = "/login?sessionExpired=1";
  }

  return await response.json();
};

const fetchUserTopics = async (userData) => {
  const lang =
    i18n.language.split("-")[0] || window.localStorage.i18nextLng.split("-")[0];
  const page = window.sessionStorage.getItem("topicsPage") || 1;
  const perPage = window.sessionStorage.getItem("perPage") || 9;

  const response = await fetch(
    `/api/user/${userData.id}/topics/${lang}/${page}/${perPage}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userData.access_token}`,
      },
    }
  );

  if (response.status === 401) {
    console.warn("Unauthorized: redirecting to /login");
    window.localStorage.removeItem("userData");
    window.location.href = "/login?sessionExpired=1";
  }

  return await response.json();
};

const govProposalsLoader = async () => {
  if (!window.localStorage.userData) return {};

  let userData = JSON.parse(window.localStorage.userData);
  if (userData && userData.id) {
    const govProposalsPromise = fetchGovProposals(userData);
    return defer({ govProposalsPromise });
  }

  return {};
};

const userTopicsLoader = async () => {
  if (!window.localStorage.userData) return {};

  let userData = JSON.parse(window.localStorage.userData);
  if (userData && userData.id) {
    const userTopicsPromise = fetchUserTopics(userData);
    return defer({ userTopicsPromise });
  }

  return {};
};

const normalizeTopicPayload = (payload) => {
  if (!payload || typeof payload !== "object" || payload.error) {
    return null;
  }

  return {
    ...payload,
    claims: Array.isArray(payload.claims) ? payload.claims : [],
    content: Array.isArray(payload.content) ? payload.content : [],
    contents: Array.isArray(payload.contents) ? payload.contents : [],
  };
};

const getStoredUserData = () => {
  try {
    const raw = window.localStorage.getItem("userData");
    if (!raw || raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const fetchTopic = async (userId, topicId, signal) => {
  const userData = getStoredUserData();
  const headers = {
    "Content-Type": "application/json",
  };

  if (userData?.access_token) {
    headers.Authorization = `Bearer ${userData.access_token}`;
  }

  const response = await fetch(`/api/topic/full/${userId}/${topicId}`, {
    method: "GET",
    headers,
    signal,
  });

  if (response.status === 401) {
    console.warn("Unauthorized: redirecting to /login");
    window.localStorage.removeItem("userData");
    window.location.href = "/login?sessionExpired=1";
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Response(payload?.error || "Topic not found", {
      status: response.status,
      statusText: response.statusText || "Topic not found",
    });
  }

  const topic = normalizeTopicPayload(payload);

  if (!topic) {
    throw new Response("Invalid topic payload", {
      status: 502,
      statusText: "Invalid topic payload",
    });
  }

  return topic;
};

const topicLoader = async (dynData) => {
  const userTopicsPromise = await userTopicsLoader();
  const topicPromise = fetchTopic(
    dynData.params.userId,
    dynData.params.topicId,
    dynData.request.signal
  );
  return defer({ topicPromise, userTopicsPromise });
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <HomePage />,
        loader: homeLoader,
      },
      {
        path: "/topics",
        element: <LandingPage type="all" />,
        loader: allTopicsLoader,
      },
      {
        path: "/mytopics",
        element: <LandingPage type="user" />,
        loader: userTopicsLoader,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
      {
        path: "/billing",
        element: <BillingAccessPage />,
      },
      {
        path: "/admin/billing",
        element: <AdminBillingCreditsPage />,
      },
      {
        path: "/gov",
        element: <GovernancePage />,
        loader: govProposalsLoader,
      },
      {
        path: "/proposal/:proposalId",
        element: <ProposalPage />,
      },
      {
        path: "/signup",
        element: <WaitingList />,
      },
      {
        path: "/signup_disabled",
        element: <AuthPage type="create" />,
      },
      {
        path: "/login",
        element: <AuthPage type="login" />,
      },
      {
        path: "/submit",
        element: <TopicSubmissionPage />,
        loader: userTopicsLoader,
      },
      {
        path: "/workbench/topic-review",
        element: <TopicReviewWorkbench />,
      },
      {
        path: "/t/:userId/:topicId",
        element: <TopicBreakdownPage />,
        loader: topicLoader,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// Pass a function to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
