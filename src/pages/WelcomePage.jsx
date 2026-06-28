import "../styles/WelcomePage.css";
import logo from "../icons/logo.svg";
import AuthPage from "./AuthPage";
import useRevealOnScroll from "../hooks/useRevealOnScroll";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";

function WelcomeFeatureCard({ step, title, body }) {
  return (
    <article className="WelcomeFeatureCard" data-reveal>
      <div className="WelcomeFeatureCard-step">{step}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function WelcomeComparisonRow({ feature, traditional, dfct }) {
  return (
    <div className="WelcomeCompare-row" data-reveal>
      <div className="WelcomeCompare-feature">{feature}</div>
      <div className="WelcomeCompare-cell WelcomeCompare-cell--traditional">
        {traditional}
      </div>
      <div className="WelcomeCompare-cell WelcomeCompare-cell--dfct">
        {dfct}
      </div>
    </div>
  );
}

function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useOutletContext();

  useRevealOnScroll();

  const lifecycle = t("welcomePage.lifecycle.items", { returnObjects: true });
  const infrastructure = t("welcomePage.infrastructure.items", {
    returnObjects: true,
  });
  const comparison = t("welcomePage.comparison.rows", { returnObjects: true });

  return (
    <main className="WelcomePage">
      <section className="WelcomePage-hero">
        <div className="WelcomePage-videoBackdrop" aria-hidden="true">
          <video
            className="WelcomePage-video"
            src="/loop.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="WelcomePage-videoVeil" />
        </div>

        <div className="WelcomePage-heroGlow WelcomePage-heroGlow--left" />
        <div className="WelcomePage-heroGlow WelcomePage-heroGlow--right" />
        <div className="WelcomePage-orb WelcomePage-orb--a" />
        <div className="WelcomePage-orb WelcomePage-orb--b" />
        <div className="WelcomePage-orb WelcomePage-orb--c" />

        <div className="WelcomePage-heroInner">
          <section className="WelcomePage-copy" data-reveal>
            <div className="WelcomePage-heroStatementCard">
              <video
                className="WelcomePage-video"
                src="/loop.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="WelcomePage-heroStatementVeil" />

              <div className="WelcomePage-heroStatementContent">
                <div className="WelcomePage-eyebrow">
                  {t("welcomePage.eyebrow")}
                </div>

                <h1>{t("welcomePage.title")}</h1>

                <p className="WelcomePage-lead">{t("welcomePage.subtitle")}</p>

                <div className="WelcomePage-pillRow">
                  {t("welcomePage.highlights", { returnObjects: true }).map(
                    (item) => (
                      <span className="WelcomePage-pill" key={item}>
                        {item}
                      </span>
                    ),
                  )}
                </div>

                <div className="WelcomePage-actions">
                  <button
                    className="WelcomePage-primaryBtn"
                    onClick={() => {
                      if (user) navigate("/submit");
                      else
                        document
                          .getElementById("welcome-auth")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                    }}
                  >
                    {user ? t("verifyContent") : t("welcomePage.startButton")}
                  </button>

                  <button
                    className="WelcomePage-secondaryBtn"
                    onClick={() =>
                      document
                        .getElementById("welcome-lifecycle")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                  >
                    {t("welcomePage.exploreButton")}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside id="welcome-auth" className="WelcomePage-auth" data-reveal>
            <div className="WelcomePage-authHeader">
              <span>{t("welcomePage.authEyebrow")}</span>
              <h2>{t("welcomePage.authTitle")}</h2>
              <p>{t("welcomePage.authBody")}</p>
            </div>

            <AuthPage type="login" />
          </aside>
        </div>
      </section>

      <section id="welcome-lifecycle" className="WelcomeSection">
        <div className="WelcomeSection-head" data-reveal>
          <span className="WelcomeSection-eyebrow">
            {t("welcomePage.lifecycle.eyebrow")}
          </span>
          <h2>{t("welcomePage.lifecycle.title")}</h2>
          <p>{t("welcomePage.lifecycle.body")}</p>
        </div>

        <div className="WelcomeFlow">
          <div className="WelcomeFlow-line" aria-hidden="true" />
          {lifecycle.map((item, index) => (
            <div
              className="WelcomeFlow-step"
              key={item.title}
              data-flow-step={index + 1}
            >
              <WelcomeFeatureCard
                step={`0${index + 1}`}
                title={item.title}
                body={item.body}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="WelcomeSection WelcomeSection--infrastructure">
        <div className="WelcomeSection-head" data-reveal>
          <span className="WelcomeSection-eyebrow">
            {t("welcomePage.infrastructure.eyebrow")}
          </span>
          <h2>{t("welcomePage.infrastructure.title")}</h2>
          <p>{t("welcomePage.infrastructure.body")}</p>
        </div>

        <div className="WelcomeTrustMap" data-reveal>
          <div className="WelcomeTrustMap-core">
            <div className="WelcomeTrustMap-logoWrap" aria-hidden="true">
              <div className="WelcomeTrustMap-logoOrbit WelcomeTrustMap-logoOrbit--outer" />
              <div className="WelcomeTrustMap-logoOrbit WelcomeTrustMap-logoOrbit--inner" />
              <img
                className="WelcomeTrustMap-logo"
                src="/logo192.png"
                alt=""
                onError={(event) => {
                  event.currentTarget.src = logo;
                }}
              />
            </div>
            <span>d-FCT</span>
            <small>{t("welcomePage.infrastructure.core")}</small>
          </div>

          {infrastructure.map((item) => (
            <article className="WelcomeTrustNode" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="WelcomeSection">
        <div className="WelcomeSection-head" data-reveal>
          <span className="WelcomeSection-eyebrow">
            {t("welcomePage.comparison.eyebrow")}
          </span>
          <h2>{t("welcomePage.comparison.title")}</h2>
          <p>{t("welcomePage.comparison.body")}</p>
        </div>

        <div className="WelcomeCompare" data-reveal>
          <div className="WelcomeCompare-header">
            <div>{t("welcomePage.comparison.feature")}</div>
            <div>{t("welcomePage.comparison.traditional")}</div>
            <div>{t("welcomePage.comparison.dfct")}</div>
          </div>

          {comparison.map((row) => (
            <WelcomeComparisonRow
              key={row.feature}
              feature={row.feature}
              traditional={row.traditional}
              dfct={row.dfct}
            />
          ))}
        </div>
      </section>

      <section className="WelcomeCTA" data-reveal>
        <div>
          <span className="WelcomeSection-eyebrow">
            {t("welcomePage.cta.eyebrow")}
          </span>
          <h2>{t("welcomePage.cta.title")}</h2>
          <p>{t("welcomePage.cta.body")}</p>
        </div>

        <button
          className="WelcomePage-primaryBtn"
          onClick={() => navigate(user ? "/submit" : "/login")}
        >
          {user ? t("verifyContent") : t("logIn")}
        </button>
      </section>
    </main>
  );
}

export default WelcomePage;
