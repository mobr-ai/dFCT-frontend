import React from "react";
import { useTranslation } from "react-i18next";

function normalizeFinancialKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function financialAmount(effect, fallbackCurrency = "DFCT") {
  const amount = Number(
    effect?.amount ??
      effect?.creditAmount ??
      effect?.credit_amount ??
      effect?.quotedCreditAmount ??
      effect?.quoted_credit_amount ??
      0,
  );
  const currency =
    effect?.currency ||
    effect?.currencyCode ||
    effect?.currency_code ||
    fallbackCurrency ||
    "DFCT";

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
  };
}

function formatFinancialAmount(effect, locale, fallbackCurrency = "DFCT") {
  const { amount, currency } = financialAmount(effect, fallbackCurrency);
  const direction = normalizeFinancialKey(effect?.direction);
  const sign =
    direction === "credit" || direction === "refund" || direction === "award"
      ? "+"
      : direction === "debit" || direction === "reserve"
        ? "−"
        : "";

  return `${sign}${Math.abs(amount).toLocaleString(locale, {
    maximumFractionDigits: 6,
  })} ${currency}`;
}

function financialStatusLabel(t, status) {
  const key = normalizeFinancialKey(status || "pending");
  const knownStatuses = new Set([
    "pending",
    "blocked",
    "funding_blocked",
    "debited",
    "settled",
    "refunded",
    "review_required",
    "confirmed",
    "submitted",
    "failed",
  ]);
  const translationKey = knownStatuses.has(key)
    ? `topicFinancialSummary.statuses.${key}`
    : "topicFinancialSummary.statuses.pending";

  return t(translationKey);
}

function financialBillingLabel(t, effect, locale, fallbackCurrency = "DFCT") {
  const mode = normalizeFinancialKey(
    effect?.billingMode || effect?.billing_mode,
  );

  if (["sponsored", "included", "free"].includes(mode)) {
    return t(`topicFinancialSummary.billingModes.${mode}`);
  }

  return formatFinancialAmount(effect, locale, fallbackCurrency);
}

function rewardPoolAmounts(rewardPool = {}) {
  const funded = Number(
    rewardPool.funded ??
      rewardPool.fundedAmount ??
      rewardPool.funded_amount ??
      0,
  );
  const available = Number(
    rewardPool.available ??
      rewardPool.availableAmount ??
      rewardPool.available_amount ??
      0,
  );
  const currency =
    rewardPool.currency ||
    rewardPool.currencyCode ||
    rewardPool.currency_code ||
    "DFCT";

  return {
    funded: Number.isFinite(funded) ? funded : 0,
    available: Number.isFinite(available) ? available : 0,
    currency,
  };
}

function TopicFinancialSummary({
  status,
  financialSummary,
  legacyRewardAmount,
  locale,
  onOpenLifecycle,
}) {
  const { t } = useTranslation();
  const anchoring = financialSummary?.anchoring || null;
  const rewardPool = financialSummary?.rewardPool || null;
  const rewardPoolAccountingReady =
    financialSummary?.rewardPoolAccountingReady === true;
  const fallbackCurrency = financialSummary?.currency || "DFCT";
  const anchorStatus =
    anchoring?.anchorStatus || anchoring?.anchor_status || anchoring?.status;
  const legacyReward = Number(legacyRewardAmount || 0);

  const anchoringValue = anchoring
    ? financialBillingLabel(t, anchoring, locale, fallbackCurrency)
    : t("topicFinancialSummary.notAnchored");
  const anchoringStatus = anchoring
    ? financialStatusLabel(t, anchorStatus)
    : t("topicFinancialSummary.statuses.pending");

  let rewardValue = t("topicFinancialSummary.notFunded");
  let rewardStatus = t("topicFinancialSummary.accountingPending");

  if (rewardPoolAccountingReady && rewardPool) {
    const { funded, available, currency } = rewardPoolAmounts(rewardPool);
    rewardValue = t("topicFinancialSummary.rewardAvailable", {
      amount: available.toLocaleString(locale, {
        maximumFractionDigits: 6,
      }),
      currency,
    });
    rewardStatus = t("topicFinancialSummary.rewardFunded", {
      amount: funded.toLocaleString(locale, {
        maximumFractionDigits: 6,
      }),
      currency,
    });
  } else if (legacyReward > 0) {
    rewardValue = t("topicFinancialSummary.legacyRewardConfigured", {
      amount: legacyReward.toLocaleString(locale, {
        maximumFractionDigits: 6,
      }),
    });
  }

  const cards = [
    {
      key: "state",
      label: t("topicFinancialSummary.state"),
      value: t(status),
      meta: t("topicFinancialSummary.lifecycleState"),
      tone: normalizeFinancialKey(status),
    },
    {
      key: "anchoring",
      label: t("topicFinancialSummary.anchoring"),
      value: anchoringValue,
      meta: anchoringStatus,
      tone: normalizeFinancialKey(anchorStatus || "pending"),
    },
    {
      key: "reward",
      label: t("topicFinancialSummary.rewardPool"),
      value: rewardValue,
      meta: rewardStatus,
      tone: rewardPoolAccountingReady ? "settled" : "pending",
    },
  ];

  return (
    <div
      className="Breakdown-topic-statusSummary"
      aria-label={t("topicFinancialSummary.ariaLabel")}
    >
      {cards.map((card) => {
        const summary = [card.label, card.value, card.meta]
          .filter(Boolean)
          .join(" · ");

        return (
          <button
            key={card.key}
            type="button"
            className={[
              "Breakdown-financial-chip",
              `is-${card.key}`,
              card.tone ? `tone-${card.tone}` : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onOpenLifecycle}
            aria-label={summary}
            title={`${summary}. ${t("topicFinancialSummary.openLifecycle")}`}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        );
      })}
    </div>
  );
}


export default TopicFinancialSummary;
