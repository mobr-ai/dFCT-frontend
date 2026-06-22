import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Tab from "react-bootstrap/Tab";
import Table from "react-bootstrap/Table";
import Tabs from "react-bootstrap/Tabs";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useAdminBillingCredits } from "../hooks/useAdminBillingCredits";
import "../styles/billing/BillingAccess.css";

function formatCredits(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatSyncTime(value) {
  if (!value) return "";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AdminSyncStatus({
  apiUnavailable,
  loading,
  lastUpdatedAt,
  consecutiveFailures,
}) {
  const { t } = useTranslation();

  let label = t("adminBilling.syncPreparing");

  if (apiUnavailable) {
    label = t("adminBilling.syncWaitingForApi");
  } else if (loading) {
    label = t("adminBilling.syncing");
  } else if (consecutiveFailures > 0) {
    label = t("adminBilling.syncBackoff", { count: consecutiveFailures });
  } else if (lastUpdatedAt) {
    label = t("adminBilling.lastSynced", {
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

export default function AdminBillingCreditsPage() {
  const { t } = useTranslation();
  const outlet = useOutletContext() || {};
  const user = outlet.user;

  const {
    users,
    grants,
    paymentIntents,
    packages,
    gateways,
    accessTiers,
    loading,
    lastUpdatedAt,
    consecutiveFailures,
    apiUnavailable,
    error,
  } = useAdminBillingCredits(user);

  if (!user?.is_admin) {
    return (
      <main className="BillingAccessPage">
        <Container className="BillingAccess">
          <Alert variant="warning">
            <strong>{t("adminBilling.accessDeniedTitle")}</strong>
            <div>{t("adminBilling.accessDeniedText")}</div>
          </Alert>
        </Container>
      </main>
    );
  }

  return (
    <main className="BillingAccessPage AdminBillingPage">
      <Container className="BillingAccess">
        <header className="BillingAccess-header">
          <div>
            <span className="BillingAccess-eyebrow">{t("adminBilling.eyebrow")}</span>
            <h1>{t("adminBilling.title")}</h1>
            <p>{t("adminBilling.subtitle")}</p>
          </div>

          <AdminSyncStatus
            apiUnavailable={apiUnavailable}
            loading={loading}
            lastUpdatedAt={lastUpdatedAt}
            consecutiveFailures={consecutiveFailures}
          />
        </header>

        {apiUnavailable ? (
          <Alert variant="secondary" className="BillingAccess-alert">
            <strong>{t("adminBilling.apiPendingTitle")}</strong>
            <div>{t("adminBilling.apiPendingText")}</div>
          </Alert>
        ) : error ? (
          <Alert variant="secondary" className="BillingAccess-alert">
            <strong>{t("adminBilling.syncIssueTitle")}</strong>
            <div>{t("adminBilling.syncIssueText")}</div>
            <small>{error}</small>
          </Alert>
        ) : null}

        <Row className="g-3">
          <Col md={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("adminBilling.users")}</div>
                <div className="BillingAccess-balanceValue">{users.length}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("adminBilling.paymentIntents")}</div>
                <div className="BillingAccess-balanceValue">{paymentIntents.length}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="BillingAccess-card">
              <Card.Body>
                <div className="BillingAccess-cardLabel">{t("adminBilling.gateways")}</div>
                <div className="BillingAccess-gatewayList">
                  {(gateways.length ? gateways : [{ code: "cardano", status: "planned" }]).map((gateway) => (
                    <Badge key={gateway.code || gateway.name} bg={gateway.enabled ? "success" : "secondary"}>
                      {gateway.name || gateway.code}
                    </Badge>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="users" className="BillingAccess-tabs mt-4">
          <Tab eventKey="users" title={t("adminBilling.tabUsers")}>
            <div className="BillingAccess-tableWrap">
              <Table responsive hover className="BillingAccess-table">
                <thead>
                  <tr>
                    <th>{t("adminBilling.colUser")}</th>
                    <th>{t("adminBilling.colEmail")}</th>
                    <th>{t("adminBilling.colBalance")}</th>
                    <th>{t("adminBilling.colTier")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? users.map((item) => (
                    <tr key={item.user_id || item.id || item.email}>
                      <td>{item.user_id || item.id || "—"}</td>
                      <td>{item.email || "—"}</td>
                      <td>{formatCredits(item.credits_available || item.balance || 0)}</td>
                      <td>{item.access_tier || item.tier || "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4">{t("adminBilling.noUsers")}</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Tab>

          <Tab eventKey="grants" title={t("adminBilling.tabGrants")}>
            <pre className="BillingAccess-jsonPreview">{JSON.stringify(grants, null, 2)}</pre>
          </Tab>

          <Tab eventKey="payments" title={t("adminBilling.tabPayments")}>
            <pre className="BillingAccess-jsonPreview">{JSON.stringify(paymentIntents, null, 2)}</pre>
          </Tab>

          <Tab eventKey="catalog" title={t("adminBilling.tabCatalog")}>
            <Row className="g-3">
              <Col lg={6}>
                <Card className="BillingAccess-card">
                  <Card.Body>
                    <h2>{t("adminBilling.packagesTitle")}</h2>
                    <pre className="BillingAccess-jsonPreview">{JSON.stringify(packages, null, 2)}</pre>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="BillingAccess-card">
                  <Card.Body>
                    <h2>{t("adminBilling.accessTiersTitle")}</h2>
                    <pre className="BillingAccess-jsonPreview">{JSON.stringify(accessTiers, null, 2)}</pre>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </Container>
    </main>
  );
}
