import { useEffect, useRef, useState } from "react";
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
import { getApiErrorMessage, useAuthRequest } from "../hooks/useAuthRequest";
import {
  enableWalletForAction,
  getSessionWalletHandlers,
  getWalletInfo,
} from "../chains/cardano/walletUtils";
import { buildAdaPaymentTx } from "../chains/cardano/buildAdaPaymentTx";
import { signAndSubmitTx } from "../chains/cardano/signAndSubmitTx";
import {
  fetchCardanoPaymentQuote,
  submitCardanoPayment,
} from "../api/billingCredits";
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

function formatActivityStatus(tOrStatus, maybeStatus) {
  const hasTranslator = typeof tOrStatus === "function";
  const t = hasTranslator ? tOrStatus : null;
  const rawStatus = hasTranslator ? maybeStatus : tOrStatus;
  const value = String(rawStatus || "—").trim();

  if (!value || value === "—") return "—";

  const normalized = value.toLowerCase().replace(/[_\s-]+/g, "_");
  const fallback = value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  const statusKeyMap = {
    paid: "statusPaid",
    pending: "statusPending",
    expired: "statusExpired",
    canceled: "statusCanceled",
    cancelled: "statusCanceled",
    failed: "statusFailed",
    submitted: "statusSubmitted",
    confirmed: "statusConfirmed",
    fulfilled: "statusFulfilled",
    payment_fulfilled: "statusPaymentFulfilled",
    payment_submitted: "statusPaymentSubmitted",
    requires_payment: "statusRequiresPayment",
    verification_started: "statusVerificationStarted",
    verifying: "statusVerifying",
  };

  const i18nKey = statusKeyMap[normalized];

  return t && i18nKey ? t(`billingAccess.${i18nKey}`, fallback) : fallback;
}

function activityTimestamp(item) {
  const raw = item?.created_at || item?.createdAt || item?.updated_at || item?.updatedAt;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}


function ledgerEntryMetadata(entry) {
  return (
    entry?.metadata ||
    entry?.metadata_json ||
    entry?.entry_metadata ||
    entry?.ledger_metadata ||
    {}
  );
}

function ledgerDsmContext(entry) {
  const metadata = ledgerEntryMetadata(entry);
  const nested = metadata?.dsm || metadata?.dsm_context || {};
  return {
    schema: nested.schema || metadata.dsm_schema || "",
    machine: nested.machine || metadata.dsm_machine || "",
    action: nested.action || metadata.dsm_action || "",
    entityKind: nested.entity_kind || metadata.dsm_entity_kind || "",
    entityId: nested.entity_id || metadata.dsm_entity_id || "",
    topicId: nested.topic_id || metadata.dsm_topic_id || metadata.topic_id || "",
    lifecycleTaskId: nested.lifecycle_task_id || metadata.dsm_lifecycle_task_id || "",
    stateEventId: nested.state_event_id || metadata.dsm_state_event_id || "",
    source: nested.source || metadata.dsm_source || "",
  };
}

function normalizeActivityValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "_");
}

function humanizeActivityValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function dsmActionLabel(t, action) {
  const normalized = normalizeActivityValue(action);
  const keyMap = {
    submit_topic: "dsmActionSubmitTopic",
    review_topic: "dsmActionReviewTopic",
    reject_topic: "dsmActionRejectTopic",
  };
  const i18nKey = keyMap[normalized];
  return i18nKey
    ? t(`billingAccess.${i18nKey}`, humanizeActivityValue(action))
    : humanizeActivityValue(action);
}

function ledgerDsmDetailRows(t, entry) {
  const dsm = ledgerDsmContext(entry);
  const hasDsmContext = Boolean(
    dsm.machine ||
      dsm.action ||
      dsm.entityKind ||
      dsm.entityId ||
      dsm.topicId ||
      dsm.lifecycleTaskId ||
      dsm.stateEventId ||
      dsm.source,
  );

  if (!hasDsmContext) return [];

  const entityId = dsm.topicId || dsm.entityId;
  const entity = [humanizeActivityValue(dsm.entityKind), entityId ? `#${entityId}` : ""]
    .filter(Boolean)
    .join(" ");

  return [
    [t("billingAccess.transactionDetailsDsmMachine"), dsm.machine || "—"],
    [t("billingAccess.transactionDetailsDsmAction"), dsmActionLabel(t, dsm.action)],
    entity ? [t("billingAccess.transactionDetailsDsmEntity"), entity] : null,
    dsm.source ? [t("billingAccess.transactionDetailsDsmSource"), humanizeActivityValue(dsm.source)] : null,
    dsm.lifecycleTaskId
      ? [t("billingAccess.transactionDetailsLifecycleTask"), dsm.lifecycleTaskId]
      : null,
    dsm.stateEventId
      ? [t("billingAccess.transactionDetailsStateEvent"), dsm.stateEventId]
      : null,
  ].filter(Boolean);
}

function ledgerActivityType(entry) {
  return normalizeActivityValue(entry?.reason || entry?.source_type || "");
}

function ledgerActivityTopicId(entry) {
  const dsm = ledgerDsmContext(entry);
  const metadata = ledgerEntryMetadata(entry);
  return dsm.topicId || dsm.entityId || metadata.topicId || metadata.topic_id || "";
}

