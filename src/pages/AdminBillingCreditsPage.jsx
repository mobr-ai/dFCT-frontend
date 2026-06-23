import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Form,
  Modal,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faCoins, faCrown, faRotateRight } from "@fortawesome/free-solid-svg-icons";

import { useAdminBillingCredits } from "../hooks/useAdminBillingCredits";
import "../styles/billing/BillingAccess.css";

function numberFrom(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function formatCredits(value) {
  const n = numberFrom(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(6).replace(/\.?0+$/, "");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function shorten(value, head = 10, tail = 6) {
  const s = String(value || "");
  if (!s) return "—";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function userIdOf(row) {
  return row?.user_id ?? row?.id;
}

function userLabel(row) {
  return row?.email || row?.username || row?.display_name || `#${userIdOf(row) || "—"}`;
}

function gatewayLabel(item) {
  if (typeof item === "string") return item;
  return item?.label || item?.name || item?.key || item?.gateway || item?.code || "—";
}

function sortableValue(row, field) {
  if (field === "credits") return numberFrom(row?.credits_available, row?.balance);
  if (field === "user") return userLabel(row).toLowerCase();
  return String(row?.[field] ?? "").toLowerCase();
}

function BillingActionModal({ t, row, action, onClose, onGrantCredits }) {
  const [amount, setAmount] = useState("25");
  const [reason, setReason] = useState("admin_manual_grant");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (action === "adjustCredits") {
      setAmount("25");
      setReason("admin_manual_grant");
      setNote("");
    }
  }, [action, row]);

  if (!row || !action) return null;

  const isRealAction = action === "adjustCredits";

  const titleKey = {
    adjustCredits: "adminBilling.actionAdjustCredits",
    grantAccess: "adminBilling.actionGrantAccess",
    revokeAccess: "adminBilling.actionRevokeAccess",
    resetFreeTopics: "adminBilling.actionResetFreeTopics",
  }[action];

  const submit = async (event) => {
    event.preventDefault();

    if (!isRealAction) {
      onClose();
      return;
    }

    const parsedAmount = Number(String(amount || "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      await onGrantCredits({
        user_id: Number(userIdOf(row)),
        amount: parsedAmount,
        reason,
        note,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show onHide={submitting ? undefined : onClose} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>{t(titleKey)}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="DfctBillingAdmin-modalBlock">
            <span>{t("adminBilling.selectedUser")}</span>
            <strong>{userLabel(row)}</strong>
            <small>#{userIdOf(row)}</small>
          </div>

          {!isRealAction ? (
            <div className="DfctBillingAdmin-placeholderNotice">
              {t("adminBilling.actionNotBackedYet")}
            </div>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>{t("adminBilling.grantAmountLabel")}</Form.Label>
                <Form.Control
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t("adminBilling.grantReasonLabel")}</Form.Label>
                <Form.Control
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>{t("adminBilling.grantNoteLabel")}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("adminBilling.grantNotePlaceholder")}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" disabled={submitting} onClick={onClose}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("adminBilling.grantSubmitting") : t("adminBilling.confirmAction")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function AdminStat({ label, value, caption, tone }) {
  return (
    <div className={`DfctBillingAdmin-stat ${tone ? `DfctBillingAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function ToggleRow({ label, description, enabled }) {
  return (
    <div className="DfctBillingAdmin-toggleRow">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <span className={`DfctBillingAdmin-toggle ${enabled ? "is-on" : ""}`}>
        <span />
        {enabled ? "On" : "Off"}
      </span>
    </div>
  );
}

export default function AdminBillingCreditsPage() {
  const { t } = useTranslation();
  const outletContext = useOutletContext() || {};
  const { user, showToast } = outletContext;

  const {
    users,
    creditGrants,
    paymentIntents,
    creditPackages,
    gateways,
    accessTiers,
    loading,
    actionLoading,
    accessDenied,
    apiUnavailable,
    error,
    lastUpdatedAt,
    grantCredits,
    fulfillPaymentIntent,
  } = useAdminBillingCredits(user);

  const [activeTab, setActiveTab] = useState("billing");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("user_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [modalState, setModalState] = useState({ action: null, row: null });

  const handleFulfillPaymentIntent = async (intent) => {
    const paymentIntentId = intent?.payment_intent_id || intent?.id;

    if (!paymentIntentId) return;

    try {
      await fulfillPaymentIntent(paymentIntentId);
      showToast?.(t("adminBilling.fulfillPaymentIntentSuccess"), "success");
    } catch (err) {
      showToast?.(
        err?.message || t("adminBilling.fulfillPaymentIntentError"),
        "danger",
      );
    }
  };

  const normalizedUsers = useMemo(
    () =>
      users.map((row) => {
        const credits = numberFrom(row?.credits_available, row?.balance);
        return {
          ...row,
          user_id: userIdOf(row),
          credits_available: credits,
          access_tier: row?.access_tier || row?.tier || "standard",
          free_topics_remaining: row?.free_topics_remaining ?? 3,
          wallet_address: row?.wallet_address || row?.wallet || "",
          premium_until: row?.premium_until || row?.premium_expires_at || null,
        };
      }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? normalizedUsers
      : normalizedUsers.filter((row) =>
          [
            row.user_id,
            row.email,
            row.username,
            row.display_name,
            row.wallet_address,
            row.access_tier,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        );

    return [...filtered].sort((a, b) => {
      const av = sortableValue(a, sortField);
      const bv = sortableValue(b, sortField);

      if (typeof av === "number" && typeof bv === "number") {
        return sortDirection === "asc" ? av - bv : bv - av;
      }

      return sortDirection === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [normalizedUsers, search, sortDirection, sortField]);

  const stats = useMemo(() => {
    const shownBlocked = filteredUsers.filter((row) => row.access_tier === "blocked").length;
    const shownPremium = filteredUsers.filter((row) =>
      ["premium", "pro", "admin"].includes(String(row.access_tier || "").toLowerCase()),
    ).length;
    const shownBalance = filteredUsers.reduce(
      (sum, row) => sum + numberFrom(row.credits_available, row.balance),
      0,
    );

    return {
      totalUsers: normalizedUsers.length,
      filteredTotal: filteredUsers.length,
      shownBlocked,
      shownPremium,
      shownBalance,
    };
  }, [filteredUsers, normalizedUsers.length]);

  const sortBy = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const sortIcon = (field) => {
    if (sortField !== field) return "⇅";
    return sortDirection === "asc" ? "▲" : "▼";
  };

  const openAction = (action, row) => setModalState({ action, row });
  const closeAction = () => setModalState({ action: null, row: null });

  const onGrantCredits = async (payload) => {
    await grantCredits(payload);
    showToast?.(t("adminBilling.grantSuccess"), "success");
  };

  if (accessDenied) {
    return (
      <main className="BillingAccessPage AdminBillingPage">
        <Container className="BillingAccess">
          <section className="BillingAccess-accessDeniedCard">
            <span className="BillingAccess-eyebrow">{t("adminBilling.eyebrow")}</span>
            <h1>{t("adminBilling.accessDeniedTitle")}</h1>
            <p>{t("adminBilling.accessDeniedText")}</p>
            <p className="BillingAccess-cardCopy">{t("adminBilling.accessDeniedHint")}</p>
          </section>
        </Container>
      </main>
    );
  }

  return (
    <main className="BillingAccessPage AdminBillingPage">
      <Container className="BillingAccess DfctBillingAdmin">
        <div className="BillingAccess-header">
          <div>
            <span className="BillingAccess-eyebrow">{t("adminBilling.eyebrow")}</span>
            <h1>{t("adminBilling.title")}</h1>
            <p>{t("adminBilling.subtitle")}</p>
          </div>

          <span className="BillingAccess-syncPill">
            {loading ? <Spinner animation="border" size="sm" /> : <span className="BillingAccess-syncDot" />}
            {apiUnavailable
              ? t("adminBilling.syncWaiting")
              : lastUpdatedAt
                ? t("adminBilling.syncedAt", {
                    time: lastUpdatedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })
                : t("adminBilling.synced")}
          </span>
        </div>

        {error ? <div className="BillingAccess-error">{error}</div> : null}

        <Tabs
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key || "billing")}
          className="BillingAccess-tabs DfctBillingAdmin-tabs"
        >
          <Tab eventKey="billing" title={t("adminBilling.capTabBillingAccess")}>
            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.billingSectionTitle")}</h2>
                <p>{t("adminBilling.billingSectionSubtitle")}</p>
              </div>

              <div className="DfctBillingAdmin-statGrid">
                <AdminStat
                  label={t("adminBilling.statsTotalUsers")}
                  value={stats.totalUsers}
                  caption={t("adminBilling.statsFilteredCaption", {
                    count: stats.filteredTotal,
                  })}
                />
                <AdminStat
                  label={t("adminBilling.statsBlockedShown")}
                  value={stats.shownBlocked}
                  caption={t("adminBilling.statsBlockedShownCaption")}
                  tone="red"
                />
                <AdminStat
                  label={t("adminBilling.statsPremiumShown")}
                  value={stats.shownPremium}
                  caption={t("adminBilling.statsPremiumShownCaption")}
                />
                <AdminStat
                  label={t("adminBilling.statsBalanceShown")}
                  value={`${formatCredits(stats.shownBalance)} DFCT`}
                  caption={t("adminBilling.statsBalanceShownCaption")}
                  tone="green"
                />
              </div>

              <Form.Control
                className="DfctBillingAdmin-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("adminBilling.billingSearchPlaceholder")}
              />

              <div className="DfctBillingAdmin-tableWrap DfctBillingAdmin-userTableWrap">
                <table className="DfctBillingAdmin-table">
                  <thead>
                    <tr>
                      <th>{t("adminBilling.colActions")}</th>
                      <th onClick={() => sortBy("user_id")}>
                        {t("adminBilling.colId")} {sortIcon("user_id")}
                      </th>
                      <th onClick={() => sortBy("user")}>
                        {t("adminBilling.colUser")} {sortIcon("user")}
                      </th>
                      <th>{t("adminBilling.colWallet")}</th>
                      <th onClick={() => sortBy("access_tier")}>
                        {t("adminBilling.colPlan")} {sortIcon("access_tier")}
                      </th>
                      <th>{t("adminBilling.colAccess")}</th>
                      <th onClick={() => sortBy("credits")}>
                        {t("adminBilling.colCredits")} {sortIcon("credits")}
                      </th>
                      <th>{t("adminBilling.colFreeTopics")}</th>
                      <th>{t("adminBilling.colPremiumUntil")}</th>
                      <th>{t("adminBilling.colLastGrant")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10}>{t("adminBilling.noUsers")}</td>
                      </tr>
                    ) : (
                      filteredUsers.map((row) => {
                        const lastGrant = creditGrants.find(
                          (grant) => Number(grant.user_id) === Number(row.user_id),
                        );

                        return (
                          <tr key={row.user_id}>
                            <td>
                              <div className="DfctBillingAdmin-actions">
                                <button
                                  type="button"
                                  title={t("adminBilling.actionGrantAccess")}
                                  onClick={() => openAction("grantAccess", row)}
                                >
                                  <FontAwesomeIcon icon={faCrown} />
                                </button>
                                <button
                                  type="button"
                                  title={t("adminBilling.actionRevokeAccess")}
                                  onClick={() => openAction("revokeAccess", row)}
                                >
                                  <FontAwesomeIcon icon={faBan} />
                                </button>
                                <button
                                  type="button"
                                  title={t("adminBilling.actionResetFreeTopics")}
                                  onClick={() => openAction("resetFreeTopics", row)}
                                >
                                  <FontAwesomeIcon icon={faRotateRight} />
                                </button>
                                <button
                                  type="button"
                                  title={t("adminBilling.actionAdjustCredits")}
                                  onClick={() => openAction("adjustCredits", row)}
                                >
                                  <FontAwesomeIcon icon={faCoins} />
                                </button>
                              </div>
                            </td>
                            <td>{row.user_id}</td>
                            <td>{userLabel(row)}</td>
                            <td title={row.wallet_address}>{shorten(row.wallet_address)}</td>
                            <td>{row.access_tier}</td>
                            <td>{row.access_tier}</td>
                            <td>{formatCredits(row.credits_available)}</td>
                            <td>{row.free_topics_remaining}</td>
                            <td>{formatDate(row.premium_until)}</td>
                            <td>{lastGrant ? formatDate(lastGrant.created_at) : "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.notificationsTitle")}</h2>
                <p>{t("adminBilling.notificationsSubtitle")}</p>
              </div>

              <ToggleRow
                label={t("adminBilling.notifyCreditGranted")}
                description={t("adminBilling.notifyCreditGrantedDescription")}
                enabled
              />
              <ToggleRow
                label={t("adminBilling.notifyPaymentCreated")}
                description={t("adminBilling.notifyPaymentCreatedDescription")}
                enabled={false}
              />
              <ToggleRow
                label={t("adminBilling.notifyPaymentConfirmed")}
                description={t("adminBilling.notifyPaymentConfirmedDescription")}
                enabled={false}
              />
              <ToggleRow
                label={t("adminBilling.notifyAccessChanged")}
                description={t("adminBilling.notifyAccessChangedDescription")}
                enabled
              />
            </section>
          </Tab>

          <Tab eventKey="grants" title={t("adminBilling.tabsGrants")}>
            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.recentGrantsTitle")}</h2>
                <p>{t("adminBilling.recentGrantsSubtitle")}</p>
              </div>

              <div className="DfctBillingAdmin-tableWrap">
                <table className="DfctBillingAdmin-table">
                  <thead>
                    <tr>
                      <th>{t("adminBilling.colId")}</th>
                      <th>{t("adminBilling.colUser")}</th>
                      <th>{t("adminBilling.colAmount")}</th>
                      <th>{t("adminBilling.colReason")}</th>
                      <th>{t("adminBilling.colCreated")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditGrants.length === 0 ? (
                      <tr>
                        <td colSpan={5}>{t("adminBilling.noGrants")}</td>
                      </tr>
                    ) : (
                      creditGrants.map((grant) => (
                        <tr key={grant.ledger_entry_id || grant.id}>
                          <td>{grant.ledger_entry_id || grant.id}</td>
                          <td>#{grant.user_id}</td>
                          <td>{formatCredits(grant.amount)}</td>
                          <td>{grant.reason || "—"}</td>
                          <td>{formatDate(grant.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </Tab>

          <Tab eventKey="payments" title={t("adminBilling.tabsPaymentIntents")}>
            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.paymentIntentsTitle")}</h2>
                <p>{t("adminBilling.paymentIntentsSubtitle")}</p>
              </div>
              {paymentIntents.length === 0 ? (
                <div className="BillingAccess-emptyState">
                  {t("adminBilling.noPaymentIntents")}
                </div>
              ) : (
                <div className="DfctBillingAdmin-paymentIntentList">
                  {paymentIntents.map((intent) => {
                    const packageName =
                      intent.package?.name ||
                      intent.package_name ||
                      intent.package_key ||
                      (intent.package_id ? `#${intent.package_id}` : "—");

                    const credits = formatCredits(
                      intent.credits_amount ||
                      intent.credits ||
                      intent.credit_amount ||
                      0,
                    );

                    const amountDue = numberFrom(
                      intent.amount_due,
                      intent.price_amount,
                      intent.amount,
                      intent.price,
                    );

                    const currency =
                      intent.currency_code ||
                      intent.price_currency ||
                      intent.currency ||
                      "";

                    const paymentIntentId = intent.payment_intent_id || intent.id;
                    const status = String(intent.status || "pending").toLowerCase();
                    const canFulfill = status === "pending";
                    const fulfillLoading = actionLoading === `fulfillPaymentIntent:${paymentIntentId}`;

                    return (
                      <article
                        className="DfctBillingAdmin-paymentIntentCard"
                        key={paymentIntentId || intent.external_reference}
                      >
                        <div className="DfctBillingAdmin-paymentIntentMain">
                          <div>
                            <strong>{packageName}</strong>
                            <span>{shorten(intent.external_reference || intent.id || intent.payment_intent_id)}</span>
                          </div>
                          <span className={`DfctBillingAdmin-statusPill is-${status}`}>
                            {intent.status || "pending"}
                          </span>
                        </div>

                        <div className="DfctBillingAdmin-paymentIntentMeta">
                          <span>
                            <small>{t("adminBilling.intentCredits", "Credits")}</small>
                            <strong>{credits} DFCT</strong>
                          </span>
                          <span>
                            <small>{t("adminBilling.intentAmount", "Amount")}</small>
                            <strong>
                              {amountDue ? `${amountDue} ${currency}` : "—"}
                            </strong>
                          </span>
                          <span>
                            <small>{t("adminBilling.intentGateway", "Gateway")}</small>
                            <strong>{intent.gateway || "—"}</strong>
                          </span>
                          <span className="DfctBillingAdmin-paymentIntentAction">
                            <small>{t("adminBilling.intentActions", "Actions")}</small>
                            {canFulfill ? (
                              <Button
                                size="sm"
                                variant="outline-success"
                                className="DfctBillingAdmin-fulfillPaymentButton"
                                disabled={fulfillLoading}
                                onClick={() => handleFulfillPaymentIntent(intent)}
                              >
                                {fulfillLoading ? (
                                  <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    {t("adminBilling.fulfillPaymentIntentLoading")}
                                  </>
                                ) : (
                                  t("adminBilling.fulfillPaymentIntent")
                                )}
                              </Button>
                            ) : (
                              <strong>{t("adminBilling.intentNoAction", "—")}</strong>
                            )}
                          </span>
                          <span>
                            <small>{t("adminBilling.intentCreated", "Created")}</small>
                            <strong>{formatDate(intent.created_at)}</strong>
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </Tab>

          <Tab eventKey="catalog" title={t("adminBilling.tabsCatalogAccess")}>
            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.packagesTitle")}</h2>
                <p>{t("adminBilling.packagesSubtitle")}</p>
              </div>
              <div className="DfctBillingAdmin-chipRow">
                {creditPackages.length === 0 ? (
                  <span>{t("adminBilling.noPackages")}</span>
                ) : (
                  creditPackages.map((item) => <Badge key={gatewayLabel(item)}>{gatewayLabel(item)}</Badge>)
                )}
              </div>
            </section>

            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.gatewaysTitle")}</h2>
                <p>{t("adminBilling.gatewaysSubtitle")}</p>
              </div>
              <div className="DfctBillingAdmin-chipRow">
                {gateways.map((item) => (
                  <Badge bg="success" key={gatewayLabel(item)}>
                    {gatewayLabel(item)}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="DfctBillingAdmin-section">
              <div className="DfctBillingAdmin-sectionHeader">
                <h2>{t("adminBilling.accessTiersTitle")}</h2>
                <p>{t("adminBilling.accessTiersSubtitle")}</p>
              </div>
              <div className="DfctBillingAdmin-chipRow">
                {accessTiers.length === 0 ? (
                  <span>{t("adminBilling.noAccessTiers")}</span>
                ) : (
                  accessTiers.map((item) => <Badge key={gatewayLabel(item)}>{gatewayLabel(item)}</Badge>)
                )}
              </div>
            </section>
          </Tab>
        </Tabs>

        <BillingActionModal
          t={t}
          row={modalState.row}
          action={modalState.action}
          onClose={closeAction}
          onGrantCredits={onGrantCredits}
        />
      </Container>
    </main>
  );
}
