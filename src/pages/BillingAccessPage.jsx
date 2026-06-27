import { useEffect, useState } from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
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

function preferredCurrencyForLanguage(language) {
  return String(language || "").toLowerCase().startsWith("pt") ? "BRL" : "USD";
}

function formatMoneyAmount(amount, currency, language) {
  if (amount === undefined || amount === null || amount === "") return "—";

  const numericAmount = Number(amount);
  const currencyCode = String(currency || "").toUpperCase();

  if (!currencyCode) return String(amount);

  const fiatCurrencies = new Set(["BRL", "USD", "EUR", "GBP"]);

  if (!Number.isFinite(numericAmount) || !fiatCurrencies.has(currencyCode)) {
    return `${amount} ${currencyCode}`.trim();
  }

  return new Intl.NumberFormat(language || undefined, {
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount);
}

function formatPaymentAmount(intent, language) {
  const amount = intent?.display_amount ??
    intent?.amount_due ??
    intent?.price_amount ??
    intent?.amount ??
    intent?.price;

  const currency = intent?.display_currency ||
    intent?.currency_code ||
    intent?.price_currency ||
    intent?.currency ||
    "";

  return formatMoneyAmount(amount, currency, language);
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

function formatCreditAmount(amount) {
  const numeric = Number(amount || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatCredits(numeric)} DFCT`;
}

function formatActivityStatus(status) {
  const value = String(status || "—").trim();

  if (!value || value === "—") return "—";

  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function activityTimestamp(item) {
  const raw = item?.created_at || item?.createdAt || item?.updated_at || item?.updatedAt;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function ledgerActivityLabel(t, entry) {
  const reason = String(entry?.reason || entry?.source_type || "").toLowerCase();

  if (reason.includes("topic_publication")) {
    const topicId = entry?.source_id || entry?.metadata?.topic_id;
    return topicId
      ? t("billingAccess.activityTopicPublicationWithId", { topicId })
      : t("billingAccess.activityTopicPublication");
  }

  if (reason.includes("payment_fulfilled")) {
    return t("billingAccess.activityPaymentFulfilled");
  }

  if (reason.includes("manual_grant") || Number(entry?.amount) > 0) {
    return t("billingAccess.activityCreditGrant");
  }

  return entry?.reason || entry?.source_type || t("billingAccess.activityLedgerEntry");
}

function ledgerActivityStatus(t, entry) {
  const reason = String(entry?.reason || entry?.source_type || "").toLowerCase();

  if (reason.includes("topic_publication")) {
    return t("billingAccess.activityCreditDebit");
  }

  if (reason.includes("payment_fulfilled")) {
    return t("billingAccess.activityPaymentFulfilled");
  }

  if (reason.includes("manual_grant") || Number(entry?.amount) > 0) {
    return t("billingAccess.activityCreditGrant");
  }

  return formatActivityStatus(entry?.reason || entry?.source_type);
}

function buildBillingActivity({ t, language, paymentIntents = [], ledgerEntries = [] }) {
  const paymentRows = paymentIntents.map((intent) => ({
    id: `intent:${intent.payment_intent_id || intent.id || intent.created_at}`,
    kind: intent.package?.name || intent.package_name || intent.gateway || t("billingAccess.activityPaymentRequest"),
    status: formatActivityStatus(intent.status),
    amount: formatPaymentAmount(intent, language),
    createdAt: intent.created_at,
    timestamp: activityTimestamp(intent),
  }));

  const ledgerRows = ledgerEntries.map((entry) => ({
    id: `ledger:${entry.ledger_entry_id || entry.id || entry.created_at}`,
    kind: ledgerActivityLabel(t, entry),
    status: ledgerActivityStatus(t, entry),
    amount: formatCreditAmount(entry.amount),
    createdAt: entry.created_at,
    timestamp: activityTimestamp(entry),
  }));

  return [...ledgerRows, ...paymentRows]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);
}

function paymentIntentId(intent) {
  return intent?.payment_intent_id || intent?.id || intent?.intent_id || "—";
}

function paymentIntentStatus(intent) {
  return formatActivityStatus(intent?.status || "pending");
}

function paymentMethodLabel(t, intent) {
  const gateway = String(intent?.gateway || intent?.payment_method || "manual").toLowerCase();

  if (gateway === "cardano") return "Cardano";
  if (gateway === "manual_grant" || gateway === "manual") return t("billingAccess.paymentMethodManual");
  if (gateway === "credit_card") return t("billingAccess.paymentMethodCreditCard");
  if (gateway === "stablecoin") return t("billingAccess.paymentMethodStablecoin");
  if (gateway === "pix") return "Pix";

  return formatActivityStatus(gateway);
}

function paymentPackageName(t, intent, fallbackPackage) {
  return (
    intent?.package?.name ||
    intent?.package_name ||
    fallbackPackage?.name ||
    packageDisplayName(t, fallbackPackage) ||
    t("billingAccess.unnamedPackage")
  );
}

function paymentCredits(intent, fallbackPackage) {
  return (
    intent?.credits ||
    intent?.credit_amount ||
    intent?.credits_amount ||
    intent?.package?.credits ||
    fallbackPackage?.credits ||
    fallbackPackage?.credits_amount ||
    fallbackPackage?.credit_amount ||
    0
  );
}

function PaymentRequestModal({
  show,
  onHide,
  t,
  language,
  intent,
  selectedPackage,
}) {
  if (!intent) return null;

  const amount = formatPaymentAmount(intent, language);
  const packageName = paymentPackageName(t, intent, selectedPackage);
  const credits = paymentCredits(intent, selectedPackage);
  const method = paymentMethodLabel(t, intent);
  const status = paymentIntentStatus(intent);
  const reference = intent?.reference || intent?.payment_reference || intent?.tx_reference || paymentIntentId(intent);

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      className="BillingPaymentModal"
      contentClassName="BillingPaymentModal-content"
    >
      <Modal.Header>
        <Modal.Title>{t("billingAccess.paymentModalTitle")}</Modal.Title>
        <button
          type="button"
          className="BillingPaymentModal-close"
          aria-label={t("cancel")}
          onClick={onHide}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body>
        <div className="BillingPaymentModal-hero">
          <span>{t("billingAccess.paymentModalEyebrow")}</span>
          <strong>{packageName}</strong>
          <small>{t("billingAccess.paymentModalCreated")}</small>
        </div>

        <div className="BillingPaymentModal-grid">
          <div>
            <span>{t("billingAccess.paymentModalCredits")}</span>
            <strong>{formatCredits(credits)} DFCT</strong>
          </div>
          <div>
            <span>{t("billingAccess.paymentModalAmount")}</span>
            <strong>{amount}</strong>
          </div>
          <div>
            <span>{t("billingAccess.paymentModalMethod")}</span>
            <strong>{method}</strong>
          </div>
          <div>
            <span>{t("billingAccess.paymentModalStatus")}</span>
            <strong>{status}</strong>
          </div>
        </div>

        <div className="BillingPaymentModal-reference">
          <span>{t("billingAccess.paymentModalReference")}</span>
          <code>{reference}</code>
        </div>

        <div className="BillingPaymentModal-instructions">
          <strong>{t("billingAccess.paymentModalNextStepsTitle")}</strong>
          <p>{t("billingAccess.paymentModalNextStepsText")}</p>
          <p>{t("billingAccess.paymentModalAdminText")}</p>
        </div>

        <div className="BillingPaymentModal-roadmap">
          {t("billingAccess.paymentModalRoadmap")}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t("billingAccess.paymentModalClose")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function BillingAccessPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const user = outlet.user;

  const {
    balance,
    accessSummary,
    packages,
    paymentIntents,
    ledgerEntries,
    purchaseLoading,
    apiUnavailable,
    purchasePackage,
  } = useBillingCredits(user);

  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState(null);
  const [selectedPaymentPackage, setSelectedPaymentPackage] = useState(null);

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

  const billingActivity = buildBillingActivity({
    t,
    language: i18n.language,
    paymentIntents,
    ledgerEntries,
  });

  const handlePackagePurchase = async (pkg) => {
    setPurchaseNotice(null);

    try {
      const intent = await purchasePackage(pkg, {
        preferredCurrency: preferredCurrencyForLanguage(i18n.language),
      });

      setSelectedPaymentIntent(intent);
      setSelectedPaymentPackage(pkg);

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
            <div className={`BillingAccess-purchaseNotice is-${purchaseNotice.variant || "info"}`}>
              {purchaseNotice.message}
            </div>
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

          <div className="BillingAccess-tableWrap BillingAccess-activityTableWrap">
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
                {billingActivity.length > 0 ? billingActivity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.kind}</td>
                    <td>{item.status}</td>
                    <td>{item.amount}</td>
                    <td>{formatIntentDate(item.createdAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4">{t("billingAccess.noActivity")}</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        </section>

        <PaymentRequestModal
          show={Boolean(selectedPaymentIntent)}
          onHide={() => setSelectedPaymentIntent(null)}
          t={t}
          language={i18n.language}
          intent={selectedPaymentIntent}
          selectedPackage={selectedPaymentPackage}
        />

      </Container>
    </main>
  );
}