function ledgerActivityContext(t, entry) {
  const type = ledgerActivityType(entry);
  const metadata = ledgerEntryMetadata(entry);
  const topicId = ledgerActivityTopicId(entry);

  if (topicId) {
    return t("billingAccess.activityContextTopic", { topicId });
  }

  const anchorJobId =
    metadata.anchorJobId ||
    metadata.anchor_job_id ||
    (type.startsWith("cardano_anchor") ? entry?.source_id : "");
  if (anchorJobId) {
    return t("billingAccess.activityContextAnchorJob", { anchorJobId });
  }

  const rewardPoolId = metadata.rewardPoolId || metadata.reward_pool_id;
  if (rewardPoolId) {
    return t("billingAccess.activityContextRewardPool", { rewardPoolId });
  }

  return entry?.source_id
    ? t("billingAccess.activityContextReference", { reference: entry.source_id })
    : "—";
}

function ledgerFinancialDetailRows(t, entry) {
  const metadata = ledgerEntryMetadata(entry);
  const rows = [
    entry?.reason
      ? [t("billingAccess.transactionDetailsReason"), humanizeActivityValue(entry.reason)]
      : null,
    entry?.source_type
      ? [t("billingAccess.transactionDetailsSourceType"), humanizeActivityValue(entry.source_type)]
      : null,
    entry?.source_id
      ? [t("billingAccess.transactionDetailsSourceId"), entry.source_id]
      : null,
    entry?.idempotency_key
      ? [t("billingAccess.transactionDetailsIdempotencyKey"), entry.idempotency_key]
      : null,
    (metadata.settlementId || metadata.settlement_id)
      ? [
          t("billingAccess.transactionDetailsSettlementId"),
          metadata.settlementId || metadata.settlement_id,
        ]
      : null,
    (metadata.anchorJobId || metadata.anchor_job_id)
      ? [
          t("billingAccess.transactionDetailsAnchorJobId"),
          metadata.anchorJobId || metadata.anchor_job_id,
        ]
      : null,
  ];

  return rows.filter(Boolean);
}

function ledgerActivityLabel(t, entry) {
  const dsm = ledgerDsmContext(entry);
  const dsmAction = normalizeActivityValue(dsm.action);
  const dsmEntityKind = normalizeActivityValue(dsm.entityKind);
  if (dsmEntityKind === "topic" && dsmAction === "submit_topic") {
    const topicId = ledgerActivityTopicId(entry);
    return topicId
      ? t("billingAccess.activityTopicPublicationWithId", { topicId })
      : t("billingAccess.activityTopicPublication");
  }

  const type = ledgerActivityType(entry);
  const topicId = ledgerActivityTopicId(entry);

  if (type.includes("topic_publication")) {
    return topicId
      ? t("billingAccess.activityTopicPublicationWithId", { topicId })
      : t("billingAccess.activityTopicPublication");
  }
  if (type === "cardano_anchor") {
    return t("billingAccess.activityCardanoAnchor");
  }
  if (type === "cardano_anchor_refund") {
    return t("billingAccess.activityCardanoAnchorRefund");
  }
  if (["reward_pool_reserve", "reward_pool_fund", "reward_pool_funded"].includes(type)) {
    return t("billingAccess.activityRewardPoolFunded");
  }
  if (["reward_pool_award", "reward_award", "reward_earned"].includes(type)) {
    return t("billingAccess.activityRewardEarned");
  }
  if (["reward_pool_release", "reward_pool_return", "reward_return"].includes(type)) {
    return t("billingAccess.activityRewardReturned");
  }
  if (["subscription_allocation", "plan_credit_allocation"].includes(type)) {
    return t("billingAccess.activitySubscriptionAllocation");
  }
  if (["credits_expired", "subscription_credits_expired"].includes(type)) {
    return t("billingAccess.activityCreditsExpired");
  }
  if (type.includes("payment_fulfilled")) {
    return t("billingAccess.activityPaymentFulfilled");
  }
  if (type.includes("manual_grant") || Number(entry?.amount) > 0) {
    return t("billingAccess.activityCreditGrant");
  }
  return entry?.reason || entry?.source_type || t("billingAccess.activityLedgerEntry");
}

function ledgerActivityStatus(t, entry) {
  const dsm = ledgerDsmContext(entry);
  const dsmAction = normalizeActivityValue(dsm.action);
  if (dsmAction === "submit_topic") {
    return t("billingAccess.activityServiceDebit");
  }

  const type = ledgerActivityType(entry);
  if (type.includes("topic_publication") || type === "cardano_anchor") {
    return t("billingAccess.activityServiceDebit");
  }
  if (type === "cardano_anchor_refund") {
    return t("billingAccess.activityRefund");
  }
  if (["reward_pool_reserve", "reward_pool_fund", "reward_pool_funded"].includes(type)) {
    return t("billingAccess.activityReserved");
  }
  if (["reward_pool_award", "reward_award", "reward_earned"].includes(type)) {
    return t("billingAccess.activityReward");
  }
  if (["reward_pool_release", "reward_pool_return", "reward_return"].includes(type)) {
    return t("billingAccess.activityReturned");
  }
  if (type.includes("payment_fulfilled")) {
    return t("billingAccess.activityPaymentFulfilled");
  }
  if (type.includes("manual_grant") || Number(entry?.amount) > 0) {
    return t("billingAccess.activityCreditGrant");
  }
  return formatActivityStatus(t, entry?.reason || entry?.source_type);
}


function paymentIntentCardanoMetadata(intent) {
  const metadata = intent?.intent_metadata || intent?.metadata || intent?.metadata_json || {};
  return metadata?.cardano_payment || metadata?.cardanoPayment || {};
}

