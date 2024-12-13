import './index.css';
import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LandingPage from './LandingPage';
import Header from './Header'
import ErrorPage from "./ErrorPage";
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider, Outlet, defer } from "react-router-dom";
import TopicBreakdownPage from './TopicBreakdownPage';
import SignUpPage from './SignUpPage';


function Layout() {
  const [user, setUser] = useState(window.sessionStorage.userData ? JSON.parse(window.sessionStorage.userData) : null);
  const [loading, setLoading] = useState(false)
  const [userTopics, setUserTopics] = useState({})

  const handleLoginSuccess = useCallback(userData => {
    if (userData) {
      setUser(userData);
      window.sessionStorage.setItem("userData", JSON.stringify(userData));
      fetchUserTopics(userData.id).then((response) => {
        setUserTopics(response)
        setLoading(false)
      })
    }
    else {
      setUser(null)
      // window.sessionStorage.removeItem('userData')
    }
  }, [setLoading, setUser, setUserTopics]);

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <Header userData={user} setUser={handleLoginSuccess} setLoading={setLoading} />
      <Outlet context={[user, loading, userTopics, setLoading]} />
      {/* <Footer /> */}
    </GoogleOAuthProvider>
  );
}


const fetchUserTopics = async (userId) => {
  const response = await fetch(`/api/user/${userId}/topics`)
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
        loader: userTopicsLoader,
      },
      {
        path: '/signup',
        element: <SignUpPage type="create" />
      },
      {
        path: '/login',
        element: <SignUpPage type="login" />
      },
      {
        path: '/t/:userId/:topicId',
        element: <TopicBreakdownPage />,
        loader: topicLoader,
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
