// useAuthRequest.js

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import request from "superagent";

export class ApiClientError extends Error {
    constructor(message, details = {}) {
        super(message || "API request failed");
        this.name = "ApiClientError";
        this.status = details.status;
        this.statusCode = details.statusCode || details.status;
        this.statusText = details.statusText;
        this.code = details.code;
        this.body = details.body;
        this.text = details.text;
        this.url = details.url;
        this.method = details.method;
        this.response = details.response;
        this.originalError = details.originalError;
    }
}

function looksLikeHtml(text = "") {
    const trimmed = String(text).trim().toLowerCase();
    return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

function parseMaybeJson(text = "") {
    const trimmed = String(text || "").trim();

    if (!trimmed) return null;

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return text;
        }
    }

    return text;
}

function extractApiMessage({ body, text, status, statusText }) {
    if (body && typeof body === "object") {
        return (
            body.error ||
            body.message ||
            body.detail ||
            body.description ||
            statusText ||
            `API request failed with status ${status || "unknown"}`
        );
    }

    if (typeof body === "string" && body.trim()) {
        return looksLikeHtml(body)
            ? "Unexpected HTML response from API"
            : body.trim();
    }

    if (typeof text === "string" && text.trim()) {
        return looksLikeHtml(text)
            ? "Unexpected HTML response from API"
            : text.trim();
    }

    return statusText || `API request failed with status ${status || "unknown"}`;
}

export function normalizeApiError(err) {
    if (err instanceof ApiClientError) return err;

    const response = err?.response;
    const body = response?.body || parseMaybeJson(response?.text || err?.text || "");
    const text =
        response?.text ||
        (typeof body === "string" ? body : err?.text);

    const status = err?.status || response?.status;
    const statusText = err?.statusText || response?.statusText;
    const code = body?.code || err?.code;

    return new ApiClientError(
        extractApiMessage({ body, text, status, statusText }) ||
            err?.message ||
            "API request failed",
        {
            status,
            statusCode: status,
            statusText,
            code,
            body,
            text,
            url: response?.req?.url || err?.url,
            method: response?.req?.method || err?.method,
            response,
            originalError: err,
        },
    );
}

export function getApiErrorMessage(err, fallback = "API request failed") {
    const normalized = normalizeApiError(err);
    return normalized?.message || fallback;
}

async function parseFetchErrorResponse(response) {
    const text = await response.clone().text().catch(() => "");
    const contentType = response.headers.get("content-type") || "";

    let body = null;

    if (
        contentType.includes("application/json") ||
        text.trim().startsWith("{") ||
        text.trim().startsWith("[")
    ) {
        body = parseMaybeJson(text);
    } else {
        body = text;
    }

    return {
        body,
        text,
    };
}

export function useAuthRequest(user) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const outletContext = useOutletContext() || {};
    const { showToast } = outletContext;
    const accessToken = user?.access_token || "";

    const navigateRef = useRef(navigate);
    const showToastRef = useRef(showToast);
    const tRef = useRef(t);

    useEffect(() => {
        navigateRef.current = navigate;
        showToastRef.current = showToast;
        tRef.current = t;
    }, [navigate, showToast, t]);

    const handleUnauthorized = useCallback(() => {
        console.warn("Token expired or invalid. Redirecting to login...");
        window.localStorage.removeItem("userData");
        showToastRef.current?.(tRef.current("sessionExpired"), "secondary");
        navigateRef.current("/login?sessionExpired=1");
    }, []);

    const authFetch = useCallback(async (url, options = {}) => {
        if (!accessToken) {
            handleUnauthorized();
            throw new ApiClientError("Unauthorized", {
                status: 401,
                statusCode: 401,
                code: "authorization_required",
                url,
                method: options.method || "GET",
            });
        }

        const headers = {
            Accept: "application/json",
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const { body, text } = await parseFetchErrorResponse(response);
            const normalized = new ApiClientError(
                extractApiMessage({
                    body,
                    text,
                    status: response.status,
                    statusText: response.statusText,
                }),
                {
                    status: response.status,
                    statusCode: response.status,
                    statusText: response.statusText,
                    code: body?.code,
                    body,
                    text,
                    url,
                    method: options.method || "GET",
                    response,
                },
            );

            if (response.status === 401) handleUnauthorized();

            throw normalized;
        }

        return response;
    }, [accessToken, handleUnauthorized]);

    const buildRequest = useCallback((req) => {
        req.set("Accept", "application/json");

        if (!accessToken) {
            handleUnauthorized();
            return req;
        }

        req.set("Authorization", `Bearer ${accessToken}`);

        const originalEnd = req.end.bind(req);
        req.end = (fn) => {
            return originalEnd((err, res) => {
                if (err) {
                    const normalized = normalizeApiError(err);
                    if (normalized.status === 401) handleUnauthorized();
                    if (fn) return fn(normalized, res);
                    return;
                }

                if (fn) fn(null, res);
            });
        };

        const originalThen = req.then.bind(req);
        req.then = (onFulfilled, onRejected) =>
            originalThen(onFulfilled, (err) => {
                const normalized = normalizeApiError(err);

                if (normalized.status === 401) {
                    handleUnauthorized();
                }

                if (onRejected) {
                    return onRejected(normalized);
                }

                throw normalized;
            });

        const originalSend = req.send.bind(req);
        req.send = (...args) => {
            originalSend(...args);
            return req;
        };

        return req;
    }, [accessToken, handleUnauthorized]);

    const authRequest = useMemo(() => ({
        get: (url) => buildRequest(request.get(url)),
        post: (url) => buildRequest(request.post(url)),
        put: (url) => buildRequest(request.put(url)),
        patch: (url) => buildRequest(request.patch(url)),
        delete: (url) => buildRequest(request.delete(url)),
        del: (url) => buildRequest(request.delete(url)),
    }), [buildRequest]);

    return useMemo(
        () => ({ authFetch, authRequest }),
        [authFetch, authRequest],
    );
}
