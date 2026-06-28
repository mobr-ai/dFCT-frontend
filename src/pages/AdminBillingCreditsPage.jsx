import React, { useEffect, useMemo, useRef, useState } from "react";
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

function amountByCurrencyItems(totals = {}) {
  return Object.entries(totals)
    .filter(([, amount]) => numberFrom(amount) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => ({
      currency,
      amount: formatCredits(amount),
    }));
}

function AmountByCurrencyValue({ totals }) {
  const items = amountByCurrencyItems(totals);

  if (!items.length) return "—";

  return (
    <span className="DfctBillingAdmin-currencyStat">
      {items.map((item) => (
        <span className="DfctBillingAdmin-currencyPill" key={item.currency}>
          <span>{item.amount}</span>
          <em>{item.currency}</em>
        </span>
      ))}
    </span>
  );
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

function paymentIntentIdOf(intent) {
  return intent?.payment_intent_id ?? intent?.id;
}

function paymentStatusOf(intent) {
  return String(intent?.status || "pending").toLowerCase();
}

function paymentPackageLabel(intent) {
  return (
    intent?.package?.name ||
    intent?.package?.label ||
    intent?.package_name ||
    intent?.package_key ||
    (intent?.package_id ? `#${intent.package_id}` : "—")
  );
}

function paymentReference(intent) {
  return intent?.external_reference || intent?.reference || intent?.id || intent?.payment_intent_id;
}

function paymentCanFulfill(intent) {
  return paymentStatusOf(intent) === "pending";
}

const PAYMENT_STATUS_FILTER_OPTIONS = [
  "all",
  "pending",
  "paid",
  "fulfilled",
  "completed",
  "expired",
  "cancelled",
  "failed",
];

const PAYMENT_PAGE_SIZE_OPTIONS = [10, 25, 50];

function paymentStatusFilterLabel(t, status) {
  if (status === "all") return t("adminBilling.paymentIntentStatusAll");
  return t(`adminBilling.paymentIntentStatus.${status}`, status);
}

function paymentUserLabel(intent, userById) {
  const userId = intent?.user_id ?? intent?.user?.user_id ?? intent?.user?.id;
  const linkedUser = userById.get(Number(userId));
  const source = intent?.user || linkedUser;

  return (
    source?.email ||
    source?.username ||
    source?.display_name ||
    (userId ? `#${userId}` : "—")
  );
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

const BILLING_NOTIFICATION_ROWS = [
  {
    key: "credit_granted",
    labelKey: "notifyCreditGranted",
    descriptionKey: "notifyCreditGrantedDescription",
  },
  {
    key: "payment_submitted",
    labelKey: "notifyPaymentCreated",
    descriptionKey: "notifyPaymentCreatedDescription",
  },
  {
    key: "payment_confirmed",
    labelKey: "notifyPaymentConfirmed",
    descriptionKey: "notifyPaymentConfirmedDescription",
  },
  {
    key: "access_changed",
    labelKey: "notifyAccessChanged",
    descriptionKey: "notifyAccessChangedDescription",
  },
];

function AdminStat({ label, value, caption, tone }) {
  return (
    <div className={`DfctBillingAdmin-stat ${tone ? `DfctBillingAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  disabled,
  updating,
  status,
  onToggle,
  onLabel,
  offLabel,
}) {
  return (
    <div className={`DfctBillingAdmin-toggleRow ${disabled ? "is-disabled" : ""}`}>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
        {status ? <small className="DfctBillingAdmin-toggleStatus">{status}</small> : null}
      </div>
      <button
        type="button"
        className={`DfctBillingAdmin-toggle ${enabled ? "is-on" : ""}`}
        disabled={disabled || updating}
        onClick={onToggle}
      >
        <span />
        {updating ? "..." : enabled ? onLabel : offLabel}
      </button>
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
    paymentIntentMeta,
    creditPackages,
    gateways,
    accessTiers,
    loading,
    actionLoading,
    accessDenied,
    apiUnavailable,
    error,
    lastUpdatedAt,
    notificationSettings,
    loadPaymentIntents,
    grantCredits,
    fulfillPaymentIntent,
    updateNotificationSetting,
  } = useAdminBillingCredits(user);

  const [activeTab, setActiveTab] = useState("billing");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("user_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentPageSize, setPaymentPageSize] = useState(25);
  const [paymentOffset, setPaymentOffset] = useState(0);
  const [modalState, setModalState] = useState({ action: null, row: null });
  const loadPaymentIntentsRef = useRef(loadPaymentIntents);

  useEffect(() => {
    loadPaymentIntentsRef.current = loadPaymentIntents;
  }, [loadPaymentIntents]);

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

  const handleNotificationToggle = async (key, enabled) => {
    try {
      await updateNotificationSetting(key, enabled);
      showToast?.(t("adminBilling.notificationSettingsSaved"), "success");
    } catch (err) {
      showToast?.(
        err?.message || t("adminBilling.notificationSettingsSaveError"),
        "danger",
      );
    }
  };

  useEffect(() => {
    if (activeTab !== "payments") return;

    loadPaymentIntentsRef.current?.({
      limit: paymentPageSize,
      offset: paymentOffset,
      status: paymentStatusFilter,
    }).catch(() => {});
  }, [activeTab, paymentOffset, paymentPageSize, paymentStatusFilter]);

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

  const userById = useMemo(() => {
    return new Map(
      normalizedUsers
        .filter((row) => row.user_id !== undefined && row.user_id !== null)
        .map((row) => [Number(row.user_id), row]),
    );
  }, [normalizedUsers]);

  const normalizedPaymentIntents = useMemo(
    () =>
      paymentIntents.map((intent) => {
        const paymentIntentId = paymentIntentIdOf(intent);
        const amountDue = numberFrom(
          intent?.amount_due,
          intent?.price_amount,
          intent?.amount,
          intent?.price,
        );
        const currency = intent?.currency_code || intent?.price_currency || intent?.currency || "";
        const userId = intent?.user_id ?? intent?.user?.user_id ?? intent?.user?.id;

        return {
          ...intent,
          payment_intent_id: paymentIntentId,
          user_id: userId,
          user_label: paymentUserLabel(intent, userById),
          package_label: paymentPackageLabel(intent),
          status_normalized: paymentStatusOf(intent),
          credits_normalized: numberFrom(intent?.credits_amount, intent?.credits, intent?.credit_amount),
          amount_due_normalized: amountDue,
          currency_normalized: currency,
          reference_normalized: paymentReference(intent),
          tx_hash_normalized: intent?.tx_hash || "",
          payment_address_normalized: intent?.payment_address || "",
        };
      }),
    [paymentIntents, userById],
  );

  const filteredPaymentIntents = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();

    return normalizedPaymentIntents.filter((intent) => {
      const matchesStatus =
        paymentStatusFilter === "all" || intent.status_normalized === paymentStatusFilter;

      const searchable = [
        intent.payment_intent_id,
        intent.user_id,
        intent.user_label,
        intent.package_label,
        intent.status_normalized,
        intent.gateway,
        intent.currency_normalized,
        intent.reference_normalized,
        intent.tx_hash_normalized,
        intent.payment_address_normalized,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!q || searchable.includes(q));
    });
  }, [normalizedPaymentIntents, paymentSearch, paymentStatusFilter]);

  const isPaymentSearchActive = paymentSearch.trim().length > 0;

  const paymentStats = useMemo(() => {
    if (!isPaymentSearchActive) {
      const statusCounts = paymentIntentMeta?.statusCounts || {};
      const fulfilled =
        numberFrom(statusCounts.paid) +
        numberFrom(statusCounts.fulfilled) +
        numberFrom(statusCounts.completed);

      return {
        total: Number(paymentIntentMeta?.total ?? filteredPaymentIntents.length),
        pending: numberFrom(statusCounts.pending),
        fulfilled,
        amountDueByCurrency: paymentIntentMeta?.volumeByCurrency || {},
        source: "backend",
      };
    }

    const pending = filteredPaymentIntents.filter(
      (intent) => intent.status_normalized === "pending",
    ).length;
    const fulfilled = filteredPaymentIntents.filter((intent) =>
      ["paid", "fulfilled", "completed"].includes(intent.status_normalized),
    ).length;

    const amountDueByCurrency = filteredPaymentIntents.reduce((totals, intent) => {
      const currency = intent.currency_normalized || "—";
      totals[currency] = numberFrom(totals[currency]) + numberFrom(intent.amount_due_normalized);
      return totals;
    }, {});

    return {
      total: filteredPaymentIntents.length,
      pending,
      fulfilled,
      amountDueByCurrency,
      source: "client_search",
    };
  }, [filteredPaymentIntents, isPaymentSearchActive, paymentIntentMeta]);

  const paymentPager = useMemo(() => {
    const total = Number(paymentIntentMeta?.total ?? paymentIntents.length);
    const limit = Number(paymentIntentMeta?.limit ?? paymentPageSize);
    const offset = Number(paymentIntentMeta?.offset ?? paymentOffset);
    const count = Number(paymentIntentMeta?.count ?? paymentIntents.length);
    const start = total > 0 ? offset + 1 : 0;
    const end = total > 0 ? Math.min(offset + count, total) : 0;

    return {
      total,
      limit,
      offset,
      count,
      start,
      end,
      canPrevious: offset > 0,
      canNext: Boolean(paymentIntentMeta?.hasMore),
    };
  }, [paymentIntentMeta, paymentIntents.length, paymentOffset, paymentPageSize]);

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

              {BILLING_NOTIFICATION_ROWS.map((item) => {
                const setting = notificationSettings?.[item.key] || {};
                const enabled = Boolean(setting.enabled);
                const implemented = setting.implemented !== false;
                const updating = actionLoading === `notificationSetting:${item.key}`;

                return (
                  <ToggleRow
                    key={item.key}
                    label={t(`adminBilling.${item.labelKey}`)}
                    description={t(`adminBilling.${item.descriptionKey}`)}
                    enabled={enabled}
                    updating={updating}
                    disabled={!implemented}
                    status={
                      updating
                        ? t("adminBilling.notificationSaving")
                        : implemented
                          ? t("adminBilling.notificationStatusLive")
                          : t("adminBilling.notificationStatusPlanned")
                    }
                    onToggle={() => handleNotificationToggle(item.key, !enabled)}
                    onLabel={t("adminBilling.notificationOn")}
                    offLabel={t("adminBilling.notificationOff")}
                  />
                );
              })}
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

              <div className="DfctBillingAdmin-statGrid">
                <AdminStat
                  label={t("adminBilling.paymentIntentStatsTotal")}
                  value={paymentStats.total}
                  caption={
                    isPaymentSearchActive
                      ? t("adminBilling.paymentIntentStatsSearchCaption")
                      : t("adminBilling.paymentIntentStatsTotalCaption")
                  }
                />
                <AdminStat
                  label={t("adminBilling.paymentIntentStatsPending")}
                  value={paymentStats.pending}
                  caption={
                    isPaymentSearchActive
                      ? t("adminBilling.paymentIntentStatsSearchCaption")
                      : t("adminBilling.paymentIntentStatsPendingCaption")
                  }
                />
                <AdminStat
                  label={t("adminBilling.paymentIntentStatsFulfilled")}
                  value={paymentStats.fulfilled}
                  caption={
                    isPaymentSearchActive
                      ? t("adminBilling.paymentIntentStatsSearchCaption")
                      : t("adminBilling.paymentIntentStatsFulfilledCaption")
                  }
                  tone="green"
                />
                <AdminStat
                  label={t("adminBilling.paymentIntentStatsAmountDue")}
                  value={<AmountByCurrencyValue totals={paymentStats.amountDueByCurrency} />}
                />
              </div>

              <div className="DfctBillingAdmin-paymentToolbar">
                <Form.Control
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder={t("adminBilling.paymentIntentSearchPlaceholder")}
                />

                <Form.Select
                  value={paymentStatusFilter}
                  onChange={(event) => {
                    setPaymentStatusFilter(event.target.value);
                    setPaymentOffset(0);
                  }}
                >
                  {PAYMENT_STATUS_FILTER_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {paymentStatusFilterLabel(t, status)}
                    </option>
                  ))}
                </Form.Select>

                <Form.Select
                  value={paymentPageSize}
                  onChange={(event) => {
                    setPaymentPageSize(Number(event.target.value));
                    setPaymentOffset(0);
                  }}
                >
                  {PAYMENT_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {t("adminBilling.paymentIntentPageSize", { count: size })}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="DfctBillingAdmin-paymentPager">
                <span>
                  {t("adminBilling.paymentIntentPageSummary", {
                    start: paymentPager.start,
                    end: paymentPager.end,
                    total: paymentPager.total,
                  })}
                </span>

                <div className="DfctBillingAdmin-paymentPagerActions">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={!paymentPager.canPrevious || actionLoading === "paymentIntents"}
                    onClick={() =>
                      setPaymentOffset((current) => Math.max(0, current - paymentPager.limit))
                    }
                  >
                    {t("adminBilling.paymentIntentPrevious")}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={!paymentPager.canNext || actionLoading === "paymentIntents"}
                    onClick={() => setPaymentOffset((current) => current + paymentPager.limit)}
                  >
                    {t("adminBilling.paymentIntentNext")}
                  </Button>
                </div>
              </div>

              <div className="DfctBillingAdmin-tableWrap DfctBillingAdmin-paymentTableWrap">
                <table className="DfctBillingAdmin-table">
                  <thead>
                    <tr>
                      <th>{t("adminBilling.colActions")}</th>
                      <th>{t("adminBilling.colId")}</th>
                      <th>{t("adminBilling.colUser")}</th>
                      <th>{t("adminBilling.colPackage")}</th>
                      <th>{t("adminBilling.colStatus")}</th>
                      <th>{t("adminBilling.colGateway")}</th>
                      <th>{t("adminBilling.colCredits")}</th>
                      <th>{t("adminBilling.colAmount")}</th>
                      <th>{t("adminBilling.colReference")}</th>
                      <th>{t("adminBilling.colTxHash")}</th>
                      <th>{t("adminBilling.colCreated")}</th>
                      <th>{t("adminBilling.colExpires")}</th>
                      <th>{t("adminBilling.colVerified")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPaymentIntents.length === 0 ? (
                      <tr>
                        <td colSpan={13}>
                          {paymentIntents.length === 0
                            ? t("adminBilling.noPaymentIntents")
                            : t("adminBilling.noPaymentIntentsFiltered")}
                        </td>
                      </tr>
                    ) : (
                      filteredPaymentIntents.map((intent) => {
                        const paymentIntentId = paymentIntentIdOf(intent);
                        const status = intent.status_normalized;
                        const canFulfill = intent.can_fulfill ?? intent.actions?.fulfill ?? paymentCanFulfill(intent);
                        const fulfillLoading =
                          actionLoading === `fulfillPaymentIntent:${paymentIntentId}`;

                        return (
                          <tr key={paymentIntentId || intent.external_reference}>
                            <td>
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
                                <span className="DfctBillingAdmin-muted">
                                  {t("adminBilling.intentNoAction")}
                                </span>
                              )}
                            </td>
                            <td>{paymentIntentId || "—"}</td>
                            <td>{intent.user_label}</td>
                            <td>{intent.package_label}</td>
                            <td>
                              <span className={`DfctBillingAdmin-statusPill is-${status}`}>
                                {intent.status || "pending"}
                              </span>
                            </td>
                            <td>{intent.gateway || "—"}</td>
                            <td>{formatCredits(intent.credits_normalized)} DFCT</td>
                            <td>
                              {intent.amount_due_normalized
                                ? `${formatCredits(intent.amount_due_normalized)} ${intent.currency_normalized}`
                                : "—"}
                            </td>
                            <td title={String(intent.reference_normalized || "")}>
                              {shorten(intent.reference_normalized)}
                            </td>
                            <td title={String(intent.tx_hash_normalized || "")}>
                              {shorten(intent.tx_hash_normalized)}
                            </td>
                            <td>{formatDate(intent.created_at)}</td>
                            <td>{formatDate(intent.expires_at)}</td>
                            <td>{formatDate(intent.verified_at)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
