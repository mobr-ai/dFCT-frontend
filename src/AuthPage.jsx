import i18n from "./i18n";
import { useState, useEffect, useCallback, Suspense } from "react";
import reactStringReplace from "react-string-replace";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import { useTranslation } from "react-i18next";
import {
  NavLink,
  useOutletContext,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./styles/AuthPage.css";
import CardanoWalletLogin from "./components/CardanoWalletLogin";

import LoadingPage from "./LoadingPage";

function AuthPage(props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { handleLogin, setLoading, loading, showToast } = useOutletContext();
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState();
  const [pass, setPass] = useState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmationError, setConfirmationError] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      await fetch("/api/resend_confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          language:
            i18n.language.split("-")[0] ||
            window.localStorage.i18nextLng.split("-")[0],
        }),
      });
      showToast(t("confirmationEmailResent"), "success");
    } catch (error) {
      showToast(t(error.error) || t("errorResendingConfirmation"), "danger");
    } finally {
      setResendLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    const endpoint = props.type === "create" ? "/api/register" : "/api/login";
    setProcessing(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: pass,
          remember_me: rememberMe,
          language:
            i18n.language.split("-")[0] ||
            window.localStorage.i18nextLng.split("-")[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const result = await response.json();
      if (props.type === "login") {
        console.log("Auth success:", result);

        if (result.access_token) {
          // Save token to localStorage
          localStorage.setItem("access_token", result.access_token);
          handleLogin(result);
        }
      }

      if (result.redirect) {
        navigate(result.redirect);
      }
    } catch (error) {
      const errorMsg = error.message
        ? t(error.message)
        : error.response?.data?.error;
      console.error("Auth error:", errorMsg);

      if (error.message !== t(error.message)) {
        showToast(errorMsg, "danger");
      } else if (errorMsg.includes(t("confirmationError"))) {
        setConfirmationError(true); // Show the resend button
        showToast(t("confirmationError"), "danger");
      } else if (props.type === "create")
        showToast(t("registerError"), "danger");
      else {
        showToast(t("loginError"), "danger");
      }
    } finally {
      setProcessing(false);
      setPass("");
    }
  };

  const handleAuthStep = () => {
    let newEmail = document.querySelector("#Auth-input-text")?.value;
    let newPass = document.querySelector("#Auth-input-password-text")?.value;

    if (newEmail && !email) setEmail(newEmail);
    if (newPass && !pass) setPass(newPass);
  };

  useEffect(() => {
    document
      .getElementsByClassName("Auth-container")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(false);
  }, [email, setEmail, setLoading]);

  const handleApiRequest = useCallback(
    async (url, options = {}) => {
      const defaultOptions = {
        headers: {
          "Content-Type": "application/json",
          ...(props.userData?.token && {
            Authorization: `Bearer ${props.userData.access_token}`,
          }),
        },
      };

      const finalOptions = { ...defaultOptions, ...options };
      console.log("API Request:", url, finalOptions);

      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    },
    [props.userData]
  );

  const handleGoogleResponse = async (tokenResponse, handleLogin) => {
    try {
      console.log("Google Response:", tokenResponse);
      const payload = { token: tokenResponse.access_token };
      console.log("Payload to server:", payload);

      const apiResponse = await handleApiRequest("/api/auth/google", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("Server Response:", apiResponse);
      handleLogin(apiResponse);
    } catch (err) {
      console.error("Authentication Error:", err);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleGoogleResponse(tokenResponse, handleLogin);
    },
  });

  useEffect(() => {
    if (email && pass && !processing) {
      handleEmailAuth();
    }
  });

  useEffect(() => {
    if (searchParams.get("sessionExpired") === "1") {
      showToast(t("sessionExpired"), "secondary");
      // Remove the param so it doesn't trigger again on refresh
      searchParams.delete("sessionExpired");
      setSearchParams(searchParams, { replace: true });
    } else {
      if (searchParams.get("confirmed") === "true") {
        showToast(t("emailConfirmed"), "success");
        // Remove the param so it doesn't trigger again on refresh
        searchParams.delete("confirmed");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, showToast, t]);

  return (
    <Container className="Auth-body-wrapper" fluid>
      {loading && (
        <Container className="Auth-body-wrapper" fluid>
          <LoadingPage />
        </Container>
      )}
      {!loading &&
        (!searchParams.get("confirmed") ||
          !searchParams.get("confirmed") === "false") && (
          <Container className="Auth-container-wrapper" fluid>
            <Container className="Auth-container">
              <Image
                className="Auth-logo"
                src="./logo192.png"
                alt="d-FCT logo"
              />

              <h2 className="Auth-title">
                {props.type === "create" ? t("signUpMsg") : t("loginMsg")}
              </h2>

              {!email && (
                <InputGroup className="Auth-input-email" size="md">
                  <InputGroup.Text className="Auth-input-label"></InputGroup.Text>
                  <Form.Control
                    id="Auth-input-text"
                    className="Auth-email-input"
                    aria-label="Enter valid e-mail"
                    aria-describedby="Auth-help-msg"
                    placeholder={t("mailPlaceholder")}
                    onFocus={() => {
                      document.getElementById("Auth-input-text").placeholder =
                        "";
                    }}
                    onBlur={() =>
                      document.getElementById("Auth-input-text").placeholder ===
                      ""
                        ? (document.getElementById(
                            "Auth-input-text"
                          ).placeholder = t("mailPlaceholder"))
                        : pass
                    }
                    size="md"
                  />
                  <Form.Text id="Auth-help-msg" muted />
                </InputGroup>
              )}
              {email && (
                <InputGroup className="Auth-input-email-entered" size="md">
                  <InputGroup.Text
                    className="Auth-input-label"
                    onClick={() => setEmail(null)}
                  ></InputGroup.Text>
                  <Form.Control
                    id="Auth-input-text"
                    className="Auth-email-input"
                    aria-label="Enter valid e-mail"
                    placeholder={email}
                    readOnly
                    size="md"
                  />
                </InputGroup>
              )}
              {email && (
                <>
                  <InputGroup className="Auth-input-pass" size="md">
                    <InputGroup.Text
                      className="Auth-input-label Auth-password-eye"
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <FontAwesomeIcon
                        icon={!showPassword ? faEyeSlash : faEye}
                      />
                    </InputGroup.Text>
                    <Form.Control
                      id="Auth-input-password-text"
                      className="Auth-password-input"
                      aria-label="Enter password"
                      aria-describedby="Auth-help-msg"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      size="md"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault(); // prevent default form submission
                          setPass(passwordInput); // commit on Enter
                        }
                      }}
                    />
                    <Form.Text id="Auth-help-msg" muted />
                  </InputGroup>
                  <Form.Check
                    type="checkbox"
                    id="rememberMe"
                    label={t("keepMeLoggedIn")}
                    className="Auth-keep-logged-toggle"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </>
              )}
              {email && props.type === "login" && !confirmationError && (
                <p className="Auth-alternative-link">{t("forgotPass")}</p>
              )}

              <>
                {!confirmationError && (
                  <>
                    <Button
                      className="Auth-input-button"
                      variant="dark"
                      size="md"
                      onClick={!processing ? handleAuthStep : null}
                      disabled={processing}
                    >
                      {processing ? t("processingMail") : t("authNextStep")}
                    </Button>
                  </>
                )}
                {confirmationError && (
                  <>
                    <p className="Auth-confirmation-warning">
                      {t("accountNotConfirmedMessage")}
                    </p>
                    <Button
                      className="Auth-input-button"
                      variant="dark"
                      size="md"
                      onClick={!resendLoading ? handleResendConfirmation : null}
                      disabled={resendLoading}
                    >
                      {resendLoading ? t("resending") : t("resendConfirmation")}
                    </Button>
                  </>
                )}
              </>
              <p>
                {props.type === "login"
                  ? reactStringReplace(t("signUpAlternativeMsg"), "{}", () => (
                      <NavLink className="Auth-alternative-link" to="/signup">
                        {t("signUpButton")}
                      </NavLink>
                    ))
                  : reactStringReplace(t("loginAlternativeMsg"), "{}", () => (
                      <NavLink className="Auth-alternative-link" to="/login">
                        {t("loginButton")}
                      </NavLink>
                    ))}
              </p>
              <div className="Auth-divider">
                <span className="Auth-divider-or">{t("signUpOR")}</span>
              </div>
              <Button
                id="Auth-oauth-google"
                className="Auth-oauth-button"
                variant="outline-secondary"
                size="md"
                onClick={() => {
                  setLoading(true);
                  loginWithGoogle();
                }}
              >
                <img
                  src="/icons/g.png"
                  alt="Google authentication"
                  className="Auth-oauth-logo"
                />
                {t("loginWithGoogle")}
              </Button>
              {/* Cardano Wallet Login */}

              <Suspense fallback={<LoadingPage type="simple" />}>
                <CardanoWalletLogin onLogin={handleLogin} />
              </Suspense>
            </Container>
          </Container>
        )}
      {searchParams.get("confirmed") === "false" && (
        <Container className="Auth-container confirm-message-box">
          <Image className="Auth-logo" src="./logo192.png" alt="d-FCT logo" />
          <h2 className="Auth-title">{t("confirmYourEmailTitle")}</h2>
          <p className="Auth-confirm-text">{t("confirmYourEmailMsg")}</p>
          <p className="Auth-confirm-text">{t("confirmDidNotReceive")}</p>
          <Button
            className="Auth-input-button"
            variant="dark"
            size="md"
            onClick={!resendLoading ? handleResendConfirmation : null}
            disabled={resendLoading}
          >
            {resendLoading ? t("resending") : t("resendConfirmation")}
          </Button>
        </Container>
      )}
    </Container>
  );
}

export default AuthPage;
