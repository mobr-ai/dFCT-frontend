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


function Layout() {
  const [user, setUser] = useState(window.sessionStorage.userData ? JSON.parse(window.sessionStorage.userData) : null);
  const [loading, setLoading] = useState(false)

  const handleLoginSuccess = useCallback(userData => {
    setUser(userData);
    window.sessionStorage.setItem("userData", JSON.stringify(userData));
    setLoading(false)

    //TODO: check if we want to fetch user-specific data
  }, [setLoading, setUser]);

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <Header userData={user} setUser={handleLoginSuccess} setLoading={setLoading} />
      <Outlet context={[user, loading, setLoading]} />
      {/* <Footer /> */}
    </GoogleOAuthProvider>
  );
}

const fetchTopic = async (userId, topicId, signal) => {
  const response = await fetch(
    `/topic/full/${userId}/${topicId}`, { signal: signal }
  )
  return await response.json();
}

const topicLoader = async (dynData) => {
  const topicPromise = fetchTopic(dynData.params.userId, dynData.params.topicId, dynData.request.signal);
  return defer({ topicPromise });
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/t/:userId/:topicId',
        element: <TopicBreakdownPage />,
        loader: topicLoader,
        // loader: async (dynData) => {
        //   // return fetch(`/topic/full/${dynData.params.userId}/${dynData.params.topicId}`, { signal: dynData.request.signal }).then((response) => { return response.json() })
        //   return fetchTopic(dynData.params.userId}/${dynData.params.topicId}`, { signal: dynData.request.signal })
        // }
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
