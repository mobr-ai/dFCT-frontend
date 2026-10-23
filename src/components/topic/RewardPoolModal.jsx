import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBolt,
  faChartPie,
  faCheck,
  faClockRotateLeft,
  faCoins,
  faPlus,
  faRotate,
  faShieldHalved,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import { useBillingStatus } from "../../hooks/useBillingStatus";
import { useRewardPool } from "../../hooks/useRewardPool";
import "../../styles/RewardPoolModal.css";

const AMOUNT_PATTERN = /^\d+(?:[.,]\d{0,6})?$/;

function normalizeAmount(value) {
  const raw = String(value || "").trim();
  if (!AMOUNT_PATTERN.test(raw)) return null;

  const normalized = raw.replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return normalized;
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCredits(value, locale, currency = "DFCT") {
  return `${numeric(value).toLocaleString(locale, {
    maximumFractionDigits: 6,
  })} ${currency}`;
}

function formatPercent(value, locale) {
  return `${(numeric(value) * 100).toLocaleString(locale, {
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusKey(value) {
  return String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function errorText(t, error) {
  if (!error) return "";
  const key = statusKey(error.code);
  const known = new Set([
    "amountrequired",
    "initialamountrequired",
    "idempotencykeyrequired",
    "invalididempotencykey",
    "insufficientcredits",
    "insufficientrewardpoolbalance",
    "noeligiblerewardpoints",
    "rewardamounttoosmallforparticipants",
    "rewarddistributionintegrityerror",
    "rewarddistributionnotexecutable",
    "rewarddistributionpreviewstale",
    "rewardpoolalreadyexists",
    "rewardpoolclosed",
    "rewardpoolmanagerrequired",
    "rewardpoolnotfound",
    "rewardpoolunavailable",
  ]);

  return known.has(key)
    ? t(`rewardPoolModal.errors.${key}`)
    : error.message || t("rewardPoolModal.errors.generic");
}

function Metric({ label, value, emphasized = false }) {
  return (
    <div className={emphasized ? "RewardPoolModal-metric is-emphasized" : "RewardPoolModal-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyPool({
  canCreate,
  lifecycleReady,
  authenticated,
  amount,
  amountInvalid,
  busy,
  onAmountChange,
  onCreate,
  onRequireAuth,
}) {
  const { t } = useTranslation();

  return (
    <div className="RewardPoolModal-empty">
      <div className="RewardPoolModal-emptyIcon" aria-hidden="true">
        <FontAwesomeIcon icon={faBolt} />
      </div>
      <span className="RewardPoolModal-eyebrow">
        {t("rewardPoolModal.empty.eyebrow")}
      </span>
      <h3>{t("rewardPoolModal.empty.title")}</h3>
      <p>{t("rewardPoolModal.empty.body")}</p>

      <div className="RewardPoolModal-benefits">
        <div>
          <FontAwesomeIcon icon={faUsers} />
          <span>{t("rewardPoolModal.empty.benefits.community")}</span>
        </div>
        <div>
          <FontAwesomeIcon icon={faChartPie} />
          <span>{t("rewardPoolModal.empty.benefits.proportional")}</span>
        </div>
        <div>
          <FontAwesomeIcon icon={faShieldHalved} />
          <span>{t("rewardPoolModal.empty.benefits.accounting")}</span>
        </div>
      </div>

      {canCreate ? (
        <Form className="RewardPoolModal-createForm" onSubmit={onCreate}>
          <Form.Group controlId="reward-pool-initial-amount">
            <Form.Label>{t("rewardPoolModal.create.initialAmount")}</Form.Label>
            <div className="RewardPoolModal-amountInput">
              <Form.Control
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder={t("rewardPoolModal.amountPlaceholder")}
                isInvalid={amountInvalid}
                disabled={busy}
              />
              <span>DFCT</span>
            </div>
            <Form.Text>{t("rewardPoolModal.create.help")}</Form.Text>
          </Form.Group>
          <Button type="submit" disabled={busy || amountInvalid || !amount}>
            {busy ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <FontAwesomeIcon icon={faBolt} />
            )}
            <span>{t("rewardPoolModal.create.action")}</span>
          </Button>
        </Form>
      ) : !lifecycleReady ? (
        <div className="RewardPoolModal-notice">
          {t("rewardPoolModal.empty.lifecycleLocked")}
        </div>
      ) : !authenticated ? (
        <Button className="RewardPoolModal-authAction" onClick={onRequireAuth}>
          {t("rewardPoolModal.signInAction")}
          <FontAwesomeIcon icon={faArrowRight} />
        </Button>
      ) : (
        <div className="RewardPoolModal-notice">
          {t("rewardPoolModal.empty.managerOnly")}
        </div>
      )}
    </div>
  );
}

function Overview({ pool, viewer, permissions, locale, onViewChange, authenticated, onRequireAuth }) {
  const { t } = useTranslation();
  const currency = pool?.currencyCode || "DFCT";
  const status = statusKey(pool?.status);

  return (
    <div className="RewardPoolModal-overview">
      <div className="RewardPoolModal-balanceHero">
        <div>
          <span>{t("rewardPoolModal.available")}</span>
          <strong>{formatCredits(pool?.availableAmount, locale, currency)}</strong>
          <small>{t("rewardPoolModal.availableHelp")}</small>
        </div>
        <span className={`RewardPoolModal-status is-${status}`}>
          {t(`rewardPoolModal.statuses.${status}`, {
            defaultValue: pool?.status || status,
          })}
        </span>
      </div>

      <div className="RewardPoolModal-metrics">
        <Metric
          label={t("rewardPoolModal.metrics.funded")}
          value={formatCredits(pool?.fundedAmount, locale, currency)}
        />
        <Metric
          label={t("rewardPoolModal.metrics.reserved")}
          value={formatCredits(pool?.reservedAmount, locale, currency)}
        />
        <Metric
          label={t("rewardPoolModal.metrics.distributed")}
          value={formatCredits(pool?.distributedAmount, locale, currency)}
        />
        <Metric
          label={t("rewardPoolModal.metrics.returned")}
          value={formatCredits(pool?.returnedAmount, locale, currency)}
        />
      </div>

      {viewer?.sponsorRefundableAmount !== null &&
        viewer?.sponsorRefundableAmount !== undefined && (
          <div className="RewardPoolModal-sponsorBalance">
            <span>{t("rewardPoolModal.sponsorBalance")}</span>
            <strong>
              {formatCredits(
                viewer.sponsorRefundableAmount,
                locale,
                currency,
              )}
            </strong>
            <small>{t("rewardPoolModal.sponsorBalanceHelp")}</small>
          </div>
        )}

      <div className="RewardPoolModal-actionGrid">
        {permissions.canFund && (
          <button type="button" onClick={() => onViewChange("fund")}>
            <FontAwesomeIcon icon={faPlus} />
            <span>
              <strong>{t("rewardPoolModal.actions.fund")}</strong>
              <small>{t("rewardPoolModal.actions.fundHelp")}</small>
            </span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}

        {permissions.canPreviewDistribution && (
          <button type="button" onClick={() => onViewChange("distribute")}>
            <FontAwesomeIcon icon={faChartPie} />
            <span>
              <strong>{t("rewardPoolModal.actions.distribute")}</strong>
              <small>{t("rewardPoolModal.actions.distributeHelp")}</small>
            </span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}

        {permissions.canViewActivity && (
          <button type="button" onClick={() => onViewChange("activity")}>
            <FontAwesomeIcon icon={faClockRotateLeft} />
            <span>
              <strong>{t("rewardPoolModal.actions.activity")}</strong>
              <small>{t("rewardPoolModal.actions.activityHelp")}</small>
            </span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}

        {!authenticated && (
          <button type="button" onClick={onRequireAuth}>
            <FontAwesomeIcon icon={faCoins} />
            <span>
              <strong>{t("rewardPoolModal.signInAction")}</strong>
              <small>{t("rewardPoolModal.signInHelp")}</small>
            </span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}
      </div>
    </div>
  );
}

function AmountForm({
  id,
  title,
  body,
  actionLabel,
  amount,
  amountInvalid,
  busy,
  balance,
  locale,
  onAmountChange,
  onSubmit,
}) {
  const { t } = useTranslation();

  return (
    <Form className="RewardPoolModal-operation" onSubmit={onSubmit}>
      <span className="RewardPoolModal-eyebrow">{title}</span>
      <h3>{title}</h3>
      <p>{body}</p>

      {balance !== null && balance !== undefined && (
        <div className="RewardPoolModal-walletBalance">
          <span>{t("rewardPoolModal.creditBalance")}</span>
          <strong>{formatCredits(balance, locale)}</strong>
        </div>
      )}

      <Form.Group controlId={id}>
        <Form.Label>{t("rewardPoolModal.amount")}</Form.Label>
        <div className="RewardPoolModal-amountInput">
          <Form.Control
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder={t("rewardPoolModal.amountPlaceholder")}
            isInvalid={amountInvalid}
            disabled={busy}
          />
          <span>DFCT</span>
        </div>
        {amountInvalid && (
          <Form.Control.Feedback type="invalid">
            {t("rewardPoolModal.amountInvalid")}
          </Form.Control.Feedback>
        )}
      </Form.Group>

      <Button type="submit" disabled={busy || amountInvalid || !amount}>
        {busy ? <Spinner animation="border" size="sm" /> : null}
        <span>{actionLabel}</span>
      </Button>
    </Form>
  );
}

function DistributionPreview({ distribution, locale, busy, canExecute, onExecute, onReset }) {
  const { t } = useTranslation();
  const items = distribution?.items || [];
  const executed = statusKey(distribution?.status) === "executed";

  return (
    <div className="RewardPoolModal-preview">
      <div className="RewardPoolModal-previewHeader">
        <div>
          <span className="RewardPoolModal-eyebrow">
            {executed
              ? t("rewardPoolModal.distribution.completeEyebrow")
              : t("rewardPoolModal.distribution.previewEyebrow")}
          </span>
          <h3>
            {executed
              ? t("rewardPoolModal.distribution.completeTitle")
              : t("rewardPoolModal.distribution.previewTitle")}
          </h3>
        </div>
        <strong>{formatCredits(distribution?.amount, locale)}</strong>
      </div>

      <div className="RewardPoolModal-previewMeta">
        <span>
          {t("rewardPoolModal.distribution.participants", {
            count: items.length,
          })}
        </span>
        <span>
          {t("rewardPoolModal.distribution.totalScore", {
            score: numeric(distribution?.totalScore).toLocaleString(locale, {
              maximumFractionDigits: 6,
            }),
          })}
        </span>
      </div>

      <div className="RewardPoolModal-allocationList">
        {items.map((item) => (
          <div key={item.itemId || item.userId} className="RewardPoolModal-allocation">
            <div className="RewardPoolModal-contributor">
              <span>{t("rewardPoolModal.distribution.contributor")}</span>
              <strong>#{item.userId}</strong>
            </div>
            <div>
              <span>{t("rewardPoolModal.distribution.score")}</span>
              <strong>{numeric(item.score).toLocaleString(locale, { maximumFractionDigits: 6 })}</strong>
            </div>
            <div>
              <span>{t("rewardPoolModal.distribution.share")}</span>
              <strong>{formatPercent(item.share, locale)}</strong>
            </div>
            <div>
              <span>{t("rewardPoolModal.distribution.reward")}</span>
              <strong>{formatCredits(item.amount, locale)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className={executed ? "RewardPoolModal-confirmation is-complete" : "RewardPoolModal-confirmation"}>
        <FontAwesomeIcon icon={executed ? faCheck : faShieldHalved} />
        <div>
          <strong>
            {executed
              ? t("rewardPoolModal.distribution.completeNotice")
              : t("rewardPoolModal.distribution.confirmTitle")}
          </strong>
          <p>
            {executed
              ? t("rewardPoolModal.distribution.completeBody")
              : t("rewardPoolModal.distribution.confirmBody")}
          </p>
        </div>
      </div>

      <div className="RewardPoolModal-operationActions">
        <Button variant="secondary" onClick={onReset} disabled={busy}>
          {executed
            ? t("rewardPoolModal.backToOverview")
            : t("rewardPoolModal.distribution.changeAmount")}
        </Button>
        {!executed && canExecute && (
          <Button onClick={onExecute} disabled={busy}>
            {busy ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon icon={faCheck} />}
            <span>{t("rewardPoolModal.distribution.execute")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function Activity({ activity, locale, loading, onRefresh }) {
  const { t } = useTranslation();
  const entries = activity?.entries || [];
  const distributions = activity?.distributions || [];

  if (loading && !activity) {
    return (
      <div className="RewardPoolModal-loading">
        <Spinner animation="border" />
        <span>{t("rewardPoolModal.activity.loading")}</span>
      </div>
    );
  }

  return (
    <div className="RewardPoolModal-activity">
      <div className="RewardPoolModal-sectionHeading">
        <div>
          <span className="RewardPoolModal-eyebrow">
            {t("rewardPoolModal.activity.eyebrow")}
          </span>
          <h3>{t("rewardPoolModal.activity.title")}</h3>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>
          <FontAwesomeIcon icon={faRotate} spin={loading} />
          <span>{t("rewardPoolModal.refresh")}</span>
        </button>
      </div>

      {!entries.length && !distributions.length ? (
        <div className="RewardPoolModal-notice">
          {t("rewardPoolModal.activity.empty")}
        </div>
      ) : (
        <>
          <section>
            <h4>{t("rewardPoolModal.activity.poolEntries")}</h4>
            <div className="RewardPoolModal-timeline">
              {entries.map((entry) => {
                const type = statusKey(entry.entryType);
                return (
                  <div key={entry.poolEntryId}>
                    <span className={`is-${type}`} aria-hidden="true" />
                    <div>
                      <strong>
                        {t(`rewardPoolModal.activity.entryTypes.${type}`, {
                          defaultValue: entry.entryType,
                        })}
                      </strong>
                      <small>{formatDate(entry.createdAt, locale)}</small>
                    </div>
                    <b>{formatCredits(entry.amount, locale)}</b>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h4>{t("rewardPoolModal.activity.distributions")}</h4>
            <div className="RewardPoolModal-timeline">
              {distributions.map((distribution) => (
                <div key={distribution.distributionId}>
                  <span className={`is-${statusKey(distribution.status)}`} aria-hidden="true" />
                  <div>
                    <strong>
                      {t("rewardPoolModal.activity.distributionLabel", {
                        id: distribution.distributionId,
                      })}
                    </strong>
                    <small>
                      {formatDate(
                        distribution.executedAt || distribution.previewedAt,
                        locale,
                      )}
                    </small>
                  </div>
                  <b>{formatCredits(distribution.amount, locale)}</b>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function RewardPoolModal({
  show,
  onHide,
  topicId,
  topicTitle,
  user,
  locale = "en-US",
  onRewardPoolUpdated,
  onRequireAuth,
  showToast,
}) {
  const { t } = useTranslation();
  const billingStatus = useBillingStatus(user);
  const rewardPool = useRewardPool({
    user,
    topicId,
    enabled: show,
    onUpdated: onRewardPoolUpdated,
  });
  const [view, setView] = useState("overview");
  const [amount, setAmount] = useState("");
  const normalizedAmount = normalizeAmount(amount);
  const amountInvalid = Boolean(amount) && !normalizedAmount;
  const authenticated = Boolean(user?.access_token);
  const pool = rewardPool.pool;
  const permissions = rewardPool.permissions;
  const lifecycleReady =
    rewardPool.summary?.rewardPoolLifecycleReady !== false;
  const currency = pool?.currencyCode || "DFCT";
  const error = errorText(t, rewardPool.error);
  const creditBalance = billingStatus.balance?.credits_available ?? null;

  useEffect(() => {
    if (!show) return;
    setView("overview");
    setAmount("");
    rewardPool.clearError();
    rewardPool.clearPreview();
  }, [show, topicId]);

  useEffect(() => {
    if (show && authenticated && !billingStatus.loaded) {
      billingStatus.refresh?.();
    }
  }, [authenticated, billingStatus.loaded, billingStatus.refresh, show]);

  useEffect(() => {
    if (show && view === "activity" && permissions.canViewActivity && !rewardPool.activity) {
      rewardPool.loadActivity().catch(() => {});
    }
  }, [
    permissions.canViewActivity,
    rewardPool.activity,
    rewardPool.loadActivity,
    show,
    view,
  ]);

  const title = useMemo(
    () => topicTitle || t("rewardPoolModal.topicFallback"),
    [t, topicTitle],
  );

  const changeView = (nextView) => {
    rewardPool.clearError();
    if (nextView !== "distribute") rewardPool.clearPreview();
    setAmount("");
    setView(nextView);
  };

  const requireAuth = () => {
    onHide?.();
    onRequireAuth?.();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!normalizedAmount) return;

    try {
      await rewardPool.createPool(normalizedAmount);
      await billingStatus.refresh?.();
      setAmount("");
      setView("overview");
      showToast?.(t("rewardPoolModal.toasts.created"), "success");
    } catch {
      // Error is rendered in the modal.
    }
  };

  const handleFund = async (event) => {
    event.preventDefault();
    if (!normalizedAmount) return;

    try {
      await rewardPool.fundPool(normalizedAmount);
      await billingStatus.refresh?.();
      setAmount("");
      setView("overview");
      showToast?.(t("rewardPoolModal.toasts.funded"), "success");
    } catch {
      // Error is rendered in the modal.
    }
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    if (!normalizedAmount) return;

    try {
      await rewardPool.previewDistribution(normalizedAmount);
    } catch {
      // Error is rendered in the modal.
    }
  };

  const handleExecute = async () => {
    const distributionId = rewardPool.preview?.distributionId;
    if (!distributionId) return;

    try {
      await rewardPool.executeDistribution(distributionId);
      showToast?.(t("rewardPoolModal.toasts.distributed"), "success");
    } catch {
      // Error is rendered in the modal.
    }
  };

  const handlePreviewReset = () => {
    if (statusKey(rewardPool.preview?.status) === "executed") {
      changeView("overview");
      return;
    }
    rewardPool.clearPreview();
  };

  return (
    <Modal
      show={show}
      onHide={rewardPool.busy ? undefined : onHide}
      centered
      scrollable
      size="lg"
      keyboard={!rewardPool.busy}
      backdrop={rewardPool.busy ? "static" : true}
      className="RewardPoolModal"
      contentClassName="RewardPoolModal-content"
    >
      <Modal.Header>
        <div className="RewardPoolModal-heading">
          <span className="RewardPoolModal-eyebrow">
            {t("rewardPoolModal.eyebrow")}
          </span>
          <Modal.Title>{t("rewardPoolModal.title")}</Modal.Title>
          <p title={title}>{title}</p>
        </div>
        <button
          type="button"
          className="RewardPoolModal-close"
          onClick={onHide}
          disabled={Boolean(rewardPool.busy)}
          aria-label={t("close")}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body>
        {rewardPool.loading && !rewardPool.summary ? (
          <div className="RewardPoolModal-loading">
            <Spinner animation="border" />
            <span>{t("rewardPoolModal.loading")}</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="RewardPoolModal-alert" role="alert">
                {error}
              </div>
            )}

            {!pool ? (
              <EmptyPool
                canCreate={permissions.canCreate}
                lifecycleReady={lifecycleReady}
                authenticated={authenticated}
                amount={amount}
                amountInvalid={amountInvalid}
                busy={rewardPool.busy === "create"}
                onAmountChange={setAmount}
                onCreate={handleCreate}
                onRequireAuth={requireAuth}
              />
            ) : (
              <>
                <nav className="RewardPoolModal-nav" aria-label={t("rewardPoolModal.navigation")}>
                  {["overview", "fund", "distribute", "activity"].map((item) => {
                    const visible =
                      item === "overview" ||
                      (item === "fund" && permissions.canFund) ||
                      (item === "distribute" && permissions.canPreviewDistribution) ||
                      (item === "activity" && permissions.canViewActivity);
                    if (!visible) return null;
                    return (
                      <button
                        key={item}
                        type="button"
                        className={view === item ? "is-active" : ""}
                        onClick={() => changeView(item)}
                      >
                        {t(`rewardPoolModal.nav.${item}`)}
                      </button>
                    );
                  })}
                </nav>

                {view === "overview" && (
                  <Overview
                    pool={pool}
                    viewer={rewardPool.viewer}
                    permissions={permissions}
                    locale={locale}
                    authenticated={authenticated}
                    onViewChange={changeView}
                    onRequireAuth={requireAuth}
                  />
                )}

                {view === "fund" && permissions.canFund && (
                  <AmountForm
                    id="reward-pool-fund-amount"
                    title={t("rewardPoolModal.fund.title")}
                    body={t("rewardPoolModal.fund.body")}
                    actionLabel={t("rewardPoolModal.fund.action")}
                    amount={amount}
                    amountInvalid={amountInvalid}
                    busy={rewardPool.busy === "fund"}
                    balance={creditBalance}
                    locale={locale}
                    onAmountChange={setAmount}
                    onSubmit={handleFund}
                  />
                )}

                {view === "distribute" && permissions.canPreviewDistribution && (
                  rewardPool.preview ? (
                    <DistributionPreview
                      distribution={rewardPool.preview}
                      locale={locale}
                      busy={rewardPool.busy === "execute"}
                      canExecute={permissions.canExecuteDistribution}
                      onExecute={handleExecute}
                      onReset={handlePreviewReset}
                    />
                  ) : (
                    <AmountForm
                      id="reward-pool-distribution-amount"
                      title={t("rewardPoolModal.distribution.title")}
                      body={t("rewardPoolModal.distribution.body", {
                        available: formatCredits(pool.availableAmount, locale, currency),
                      })}
                      actionLabel={t("rewardPoolModal.distribution.previewAction")}
                      amount={amount}
                      amountInvalid={amountInvalid}
                      busy={rewardPool.busy === "preview"}
                      balance={null}
                      locale={locale}
                      onAmountChange={setAmount}
                      onSubmit={handlePreview}
                    />
                  )
                )}

                {view === "activity" && permissions.canViewActivity && (
                  <Activity
                    activity={rewardPool.activity}
                    locale={locale}
                    loading={rewardPool.busy === "activity"}
                    onRefresh={() => rewardPool.loadActivity().catch(() => {})}
                  />
                )}
              </>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <span>{t("rewardPoolModal.footer")}</span>
        <Button variant="secondary" onClick={onHide} disabled={Boolean(rewardPool.busy)}>
          {t("close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
