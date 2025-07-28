// useAuthRequest.js

import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import request from 'superagent';

export function useAuthRequest(user) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showToast } = useOutletContext();

    const handleUnauthorized = () => {
        console.warn('Token expired or invalid. Redirecting to login...');
        window.localStorage.removeItem('userData');
        if (showToast) showToast(t('sessionExpired'), 'secondary');
        navigate('/login?sessionExpired=1');
    };

    const authFetch = async (url, options = {}) => {
        if (!user || !user.access_token) {
            handleUnauthorized();
            return;
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${user.access_token}`,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }

        return response;
    };

    const buildRequest = (req) => {
        if (!user || !user.access_token) {
            handleUnauthorized();
            return req; // early exit — not ideal but safe fallback
        }

        req.set('Authorization', `Bearer ${user.access_token}`);

        // Wrap .end and .send to handle 401 in all usages
        const originalEnd = req.end.bind(req);
        req.end = (fn) => {
            return originalEnd((err, res) => {
                if (err && err.status === 401) handleUnauthorized();
                if (fn) fn(err, res);
            });
        };

        const originalSend = req.send.bind(req);
        req.send = (...args) => {
            originalSend(...args);
            return req; // allow chaining!
        };

        return req;
    };

    const authRequest = {
        get: (url) => buildRequest(request.get(url)),
        post: (url) => buildRequest(request.post(url)),
        put: (url) => buildRequest(request.put(url)),
        delete: (url) => buildRequest(request.delete(url)),
    };

    return { authFetch, authRequest };
}
