import { useEffect } from "react";
import Alert from "react-bootstrap/Alert";
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

function formatSyncTime(value) {
  if (!value) return "";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function BillingSyncStatus({
  apiUnavailable,
  loading,
  lastUpdatedAt,
  consecutiveFailures,
}) {
  const { t } = useTranslation();

  let label = t("billingAccess.syncPreparing");

  if (apiUnavailable) {
    label = t("billingAccess.syncWaitingForApi");
  } else if (loading) {
    label = t("billingAccess.syncing");
  } else if (consecutiveFailures > 0) {
    label = t("billingAccess.syncBackoff", { count: consecutiveFailures });
  } else if (lastUpdatedAt) {
    label = t("billingAccess.lastSynced", {
      time: formatSyncTime(lastUpdatedAt),
    });
  }

  return (
    <div className={`BillingAccess-syncBadge ${apiUnavailable ? "is-pending" : ""}`}>
      <span className="BillingAccess-syncDot" />
      <span>{label}</span>
    </div>
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
    loading,
    error,
    lastUpdatedAt,
    consecutiveFailures,
    apiUnavailable,
  } = useBillingCredits(user);

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

  return (
    <main className="BillingAccessPage">
      <Container className="BillingAccess">
        <header className="BillingAccess-header">
          <div>
            <span className="BillingAccess-eyebrow">{t("billingAccess.eyebrow")}</span>
            <h1>{t("billingAccess.title")}</h1>
            <p>{t("billingAccess.subtitle")}</p>
          </div>
          <BillingSyncStatus
            apiUnavailable={apiUnavailable}
            loading={loading}
            lastUpdatedAt={lastUpdatedAt}
            consecutiveFailures={consecutiveFailures}
          />
        </header>

        {apiUnavailable ? (
          <Alert variant="secondary" className="BillingAccess-alert">
            <strong>{t("billingAccess.apiPendingTitle")}</strong>
            <div>{t("billingAccess.apiPendingText")}</div>
          </Alert>
        ) : error ? (
          <Alert variant="secondary" className="BillingAccess-alert">
            <strong>{t("billingAccess.syncIssueTitle")}</strong>
            <div>{t("billingAccess.syncIssueText")}</div>
            <small>{error}</small>
          </Alert>
        ) : null}

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
            <Button variant="primary" disabled>{t("billingAccess.addCredits")}</Button>
          </div>

          <div className="BillingAccess-packageGrid">
            {packages.length > 0 ? packages.map((pkg) => (
              <Card key={pkg.id || pkg.code || pkg.name} className="BillingAccess-card">
                <Card.Body>
                  <div className="BillingAccess-packageName">
                    {pkg.name || pkg.code || t("billingAccess.unnamedPackage")}
                  </div>
                  <div className="BillingAccess-packageCredits">
                    {formatCredits(pkg.credits || pkg.credit_amount || 0)} DFCT
                  </div>
                  <div className="BillingAccess-cardCopy">
                    {pkg.display_price || pkg.price || pkg.amount || "—"} {pkg.currency || ""}
                  </div>
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
                    <td>{intent.kind || intent.gateway || "—"}</td>
                    <td>{intent.status || "—"}</td>
                    <td>{intent.display_price || intent.amount || "—"}</td>
                    <td>{intent.created_at || "—"}</td>
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