function paymentIntentTxHash(intent) {
  const cardano = paymentIntentCardanoMetadata(intent);

  return (
    intent?.tx_hash ||
    intent?.txHash ||
    intent?.transaction_hash ||
    intent?.transactionHash ||
    intent?.metadata?.tx_hash ||
    intent?.metadata?.txHash ||
    intent?.intent_metadata?.tx_hash ||
    cardano?.tx_hash ||
    cardano?.txHash ||
    ""
  );
}


function cardanoExplorerUrl(network, txHash) {
  if (!txHash) return "";

  const normalizedNetwork = String(network || "preview").toLowerCase();

  if (normalizedNetwork === "mainnet" || normalizedNetwork === "main") {
    return `https://cardanoscan.io/transaction/${txHash}`;
  }

  if (normalizedNetwork === "preprod") {
    return `https://preprod.cardanoscan.io/transaction/${txHash}`;
  }

  return `https://preview.cardanoscan.io/transaction/${txHash}`;
}

function shortTxHash(txHash) {
  if (!txHash) return "—";

  const value = String(txHash);
  if (value.length <= 24) return value;

  return `${value.slice(0, 14)}…${value.slice(-10)}`;
}

function billingActivityPaymentIntent(activity) {
  if (activity?.sourceType === "payment_intent") return activity.source || null;
  return activity?.relatedPaymentIntent || null;
}

function billingActivityLedgerEntry(activity) {
  if (activity?.sourceType === "ledger") return activity.source || null;
  return null;
}

