// useAuthRequest.js

import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import request from 'superagent';

/**
 * React Hook to provide auth-aware request helpers.
 * Usage: const { authFetch, authRequest } = useAuthRequest(user);
 */
export function useAuthRequest(user) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showToast } = useOutletContext();

    const authFetch = async (url, options = {}) => {
        if (!user || !user.access_token) {
            console.warn('No user token found. Redirecting...');
            navigate('/login');
            return;
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${user.access_token}`,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            const errorMsg = "Token expired. Redirecting to login."
            console.warn(errorMsg);
            if (showToast) showToast(t('sessionExpired'), 'secondary');
            window.localStorage.removeItem('userData')
            navigate('/login?sessionExpired=1');
            // navigate(0);
            throw new Error(errorMsg)
        }

        return response;
    };

    const authRequest = {
        get: (url) => buildRequest(request.get(url)),
        post: (url) => buildRequest(request.post(url)),
        put: (url) => buildRequest(request.put(url)),
        delete: (url) => buildRequest(request.delete(url)),
    };

    const buildRequest = (req) => {
        if (!user || !user.access_token) {
            console.warn('No user token found. Redirecting...');
            navigate('/login');
            return req;
        }

        req.set('Authorization', `Bearer ${user.access_token}`);

        // Wrap the original send to catch 401s
        const originalSend = req.send.bind(req);
        req.send = (body) => {
            return originalSend(body).catch(err => {
                if (err.status === 401) {
                    console.warn('Token expired. Redirecting to login.');
                    window.localStorage.removeItem('userData')
                    navigate('/login?sessionExpired=1');
                }
                throw err;
            });
        };

        return req;
    };


    return { authFetch, authRequest };
}
