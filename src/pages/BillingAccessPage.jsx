import { useEffect, useState } from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useBillingCredits } from "../hooks/useBillingCredits";
import "../styles/billing/BillingAccess.css";

function formatCredits(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function packageTranslation(t, pkg, field, fallback) {
  const key = String(pkg?.key || pkg?.package_key || pkg?.code || "").trim();
  if (!key) return fallback;

  return t(`billingAccess.packageCatalog.${key}.${field}`, {
    defaultValue: fallback,
  });
}

function formatPaymentAmount(intent) {
  const amount = intent?.display_price ??
    intent?.amount_due ??
    intent?.price_amount ??
    intent?.amount ??
    intent?.price;

  if (amount === undefined || amount === null || amount === "") return "—";

  const currency = intent?.currency_code ||
    intent?.price_currency ||
    intent?.currency ||
    "";

  return `${amount} ${currency}`.trim();
}

function formatIntentDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function packageDisplayName(t, pkg) {
  return packageTranslation(
    t,
    pkg,
    "name",
    pkg?.name || pkg?.code || t("billingAccess.unnamedPackage"),
  );
}

export default function BillingAccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const user = outlet.user;

  const {
    balance,
    accessSummary,
    packages,
    paymentIntents,
    purchaseLoading,
    purchasePackage,
  } = useBillingCredits(user);

  const [purchaseNotice, setPurchaseNotice] = useState(null);

  useEffect(() => {
    if (!user?.access_token) navigate("/login");
  }, [navigate, user?.access_token]);

  const creditAmount =
    balance?.credits_available ??
    balance?.available_credits ??
    balance?.balance ??
    balance?.amount ??
    0;

  const freeTopicsRemaining =
    accessSummary?.free_topics_remaining ??
    accessSummary?.quota?.free_topics_remaining ??
    "—";

  const handlePackagePurchase = async (pkg) => {
    setPurchaseNotice(null);

    try {
      await purchasePackage(pkg);
      setPurchaseNotice({
        variant: "success",
        message: t("billingAccess.purchaseIntentCreated", {
          packageName: packageDisplayName(t, pkg),
        }),
      });
    } catch (err) {
      setPurchaseNotice({
        variant: "secondary",
        message: t("billingAccess.purchaseIntentFailed"),
      });
    }
  };

  return (
    <main className="BillingAccessPage">
      <Container className="BillingAccess">
        <header className="BillingAccess-header">
          <div>
            <span className="BillingAccess-eyebrow">{t("billingAccess.eyebrow")}</span>
            <h1>{t("billingAccess.title")}</h1>
            <p>{t("billingAccess.subtitle")}</p>
          </div>
        </header>

        <Row className="g-3">
          <Col lg={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("billingAccess.creditBalance")}</div>
                <div className="BillingAccess-balanceValue">{formatCredits(creditAmount)}</div>
                <div className="BillingAccess-cardCopy">{t("billingAccess.creditBalanceHint")}</div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("billingAccess.publicationAccess")}</div>
                <div className="BillingAccess-metricRow">
                  <span>{t("billingAccess.freeTopicsRemaining")}</span>
                  <strong>{freeTopicsRemaining}</strong>
                </div>
                <div className="BillingAccess-metricRow">
                  <span>{t("billingAccess.accessTier")}</span>
                  <strong>{accessSummary?.tier || t("billingAccess.standardTier")}</strong>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("billingAccess.gatewayStatus")}</div>
                <div className="BillingAccess-gatewayList">
                  <Badge bg="success">Cardano</Badge>
                  <Badge bg="secondary">Pix</Badge>
                  <Badge bg="secondary">Credit card</Badge>
                  <Badge bg="secondary">Stablecoins</Badge>
                </div>
                <div className="BillingAccess-cardCopy">{t("billingAccess.gatewayHint")}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <section className="BillingAccess-section">
          <div className="BillingAccess-sectionHeader">
            <div>
              <h2>{t("billingAccess.packagesTitle")}</h2>
              <p>{t("billingAccess.packagesSubtitle")}</p>
            </div>
            <Button
              variant="primary"
              disabled={packages.length === 0}
              onClick={() => {
                document
                  .querySelector(".BillingAccess-packageGrid")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              {t("billingAccess.addCredits")}
            </Button>
          </div>

          {purchaseNotice ? (
            <Alert variant={purchaseNotice.variant} className="BillingAccess-alert">
              {purchaseNotice.message}
            </Alert>
          ) : null}

          <div className="BillingAccess-packageGrid">
            {packages.length > 0 ? packages.map((pkg) => (
              <Card key={pkg.id || pkg.key || pkg.code || pkg.name} className="BillingAccess-card">
                <Card.Body>
                  <div className="BillingAccess-packageName">
                    {packageTranslation(
                      t,
                      pkg,
                      "name",
                      pkg.name || pkg.code || t("billingAccess.unnamedPackage"),
                    )}
                  </div>
                  <div className="BillingAccess-packageCredits">
                    {formatCredits(pkg.credits || pkg.credits_amount || pkg.credit_amount || 0)} DFCT
                  </div>
                  <div className="BillingAccess-cardCopy">
                    {packageTranslation(
                      t,
                      pkg,
                      "description",
                      pkg.description || t("billingAccess.packageComingSoon"),
                    )}
                  </div>
                  <Button
                    className="BillingAccess-packageAction"
                    variant="outline-primary"
                    disabled={purchaseLoading || apiUnavailable}
                    onClick={() => handlePackagePurchase(pkg)}
                  >
                    {purchaseLoading
                      ? t("billingAccess.purchaseCreating")
                      : t("billingAccess.createPaymentIntent")}
                  </Button>
                </Card.Body>
              </Card>
            )) : (
              <Card className="BillingAccess-card BillingAccess-emptyCard">
                <Card.Body>{t("billingAccess.noPackages")}</Card.Body>
              </Card>
            )}
          </div>
        </section>

        <section className="BillingAccess-section">
          <div className="BillingAccess-sectionHeader">
            <div>
              <h2>{t("billingAccess.activityTitle")}</h2>
              <p>{t("billingAccess.activitySubtitle")}</p>
            </div>
          </div>

          <div className="BillingAccess-tableWrap">
            <Table responsive hover className="BillingAccess-table">
              <thead>
                <tr>
                  <th>{t("billingAccess.intentKind")}</th>
                  <th>{t("billingAccess.intentStatus")}</th>
                  <th>{t("billingAccess.intentAmount")}</th>
                  <th>{t("billingAccess.intentCreated")}</th>
                </tr>
              </thead>
              <tbody>
                {paymentIntents.length > 0 ? paymentIntents.map((intent) => (
                  <tr key={intent.id || intent.intent_id || intent.created_at}>
                    <td>{intent.package?.name || intent.package_name || intent.gateway || "—"}</td>
                    <td>{intent.status || "—"}</td>
                    <td>{formatPaymentAmount(intent)}</td>
                    <td>{formatIntentDate(intent.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4">{t("billingAccess.noActivity")}</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        </section>

        <section className="BillingAccess-note">
          {t("billingAccess.publishFlowNote")}
        </section>
      </Container>
    </main>
  );
}