function BillingActivityDetailsModal({ t, activity, onHide }) {
  const [copied, setCopied] = useState(false);

  if (!activity) return null;

  const intent = billingActivityPaymentIntent(activity);
  const ledgerEntry = billingActivityLedgerEntry(activity);
  const dsmRows = ledgerEntry ? ledgerDsmDetailRows(t, ledgerEntry) : [];
  const financialRows = ledgerEntry ? ledgerFinancialDetailRows(t, ledgerEntry) : [];
  const cardano = paymentIntentCardanoMetadata(intent);
  const txHash = paymentIntentTxHash(intent);
  const network = cardano?.network || "";
  const explorerUrl = cardanoExplorerUrl(network, txHash);

  const copyHash = async () => {
    if (!txHash || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const overviewRows = [
    [t("billingAccess.transactionDetailsCreated"), formatIntentDate(activity.createdAt)],
    intent ? [t("billingAccess.transactionDetailsPaymentIntentId"), paymentIntentId(intent)] : null,
    ledgerEntry?.ledger_entry_id
      ? [t("billingAccess.transactionDetailsLedgerEntryId"), ledgerEntry.ledger_entry_id]
      : null,
    activity.context && activity.context !== "—"
      ? [t("billingAccess.transactionDetailsContext"), activity.context]
      : null,
    ...financialRows,
    ...dsmRows,
  ].filter(Boolean);

  const cardanoRows = intent
    ? [
        [t("billingAccess.transactionDetailsGateway"), intent.gateway || "cardano"],
        [t("billingAccess.transactionDetailsNetwork"), network || "—"],
        [t("billingAccess.transactionDetailsAdaAmount"), cardano?.amount_ada ? `${cardano.amount_ada} ADA` : "—"],
        [t("billingAccess.transactionDetailsReference"), cardano?.external_reference || "—"],
        [t("billingAccess.transactionDetailsQuote"), cardano?.quote_rate_source || cardano?.pricing_provider || "—"],
      ]
    : [];

  return (
    <Modal
      show
      scrollable
      size="lg"
      onHide={onHide}
      className="BillingTransactionModal"
      backdropClassName="BillingPaymentModal-backdrop"
      contentClassName="BillingTransactionModal-content"
    >
      <Modal.Header>
        <div>
          <span className="BillingTransactionModal-eyebrow">
            {t("billingAccess.transactionDetailsEyebrow")}
          </span>
          <Modal.Title>{t("billingAccess.transactionDetailsTitle")}</Modal.Title>
          <p>{t("billingAccess.transactionDetailsSubtitle")}</p>
        </div>

        <button
          type="button"
          className="BillingPaymentModalProduct-close"
          aria-label={t("billingAccess.transactionDetailsClose")}
          onClick={onHide}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body>
        <section className="BillingTransactionModal-summary">
          <div>
            <span>{t("billingAccess.transactionDetailsActivity")}</span>
            <strong>{activity.kind}</strong>
          </div>
          <div>
            <span>{t("billingAccess.transactionDetailsStatus")}</span>
            <strong>{activity.status}</strong>
          </div>
          <div>
            <span>{t("billingAccess.transactionDetailsAmount")}</span>
            <strong>{activity.amount}</strong>
          </div>
        </section>

        <section className="BillingTransactionModal-section">
          <h4>{t("billingAccess.transactionDetailsOverview")}</h4>
          <div className="BillingTransactionModal-grid">
            {overviewRows.map(([label, value]) => (
              <div className="BillingTransactionModal-field" key={label}>
                <span>{label}</span>
                <strong>{value || "—"}</strong>
              </div>
            ))}
          </div>
        </section>

        {intent ? (
          <section className="BillingTransactionModal-section">
            <h4>{t("billingAccess.transactionDetailsCardano")}</h4>

            <div className="BillingTransactionModal-grid">
              {cardanoRows.map(([label, value]) => (
                <div className="BillingTransactionModal-field" key={label}>
                  <span>{label}</span>
                  <strong>{value || "—"}</strong>
                </div>
              ))}
            </div>

            {txHash ? (
              <div className="BillingTransactionModal-hashBox">
                <span>{t("billingAccess.transactionDetailsTxHash")}</span>
                <code title={txHash}>{shortTxHash(txHash)}</code>

                <div className="BillingTransactionModal-actions">
                  <button type="button" onClick={copyHash}>
                    {copied
                      ? t("billingAccess.transactionDetailsCopied")
                      : t("billingAccess.transactionDetailsCopy")}
                  </button>

                  <a href={explorerUrl} target="_blank" rel="noreferrer">
                    {t("billingAccess.transactionDetailsOpenExplorer")}
                  </a>
                </div>
              </div>
            ) : (
              <div className="BillingTransactionModal-empty">
                {t("billingAccess.transactionDetailsNoExplorer")}
              </div>
            )}
          </section>
        ) : null}
      </Modal.Body>
    </Modal>
  );
}

function shouldShowPaymentIntentInActivity(intent) {
  const status = String(intent?.status || "").toLowerCase();
  const txHash = paymentIntentTxHash(intent);

  // A pending Cardano payment with no tx hash is only a quote/request draft.
  // It should not appear in the main activity feed.
  if (status === "pending" && !txHash) return false;

  // Expired quote-only requests are useful for admin/debug history,
  // but they are not user-facing billing activity.
  if (status === "expired" && !txHash) return false;

  return true;
}

function buildBillingActivity({ t, language, paymentIntents = [], ledgerEntries = [] }) {
  const visiblePaymentIntents = paymentIntents.filter(shouldShowPaymentIntentInActivity);
  const paymentIntentById = new Map(
    visiblePaymentIntents.map((intent) => [String(paymentIntentId(intent)), intent])
  );

  const paymentRows = visiblePaymentIntents.map((intent) => ({
    id: `intent:${intent.payment_intent_id || intent.id || intent.created_at}`,
    sourceType: "payment_intent",
    source: intent,
    kind: intent.package?.name || intent.package_name || intent.gateway || t("billingAccess.activityPaymentRequest"),
    context: t("billingAccess.activityContextCreditPurchase"),
    status: formatActivityStatus(t, intent.status),
    amount: formatPaymentAmount(intent, language),
    createdAt: intent.created_at,
    timestamp: activityTimestamp(intent),
  }));

  const ledgerRows = ledgerEntries.map((entry) => {
    const sourceType = String(entry?.source_type || "").toLowerCase();
    const relatedPaymentIntent =
      sourceType === "billing_payment_intent"
        ? paymentIntentById.get(String(entry?.source_id))
        : null;

    return {
      id: `ledger:${entry.ledger_entry_id || entry.id || entry.created_at}`,
      sourceType: "ledger",
      source: entry,
      relatedPaymentIntent,
      kind: ledgerActivityLabel(t, entry),
      context: ledgerActivityContext(t, entry),
      status: ledgerActivityStatus(t, entry),
      amount: formatCreditAmount(entry.amount),
      createdAt: entry.created_at,
      timestamp: activityTimestamp(entry),
    };
  });

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

function describeCheckoutError(err, fallback, step = "", t = null) {
  const body = err?.response?.body || {};
  const isQuoteExpired =
    body.code === "quote_expired" ||
    body.error === "quoteExpired";

  if (isQuoteExpired && typeof t === "function") {
    const detail = t("billingAccess.paymentModalQuoteExpiredSubmitError");
    return step ? `${step}: ${detail}` : detail;
  }

  const detail =
    body.message ||
    body.error ||
    body.detail ||
    err?.response?.text ||
    err?.message ||
    fallback;

  return step ? `${step}: ${detail}` : detail;
}


function parseCheckoutNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = typeof value === "string"
    ? value.replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCheckoutNumber(value, language, options = {}) {
  const parsed = parseCheckoutNumber(value);
  if (parsed === null) return "";

  return new Intl.NumberFormat(language || undefined, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(parsed);
}

function formatCheckoutFiat(value, language) {
  return formatCheckoutNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCheckoutAda(value, language) {
  return formatCheckoutNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatCheckoutRate(value, language) {
  return formatCheckoutNumber(value, language, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatCheckoutCurrencyLabel(currency) {
  const normalized = String(currency || "").trim().toUpperCase();
  if (normalized === "ADA" || normalized === "LOVELACE") return "₳DA";
  return normalized || "—";
}

function parseCheckoutDate(value) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCheckoutQuoteExpired(cardanoQuote, nowMs = Date.now()) {
  if (!cardanoQuote) return false;
  if (cardanoQuote.quote_expired === true) return true;

  const expiresAt = parseCheckoutDate(cardanoQuote.quote_expires_at);
  if (!expiresAt) return false;

  return nowMs >= expiresAt.getTime();
}

function formatCheckoutDateTime(value, language) {
  const parsed = parseCheckoutDate(value);
  if (!parsed) return "";

  return new Intl.DateTimeFormat(language || undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function PaymentRequestModal({
  show,
  onHide,
  t,
  language = "en",
  selectedPackage,
  selectedPaymentIntent,
  cardanoQuote,
  walletSummaries = [],
  selectedWallet,
  updateSelectedWallet,
  isLoadingWallet = false,
  checkoutLoading = false,
  checkoutError = "",
  checkoutSuccess = "",
  checkoutStage = "",
  quoteRefreshing = false,
  onRefreshCardanoQuote,
  onPayCardano,
}) {
  const packageName =
    selectedPackage?.name ||
    selectedPaymentIntent?.package_name ||
    selectedPaymentIntent?.package?.name ||
    t("billingAccess.paymentModalDefaultPackage");

  const credits = paymentCredits(selectedPaymentIntent, selectedPackage);
  const displayCurrency = cardanoQuote?.display_currency || selectedPaymentIntent?.currency_code || "USD";
  const displayAmount = cardanoQuote?.display_amount || selectedPaymentIntent?.amount_due;
  const displayCurrencyLabel = formatCheckoutCurrencyLabel(displayCurrency);
  const formattedDisplayAmount = formatCheckoutFiat(displayAmount, language);
  const formattedCardanoAmount = formatCheckoutAda(cardanoQuote?.amount_ada, language);
  const cardanoCurrencyLabel = formatCheckoutCurrencyLabel(cardanoQuote?.asset_label || "ADA");
  const marketRate = formatCheckoutRate(cardanoQuote?.market_price, language);
  const marketRateCurrency = formatCheckoutCurrencyLabel(
    String(displayCurrency || "").toUpperCase() === "USD" &&
      String(cardanoQuote?.market_quote_asset || "").toUpperCase() === "USDT"
      ? "USD"
      : cardanoQuote?.market_quote_asset || displayCurrency,
  );
  const equivalentText = formattedDisplayAmount
    ? marketRate
      ? t("billingAccess.paymentModalEquivalentPriceWithRate", {
          amount: formattedDisplayAmount,
          currency: displayCurrencyLabel,
          rate: marketRate,
          rateCurrency: marketRateCurrency,
        })
      : t("billingAccess.paymentModalEquivalentPrice", {
          amount: formattedDisplayAmount,
          currency: displayCurrencyLabel,
        })
    : "";
  const checkoutSuccessRef = useRef(null);
  const autoRefreshQuoteKeyRef = useRef("");
  const [quoteClockMs, setQuoteClockMs] = useState(() => Date.now());

  const quoteExpired = isCheckoutQuoteExpired(cardanoQuote, quoteClockMs);
  const formattedQuoteExpiry = formatCheckoutDateTime(cardanoQuote?.quote_expires_at, language);
  const quoteExpiryText = cardanoQuote?.quote_expires_at
    ? quoteRefreshing
      ? t("billingAccess.paymentModalQuoteRefreshing")
      : quoteExpired
        ? t("billingAccess.paymentModalQuoteExpired")
        : t("billingAccess.paymentModalQuoteExpiresAt", {
            date: formattedQuoteExpiry,
          })
    : "";
  const quoteStatusExpired = quoteExpired && !quoteRefreshing;

  useEffect(() => {
    if (!cardanoQuote?.quote_expires_at) return undefined;

    setQuoteClockMs(Date.now());

    const intervalId = window.setInterval(() => {
      setQuoteClockMs(Date.now());
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [cardanoQuote?.quote_expires_at]);

  useEffect(() => {
    if (!quoteExpired || quoteRefreshing) return undefined;
    if (typeof onRefreshCardanoQuote !== "function") return undefined;

    const quoteKey = [
      cardanoQuote?.payment_intent_id || selectedPaymentIntent?.payment_intent_id || selectedPaymentIntent?.id,
      cardanoQuote?.quote_expires_at,
    ].filter(Boolean).join(":");

    if (!quoteKey || autoRefreshQuoteKeyRef.current === quoteKey) return undefined;

    autoRefreshQuoteKeyRef.current = quoteKey;

    const timeoutId = window.setTimeout(() => {
      onRefreshCardanoQuote({ reason: "expired" });
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [
    cardanoQuote?.payment_intent_id,
    cardanoQuote?.quote_expires_at,
    onRefreshCardanoQuote,
    quoteExpired,
    quoteRefreshing,
    selectedPaymentIntent?.id,
    selectedPaymentIntent?.payment_intent_id,
  ]);

  useEffect(() => {
    if (!checkoutSuccess) return undefined;

    const timeoutId = window.setTimeout(() => {
      checkoutSuccessRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [checkoutSuccess]);

  const selectedWalletObject =
    typeof selectedWallet === "string"
      ? walletSummaries.find((wallet) => wallet.name === selectedWallet) || null
      : selectedWallet;

  const effectiveSelectedWallet =
    selectedWalletObject ||
    walletSummaries.find((wallet) => wallet.enabled || wallet.isLoginWallet) ||
    walletSummaries[0] ||
    null;

  const selectedWalletLabel =
    effectiveSelectedWallet?.displayName ||
    effectiveSelectedWallet?.label ||
    effectiveSelectedWallet?.name ||
    t("billingAccess.paymentModalNoWalletSelected");

  const canPay = Boolean(
    cardanoQuote?.payment_address &&
    cardanoQuote?.amount_lovelace &&
    effectiveSelectedWallet?.name &&
    !checkoutLoading &&
    !quoteRefreshing &&
    !quoteExpired,
  );

  const shortNetwork =
    cardanoQuote?.network === "preview"
      ? t("billingAccess.paymentModalNetworkPreview")
      : cardanoQuote?.network === "preprod"
        ? t("billingAccess.paymentModalNetworkPreprod")
        : cardanoQuote?.network === "mainnet"
          ? t("billingAccess.paymentModalNetworkMainnet")
          : cardanoQuote?.network || "Cardano";

  const handleWalletSelect = (wallet) => {
    if (!wallet || typeof updateSelectedWallet !== "function") return;
    updateSelectedWallet(wallet);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      scrollable
      className="BillingPaymentModal BillingPaymentModalProduct"
      backdropClassName="BillingPaymentModal-backdrop"
      contentClassName="BillingPaymentModal-content"
    >
      <Modal.Header>
        <div className="BillingPaymentModalProduct-header">
          <span className="BillingPaymentModalProduct-eyebrow">
            {t("billingAccess.paymentModalHeroEyebrow")}
          </span>
          <Modal.Title>{t("billingAccess.paymentModalTitle")}</Modal.Title>
        </div>
        <button
          type="button"
          className="BillingPaymentModalProduct-close"
          aria-label={t("billingAccess.paymentModalClose")}
          onClick={onHide}
          disabled={checkoutLoading}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body>
        <section className="BillingPaymentModalProduct-hero">
          <div>
            <span className="BillingPaymentModalProduct-pill">
              {t("billingAccess.paymentModalInstantTopUp")}
            </span>
            <h3>
              {t("billingAccess.paymentModalProductTitle", {
                credits,
                packageName,
              })}
            </h3>
            <p>{t("billingAccess.paymentModalProductSubtitle")}</p>
          </div>

          <div className="BillingPaymentModalProduct-amountCard">
            <span>{t("billingAccess.paymentModalPayToday")}</span>
            {formattedCardanoAmount ? (
              <>
                <strong className="BillingPaymentModalProduct-adaAmount">
                  <span>{formattedCardanoAmount}</span>
                  <span className="BillingPaymentModalProduct-adaCurrency">
                    {cardanoCurrencyLabel}
                  </span>
                </strong>
                {equivalentText ? (
                  <small className="BillingPaymentModalProduct-rateLine">
                    {equivalentText}
                  </small>
                ) : null}
              </>
            ) : (
              <div
                className="BillingPaymentModalProduct-quoteLoader"
                role="status"
                aria-live="polite"
              >
                <span>{t("billingAccess.paymentModalQuotePendingShort")}</span>
                <span className="BillingPaymentModalProduct-quoteDots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="BillingPaymentModalProduct-trustStrip">
          <span>{t("billingAccess.paymentModalTrustWallet")}</span>
          <span>{t("billingAccess.paymentModalTrustVerification")}</span>
          <span>{shortNetwork}</span>
          {quoteExpiryText ? (
            <span className={quoteStatusExpired ? "is-expired" : undefined}>
              {quoteExpiryText}
            </span>
          ) : null}
        </section>

        <section className="BillingPaymentModalProduct-journey">
          <h4>{t("billingAccess.paymentModalJourneyTitle")}</h4>
          <div className="BillingPaymentModalProduct-steps">
            <div>
              <strong>1</strong>
              <span>{t("billingAccess.paymentModalStepReviewTitle")}</span>
              <p>{t("billingAccess.paymentModalStepReviewText")}</p>
            </div>
            <div>
              <strong>2</strong>
              <span>{t("billingAccess.paymentModalStepWalletTitle")}</span>
              <p>{t("billingAccess.paymentModalStepWalletText")}</p>
            </div>
            <div>
              <strong>3</strong>
              <span>{t("billingAccess.paymentModalStepCreditsTitle")}</span>
              <p>{t("billingAccess.paymentModalStepCreditsText")}</p>
            </div>
          </div>
        </section>

        <section className="BillingPaymentModalProduct-wallet">
          <div className="BillingPaymentModalProduct-sectionHeader">
            <div>
              <h4>{t("billingAccess.paymentModalChooseWalletTitle")}</h4>
              <p>{t("billingAccess.paymentModalChooseWalletSubtitle")}</p>
            </div>
            <span>
              {t("billingAccess.paymentModalSelectedWallet", {
                wallet: selectedWalletLabel,
              })}
            </span>
          </div>

          {isLoadingWallet ? (
            <div className="BillingPaymentModal-walletEmpty">
              {t("billingAccess.paymentModalWalletLoading")}
            </div>
          ) : walletSummaries.length ? (
            <div className="BillingPaymentModalProduct-walletList">
              {walletSummaries.map((wallet) => {
                const walletName = wallet.name;
                const walletLabel =
                  wallet.displayName ||
                  wallet.label ||
                  wallet.name ||
                  t("billingAccess.paymentModalWallet");
                const isSelected = walletName === effectiveSelectedWallet?.name;
                const statusLabel = wallet.isLoginWallet
                  ? t("billingAccess.paymentModalWalletLastUsed")
                  : wallet.enabled
                    ? t("billingAccess.paymentModalWalletConnected")
                    : t("billingAccess.paymentModalWalletDetected");

                return (
                  <button
                    type="button"
                    key={walletName || walletLabel}
                    className={`BillingPaymentModalProduct-walletOption ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleWalletSelect(wallet)}
                  >
                    {wallet.icon ? (
                      <img src={wallet.icon} alt="" aria-hidden="true" />
                    ) : (
                      <span className="BillingPaymentModalProduct-walletFallback">
                        {String(walletLabel).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <strong>{walletLabel}</strong>
                      <small>{statusLabel}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="BillingPaymentModal-walletEmpty">
              {t("billingAccess.paymentModalNoWallets")}
            </div>
          )}
        </section>

        {quoteRefreshing ? (
          <div className="BillingPaymentModal-alert is-info">
            {t("billingAccess.paymentModalQuoteRefreshingAction")}
          </div>
        ) : quoteExpired ? (
          <div className="BillingPaymentModal-alert is-error">
            {t("billingAccess.paymentModalQuoteExpiredAction")}
          </div>
        ) : null}

        {checkoutStage ? (
          <div className="BillingPaymentModal-alert is-info">{checkoutStage}</div>
        ) : null}

        {checkoutError ? (
          <div className="BillingPaymentModal-alert is-error">{checkoutError}</div>
        ) : null}

        {checkoutSuccess ? (
          <div ref={checkoutSuccessRef} className="BillingPaymentModal-alert is-success">
            {checkoutSuccess}
          </div>
        ) : null}

        <details className="BillingPaymentModalProduct-details">
          <summary>{t("billingAccess.paymentModalAdvancedDetails")}</summary>
          <div className="BillingPaymentModalProduct-detailsGrid">
            <div>
              <span>{t("billingAccess.paymentModalNetwork")}</span>
              <code>{shortNetwork}</code>
            </div>
            <div>
              <span>{t("billingAccess.paymentModalRequestReference")}</span>
              <code>{cardanoQuote?.external_reference || selectedPaymentIntent?.external_reference || "—"}</code>
            </div>
            <div className="is-wide">
              <span>{t("billingAccess.paymentModalTreasuryAddress")}</span>
              <code>{cardanoQuote?.payment_address || "—"}</code>
            </div>
          </div>
        </details>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="BillingPaymentModalProduct-secondary"
          onClick={onHide}
          disabled={checkoutLoading}
        >
          {t("common.close", t("billingAccess.paymentModalClose"))}
        </button>
        <button
          type="button"
          className="BillingPaymentModalProduct-primary"
          onClick={() => onPayCardano?.(effectiveSelectedWallet)}
          disabled={!canPay}
        >
          {quoteRefreshing
            ? t("billingAccess.paymentModalPrimaryCtaRefreshingQuote")
            : quoteExpired
              ? t("billingAccess.paymentModalPrimaryCtaExpired")
              : checkoutLoading
                ? t("billingAccess.paymentModalPrimaryCtaLoading")
                : t("billingAccess.paymentModalPrimaryCta")}
        </button>
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
    refresh,
  } = useBillingCredits(user);

  const { authRequest } = useAuthRequest(user);
  const {
    walletSummaries,
    selectedWallet,
    updateSelectedWallet,
    isLoadingWallet,
  } = getSessionWalletHandlers(user);

  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState(null);
  const [selectedPaymentPackage, setSelectedPaymentPackage] = useState(null);
  const [cardanoQuote, setCardanoQuote] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [checkoutStage, setCheckoutStage] = useState("");
  const [selectedBillingActivity, setSelectedBillingActivity] = useState(null);

  const closePaymentModal = () => {
    setSelectedPaymentIntent(null);
    setSelectedPaymentPackage(null);
    setCardanoQuote(null);
    setCheckoutLoading(false);
    setQuoteRefreshing(false);
    setCheckoutError("");
    setCheckoutSuccess("");
    setCheckoutStage("");
  };

  const scrollBillingActivityIntoView = () => {
    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      document
        .querySelector("#billing-activity")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
    setCardanoQuote(null);
    setCheckoutError("");
    setCheckoutSuccess("");
    setCheckoutStage("");

    try {
      const intent = await purchasePackage(pkg, {
        preferredCurrency: preferredCurrencyForLanguage(i18n.language),
      });

      setSelectedPaymentIntent(intent);
      setSelectedPaymentPackage(pkg);

      if (intent?.payment_intent_id || intent?.id) {
        try {
          const quotePayload = await fetchCardanoPaymentQuote(
            authRequest,
            intent.payment_intent_id || intent.id,
          );
          setCardanoQuote(quotePayload?.cardano_quote || null);
          setSelectedPaymentIntent(quotePayload?.payment_intent || intent);
        } catch (quoteErr) {
          setCheckoutError(
            getApiErrorMessage(
              quoteErr,
              t("billingAccess.paymentModalQuoteFailed"),
            ),
          );
        }
      }

      // Keep successful payment-intent creation silent.
      // Opening the Cardano checkout modal is the user-facing state here.
    } catch (err) {
      setPurchaseNotice({
        variant: "secondary",
        message: t("billingAccess.purchaseIntentFailed"),
      });
    }
  };

  const refreshCardanoQuote = async () => {
    const intentId = paymentIntentId(selectedPaymentIntent);

    if (!authRequest || !intentId || intentId === "—") return null;

    setQuoteRefreshing(true);
    setCheckoutError("");
    setCheckoutStage(t("billingAccess.paymentModalQuoteRefreshing"));

    try {
      const payload = await fetchCardanoPaymentQuote(authRequest, intentId);
      const nextQuote = payload?.cardano_quote || payload?.quote || null;
      const nextIntent = payload?.payment_intent || payload?.intent || null;

      if (nextQuote) {
        setCardanoQuote(nextQuote);
      }

      if (nextIntent) {
        setSelectedPaymentIntent(nextIntent);
      }

      setCheckoutStage("");
      return nextQuote;
    } catch (err) {
      setCheckoutError(
        describeCheckoutError(
          err,
          t("billingAccess.paymentModalQuoteRefreshFailed"),
          "",
          t,
        ),
      );
      setCheckoutStage("");
      return null;
    } finally {
      setQuoteRefreshing(false);
    }
  };

  const handleCardanoPayment = async (walletOverride = null) => {
    if (!selectedPaymentIntent) return;

    const checkoutWallet = walletOverride?.name ? walletOverride : selectedWallet;
    const intentId = selectedPaymentIntent.payment_intent_id || selectedPaymentIntent.id;

    if (!intentId) {
      setCheckoutError(t("billingAccess.paymentModalMissingIntent"));
      return;
    }

    if (!checkoutWallet?.name) {
      setCheckoutError(t("billingAccess.paymentModalSelectWallet"));
      return;
    }

    let checkoutStep = "";

    const setStep = (key) => {
      checkoutStep = t(key);
      setCheckoutStage(checkoutStep);
    };

    setCheckoutLoading(true);
    setCheckoutError("");
    setCheckoutSuccess("");
    setCheckoutStage("");

    try {
      let quote = cardanoQuote;

      if (!quote) {
        setStep("billingAccess.paymentModalStepQuote");
        const quotePayload = await fetchCardanoPaymentQuote(authRequest, intentId);
        quote = quotePayload?.cardano_quote;
        setCardanoQuote(quote || null);
        setSelectedPaymentIntent(quotePayload?.payment_intent || selectedPaymentIntent);
      }

      if (!quote?.payment_address || !quote?.amount_lovelace) {
        throw new Error(t("billingAccess.paymentModalInvalidQuote"));
      }

      setStep("billingAccess.paymentModalStepWallet");
      const walletApi = await enableWalletForAction(checkoutWallet.name);
      const walletInfo = await getWalletInfo(checkoutWallet.name, walletApi);

      setStep("billingAccess.paymentModalStepBuildTx");
      const tx = await buildAdaPaymentTx({
        walletApi,
        paymentAddress: quote.payment_address,
        amountLovelace: quote.amount_lovelace,
        metadata: {
          dfct: {
            type: "credit_package_payment",
            payment_intent_id: quote.payment_intent_id || intentId,
            external_reference: quote.external_reference,
            display_amount: quote.display_amount,
            display_currency: quote.display_currency,
            credits_amount: quote.credits_amount,
          },
        },
      });

      setStep("billingAccess.paymentModalStepSubmitChain");
      const txHash = await signAndSubmitTx(tx, walletApi);

      setStep("billingAccess.paymentModalStepSubmitBackend");
      const payload = await submitCardanoPayment(authRequest, intentId, {
        tx_hash: txHash,
        wallet_address: walletInfo?.address,
        wallet_name: checkoutWallet.name,
        metadata: {
          external_reference: quote.external_reference,
          network: quote.network,
        },
      });

      setSelectedPaymentIntent(payload?.payment_intent || selectedPaymentIntent);

      const verificationStatus =
        payload?.verification?.status ||
        payload?.payment_intent?.metadata?.cardano_payment?.verification_status ||
        payload?.payment_intent?.intent_metadata?.cardano_payment?.verification_status;

      const isPendingVerification = verificationStatus === "pending_verification";

      setCheckoutSuccess(
        t(
          isPendingVerification
            ? "billingAccess.paymentModalVerificationStarted"
            : "billingAccess.paymentModalCheckoutSuccess",
          { txHash },
        ),
      );
      setPurchaseNotice({
        variant: "success",
        message: t(
          isPendingVerification
            ? "billingAccess.cardanoPaymentVerificationStarted"
            : "billingAccess.cardanoPaymentSubmitted",
        ),
      });

      setStep("billingAccess.paymentModalStepRefresh");
      await refresh?.({ silent: true });

      window.dispatchEvent(
        new CustomEvent("dfct:billing-updated", {
          detail: {
            source: "cardano_credit_package_checkout",
            paymentIntentId: intentId,
            txHash,
          },
        }),
      );

      setCheckoutStage("");

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          closePaymentModal();
          scrollBillingActivityIntoView();
        }, isPendingVerification ? 1800 : 1100);
      }
    } catch (err) {
      setCheckoutError(
        describeCheckoutError(
          err,
          getApiErrorMessage(err, t("billingAccess.paymentModalCheckoutFailed")),
          checkoutStep,
          t,
        ),
      );
    } finally {
      setCheckoutLoading(false);
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

        <section className="BillingAccess-section" id="billing-activity">
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
                  <th>{t("billingAccess.activityContext")}</th>
                  <th>{t("billingAccess.intentStatus")}</th>
                  <th>{t("billingAccess.intentAmount")}</th>
                  <th>{t("billingAccess.intentCreated")}</th>
                </tr>
              </thead>
              <tbody>
                {billingActivity.length > 0 ? billingActivity.map((item) => (
                  <tr
                    key={item.id}
                    className="BillingAccess-activityRow"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBillingActivity(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBillingActivity(item);
                      }
                    }}
                  >
                    <td>{item.kind}</td>
                    <td>{item.context || "—"}</td>
                    <td>{item.status}</td>
                    <td>{item.amount}</td>
                    <td>{formatIntentDate(item.createdAt)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5">{t("billingAccess.noActivity")}</td></tr>
                )}
              </tbody>
            </Table>
          </div>
        </section>

        <BillingActivityDetailsModal
          t={t}
          activity={selectedBillingActivity}
          onHide={() => setSelectedBillingActivity(null)}
        />

        <PaymentRequestModal
          show={Boolean(selectedPaymentIntent)}
          onHide={closePaymentModal}
          t={t}
          language={i18n.language}
          intent={selectedPaymentIntent}
          selectedPackage={selectedPaymentPackage}
          cardanoQuote={cardanoQuote}
          walletSummaries={walletSummaries}
          selectedWallet={selectedWallet}
          updateSelectedWallet={updateSelectedWallet}
          isLoadingWallet={isLoadingWallet}
          checkoutLoading={checkoutLoading}
          checkoutError={checkoutError}
          checkoutSuccess={checkoutSuccess}
          checkoutStage={checkoutStage}
          quoteRefreshing={quoteRefreshing}
          onRefreshCardanoQuote={refreshCardanoQuote}
          onPayCardano={handleCardanoPayment}
        />

      </Container>
    </main>
  );
}
