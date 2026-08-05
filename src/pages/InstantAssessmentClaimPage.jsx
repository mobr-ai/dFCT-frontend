import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  currentInternalPath,
  loginPathForReturnTo,
} from "../auth/safeReturnPath";
import "../styles/InstantAssessmentClaimPage.css";


const CLAIM_ERROR_KEYS = {
  instantAssessmentClaimRequired: "missing",
  invalidInstantAssessmentClaim: "invalid",
  expiredInstantAssessmentClaim: "expired",
  revokedInstantAssessmentClaim: "expired",
  instantAssessmentClaimConflict: "conflict",
  instantAssessmentAlreadyClaimed: "conflict",
  instantAssessmentTopicNotReady: "notReady",
  instantAssessmentTopicNotFound: "notReady",
  instantAssessmentNotFound: "notFound",
};


function InstantAssessmentClaimPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useOutletContext();

  const [state, setState] = useState({
    status: "preparing",
    errorKey: null,
  });

  const token = String(
    searchParams.get("token") || "",
  ).trim();

  useEffect(() => {
    if (!token) {
      setState({
        status: "error",
        errorKey: "missing",
      });
      return;
    }

    if (!user?.access_token) {
      navigate(
        loginPathForReturnTo(
          currentInternalPath(),
        ),
        { replace: true },
      );
      return;
    }

    const controller = new AbortController();

    async function redeemClaim() {
      setState({
        status: "claiming",
        errorKey: null,
      });

      try {
        const response = await fetch(
          `/api/instant-assessments/${encodeURIComponent(publicId)}/claim`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.access_token}`,
            },
            body: JSON.stringify({ token }),
            signal: controller.signal,
          },
        );

        const payload = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          const error = new Error(
            payload.error ||
              "Instant Assessment claim failed",
          );
          error.code = payload.code;
          error.status = response.status;
          throw error;
        }

        const topicPath = String(
          payload.topicPath || "",
        );

        if (!topicPath.startsWith("/t/")) {
          throw new Error(
            "The claimed topic path is missing",
          );
        }

        setState({
          status: "success",
          errorKey: null,
        });

        navigate(topicPath, {
          replace: true,
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(
          "Instant Assessment claim failed:",
          error,
        );

        setState({
          status: "error",
          errorKey:
            CLAIM_ERROR_KEYS[error?.code] ||
            "generic",
        });
      }
    }

    redeemClaim();

    return () => {
      controller.abort();
    };
  }, [
    navigate,
    publicId,
    token,
    user?.access_token,
  ]);

  const isBusy =
    state.status === "preparing" ||
    state.status === "claiming" ||
    state.status === "success";

  return (
    <main className="InstantAssessmentClaimPage">
      <section
        className="InstantAssessmentClaimCard"
        aria-live="polite"
      >
        <img
          className="InstantAssessmentClaimLogo"
          src="/logo192.png"
          alt="d-FCT"
        />

        <div className="InstantAssessmentClaimEyebrow">
          {t("instantAssessmentClaim.eyebrow")}
        </div>

        <h1>
          {isBusy
            ? t("instantAssessmentClaim.title")
            : t("instantAssessmentClaim.errorTitle")}
        </h1>

        {isBusy ? (
          <>
            <div
              className="InstantAssessmentClaimSpinner"
              aria-hidden="true"
            />
            <p>
              {state.status === "success"
                ? t("instantAssessmentClaim.opening")
                : t("instantAssessmentClaim.claiming")}
            </p>
          </>
        ) : (
          <>
            <p>
              {t(
                `instantAssessmentClaim.errors.${
                  state.errorKey || "generic"
                }`,
              )}
            </p>

            <div className="InstantAssessmentClaimActions">
              <button
                type="button"
                className="InstantAssessmentClaimPrimary"
                onClick={() =>
                  navigate("/login", {
                    replace: true,
                  })
                }
              >
                {t("instantAssessmentClaim.logInAgain")}
              </button>

              <button
                type="button"
                className="InstantAssessmentClaimSecondary"
                onClick={() =>
                  navigate("/", {
                    replace: true,
                  })
                }
              >
                {t("instantAssessmentClaim.goHome")}
              </button>
            </div>
          </>
        )}

        <small>
          {t("instantAssessmentClaim.securityNote")}
        </small>
      </section>
    </main>
  );
}


export default InstantAssessmentClaimPage;
