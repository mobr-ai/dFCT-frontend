import './index.css';
import React, { useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LandingPage from './LandingPage';
import Header from './Header'
import ErrorPage from "./ErrorPage";
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider, Outlet, defer, useNavigate } from "react-router-dom";
import TopicBreakdownPage from './TopicBreakdownPage';
import TopicSubmissionPage from './TopicSubmission';
import AuthPage from './AuthPage';
import WaitingList from './WaitingListPage';
import SettingsPage from './SettingsPage';
import i18n from "i18next";


function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(window.sessionStorage.userData ? JSON.parse(window.sessionStorage.userData) : null);
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const navigate = useNavigate()

  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
  };

  const handleLogin = useCallback(userData => {
    if (userData) {
      setUser(userData);
      window.sessionStorage.setItem("userData", JSON.stringify(userData))
      navigate("/")
      setLoading(false)

    }
    else {
      setUser(null)
      window.sessionStorage.removeItem('userData')
      navigate("/")
      setLoading(false)
    }
  }, [setLoading, setUser, navigate]);

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <Header userData={user} setLoading={setLoading} setUser={handleLogin} setSidebarOpen={setSidebarOpen} sidebarIsOpen={sidebarOpen} />
      <Outlet context={{ user, loading, setLoading, handleLogin, showToast }} />
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          bg={toast.variant}
          onClose={() => setToast({ ...toast, show: false })}
          show={toast.show}
          delay={3000}
          autohide
        >
          <Toast.Body className="text-white">
            {toast.message.split('\n').map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </GoogleOAuthProvider>
  );
}


const fetchUserTopics = async (userId) => {
  const lang = i18n.language.split('-')[0] || window.localStorage.i18nextLng.split('-')[0]
  const page = window.sessionStorage.getItem("topicsPage") || 1
  const perPage = window.sessionStorage.getItem("perPage") || 9

  const response = await fetch(`/api/user/${userId}/topics/${lang}/${page}/${perPage}`)
  return await response.json();
}

const userTopicsLoader = async () => {
  if (!window.sessionStorage.userData)
    return {}

  let userData = JSON.parse(window.sessionStorage.userData)
  if (userData && userData.id) {
    const userTopicsPromise = fetchUserTopics(userData.id);
    return defer({ userTopicsPromise });
  }

  return {}
};

const fetchTopic = async (userId, topicId, signal) => {
  const response = await fetch(
    `/topic/full/${userId}/${topicId}`, { signal: signal }
  )
  return await response.json();
}

const topicLoader = async (dynData) => {
  const userTopicsPromise = fetchUserTopics(dynData.params.userId, dynData.request.signal);
  const topicPromise = fetchTopic(dynData.params.userId, dynData.params.topicId, dynData.request.signal);
  return defer({ topicPromise, userTopicsPromise });
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
        loader: userTopicsLoader
      },
      {
        path: '/settings',
        element: <SettingsPage />
      },
      {
        path: '/signup',
        element: <WaitingList />
      },
      {
        path: '/signup_disabled',
        element: <AuthPage type="create" />
      },
      {
        path: '/login',
        element: <AuthPage type="login" />
      },
      {
        path: '/submit',
        element: <TopicSubmissionPage />,
        loader: userTopicsLoader
      },
      {
        path: '/t/:userId/:topicId',
        element: <TopicBreakdownPage />,
        loader: topicLoader
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


// Pass a function to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
