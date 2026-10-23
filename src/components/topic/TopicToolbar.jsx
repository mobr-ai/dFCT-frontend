import React, { useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import Image from "react-bootstrap/Image";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { ShareModal } from "../share";
import PublishTopicModal from "./PublishTopicModal";
import { useTranslation } from "react-i18next";
import {
  getApiErrorMessage,
  useAuthRequest,
} from "../../hooks/useAuthRequest";
import { useBillingStatus } from "../../hooks/useBillingStatus";
import { publishTopicWithBilling } from "../../api/billingCredits";
import { activateTopic } from "../../api/topicLifecycle";
import publishIcon from "./../../icons/publish.svg";
import deleteIcon from "./../../icons/delete.svg";
import shareIcon from "./../../icons/share.svg";

const TOPIC_STATUS_BY_CODE = {
  0: "PROPOSED",
  1: "REVIEWED",
  2: "ACTIVE",
  3: "CLOSED",
  4: "REJECTED",
  5: "DRAFT",
};

function normalizeTopicStatus(status, fallback = "PROPOSED") {
  if (status === undefined || status === null || status === "") return fallback;

  const numericStatus = Number(status);
  if (Number.isInteger(numericStatus) && TOPIC_STATUS_BY_CODE[numericStatus]) {
    return TOPIC_STATUS_BY_CODE[numericStatus];
  }

  return String(status).toUpperCase();
}

function userIdFrom(user) {
  return (
    user?.user_id ||
    user?.userId ||
    user?.id ||
    user?.sub ||
    user?.identity
  );
}

function idsMatch(left, right) {
  if (left === undefined || left === null || left === "") return false;
  if (right === undefined || right === null || right === "") return false;
  return String(left) === String(right);
}

function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function userRolesFrom(user = {}) {
  const roleSources = [
    user.roles,
    user.roleKeys,
    user.role_keys,
    user.permissions,
    user.claims?.roles,
    user.claims?.roleKeys,
    user.profile?.roles,
  ];

  const roles = roleSources.flatMap((source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    if (typeof source === "object") return Object.values(source);
    return [source];
  });

  for (const key of ["role", "roleKey", "role_key"]) {
    if (user[key]) roles.push(user[key]);
  }

  return roles.map(normalizeRoleKey).filter(Boolean);
}

function userCanActivateReviewedTopic(user = {}) {
  if (user.is_admin || user.isAdmin || user.admin) return true;

  const roles = userRolesFrom(user);
  return roles.some((role) =>
    ["admin", "system_admin", "moderator"].includes(role)
  );
}

function normalizeTopicUpdate(topic = {}, financialSummary = null) {
  return {
    status: normalizeTopicStatus(topic.status),
    updated_at:
      topic.updated_at ||
      topic.updatedAt ||
      new Date().toISOString(),
    transaction_hash:
      topic.transaction_hash ||
      topic.transactionHash ||
      null,
    reward_amount:
      topic.reward_amount ??
      topic.rewardAmount ??
      0,
    distribution_fee_amount:
      topic.distribution_fee_amount ??
      topic.distributionFeeAmount ??
      0,
    financialSummary:
      topic.financialSummary ??
      topic.financial_summary ??
      financialSummary ??
      null,
  };
}

function optimisticPublicationFinancialSummary({
  topicId,
  result,
  currentSummary,
}) {
  const publicationAccess = result?.publication_access || {};
  const rawMode = String(publicationAccess.mode || "").trim().toLowerCase();
  const billingMode =
    rawMode === "free_quota" || rawMode === "quota"
      ? "included"
      : rawMode || "included";
  const rawCost = Number(
    publicationAccess.topic_publish_credit_cost ??
      publicationAccess.topicPublishCreditCost ??
      0,
  );
  const creditsDebited = Boolean(
    publicationAccess.credits_debited ??
      publicationAccess.creditsDebited,
  );
  const ledgerEntry = result?.ledger_entry || {};
  const currency =
    currentSummary?.currency ||
    ledgerEntry.currencyCode ||
    ledgerEntry.currency_code ||
    "DFCT";

  return {
    ...(currentSummary || {}),
    schema: currentSummary?.schema || "dsm-prov-financial/v1",
    topicId: currentSummary?.topicId ?? topicId,
    currency,
    publication: {
      schema: "dsm-prov-financial/v1",
      type: "topic_publication",
      direction: creditsDebited && rawCost > 0 ? "debit" : "neutral",
      amount: Number.isFinite(rawCost) ? Math.abs(rawCost) : 0,
      currency,
      billingMode,
      status: "settled",
      topicId: String(topicId),
      ledgerEntryId:
        ledgerEntry.ledgerEntryId ??
        ledgerEntry.ledger_entry_id ??
        null,
      balanceAfter:
        ledgerEntry.balanceAfter ??
        ledgerEntry.balance_after ??
        null,
    },
    rewardPool: currentSummary?.rewardPool || null,
    rewardPoolAccountingReady:
      currentSummary?.rewardPoolAccountingReady === true,
    hasFinancialActivity: true,
  };
}

function TopicToolbar(props) {
  const { t: translate } = useTranslation();
  const t = translate ?? ((key) => key);

  const { authRequest } = useAuthRequest(props.user);
  const billingStatus = useBillingStatus(props.user);

  const [loading, setLoading] = useState(false);
  const [publishModalShow, setPublishModalShow] = useState(false);

  const statusToTooltipKey = {
    PROPOSED: "topicProposed",
    REVIEWED: "topicReviewed",
    ACTIVE: "topicActivated",
    CLOSED: "topicClosed",
    REJECTED: "topicRejected",
    DRAFT: "topicDraft",
  };

  const statusKey = normalizeTopicStatus(props.status, "DRAFT");
  const currentUserId = userIdFrom(props.user);
  const topicOwnerId = props.proposedBy;
  const canManageTopic = idsMatch(currentUserId, topicOwnerId);
  const canPublishTopic = canManageTopic && statusKey === "DRAFT";
  const canActivateTopic =
    statusKey === "REVIEWED" &&
    (canManageTopic || userCanActivateReviewedTopic(props.user));
  const canRunStatusAction = canPublishTopic || canActivateTopic;
  const tooltipKey = canPublishTopic
    ? "publishTopic"
    : canActivateTopic
      ? "activateTopic"
      : statusKey === "DRAFT"
        ? "topicPublishOwnerOnly"
        : statusKey === "REVIEWED"
          ? "topicActivateOwnerOnly"
          : statusToTooltipKey[statusKey] ?? statusToTooltipKey.DRAFT;
  const statusClass = statusKey.toLowerCase();
  const loadingTooltipKey = canActivateTopic ? "activatingTopic" : "publishingTopic";
  const statusActionLabel = loading ? t(loadingTooltipKey) : t(tooltipKey);

  const handlePublishClick = async () => {
    if (!canPublishTopic) return;

    if (!billingStatus.loaded && !billingStatus.apiUnavailable) {
      await billingStatus.refresh?.();
    }

    setPublishModalShow(true);
  };

  const handleActivateClick = async () => {
    if (!canActivateTopic) return;

    try {
      setLoading(true);

      const result = await activateTopic(authRequest, props.topicId);
      const message = t("topicActivatedToast");

      window.dispatchEvent(
        new CustomEvent("dfct:topic-lifecycle-updated", {
          detail: {
            source: "topic_activation",
            topicId: props.topicId,
          },
        }),
      );

      props.onTopicUpdated?.({
        updatedTopic: result?.topic
          ? normalizeTopicUpdate(result.topic)
          : {
              status: "ACTIVE",
              updated_at: new Date().toISOString(),
            },
      });

      props.showToast?.(message, "success");
    } catch (err) {
      props.showToast?.(
        getApiErrorMessage(err, t("topicActivationFailed")),
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusActionClick = async () => {
    if (canPublishTopic) {
      await handlePublishClick();
      return;
    }

    if (canActivateTopic) {
      await handleActivateClick();
    }
  };

  const handlePublishConfirmed = async ({
    rewardPoolEnabled = false,
    anchoringEnabled = false,
    anchorPolicy,
    anchorScope,
    anchorFundingSource,
    anchorProvider,
    anchorNetwork,
  } = {}) => {
    const userId = userIdFrom(props.user);

    if (!userId) {
      props.showToast?.(t("topicPublishMissingUser"), "danger");
      return;
    }

    try {
      setLoading(true);

      const result = await publishTopicWithBilling(
        authRequest,
        userId,
        props.topicId,
        {
          rewardPoolEnabled,
          anchoringEnabled,
          anchorPolicy,
          anchorScope,
          anchorFundingSource,
          anchorProvider,
          anchorNetwork,
        },
      );

      await billingStatus.refresh?.();

      window.dispatchEvent(
        new CustomEvent("dfct:billing-updated", {
          detail: {
            source: "topic_publication",
            topicId: props.topicId,
          },
        }),
      );

      window.dispatchEvent(
        new CustomEvent("dfct:topic-lifecycle-updated", {
          detail: {
            source: "topic_publication",
            topicId: props.topicId,
          },
        }),
      );

      const mode = result?.publication_access?.mode;
      const cost = result?.publication_access?.topic_publish_credit_cost || 1;
      const message =
        mode === "credits"
          ? t("topicPublishedWithCredits", { count: cost })
          : t("topicPublishedFreeQuota");

      const financialSummary = optimisticPublicationFinancialSummary({
        topicId: props.topicId,
        result,
        currentSummary: props.financialSummary,
      });

      props.onTopicUpdated?.({
        message,
        updatedTopic: normalizeTopicUpdate(
          result?.topic,
          financialSummary,
        ),
      });

      props.showToast?.(message, "success");
      setPublishModalShow(false);
    } catch (err) {
      props.showToast?.(
        getApiErrorMessage(err, t("proposalFailed")),
        "danger",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Breakdown-toolbar Breakdown-topic-actions">
      <div
        className="Breakdown-topic-actionsDesktop"
        aria-label={t("topicActions")}
      >
        {props.user && (
          <>
            <OverlayTrigger
              key="publish"
              placement="top"
              overlay={
                <Tooltip id="tooltip-publish">{statusActionLabel}</Tooltip>
              }
            >
              <span className="Breakdown-topic-actionTooltipTarget">
                <button
                  type="button"
                  className={[
                    "Breakdown-topic-actionButton",
                    !canRunStatusAction && "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={handleStatusActionClick}
                  aria-label={statusActionLabel}
                  aria-disabled={!canRunStatusAction || loading}
                  disabled={loading}
                >
                  <Image
                    src={publishIcon}
                    className={`Breakdown-toolbar-icon status-${statusClass} ${
                      loading ? "rotating" : ""
                    }`}
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              </span>
            </OverlayTrigger>

            <OverlayTrigger
              key="delete"
              placement="top"
              overlay={
                <Tooltip id="tooltip-delete">{t("deleteTopic")}</Tooltip>
              }
            >
              <span className="Breakdown-topic-actionTooltipTarget">
                <button
                  type="button"
                  className="Breakdown-topic-actionButton is-disabled"
                  aria-label={t("deleteTopic")}
                  aria-disabled="true"
                >
                  <Image
                    className="Breakdown-toolbar-icon"
                    src={deleteIcon}
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              </span>
            </OverlayTrigger>
          </>
        )}

        <OverlayTrigger
          key="share"
          placement="top"
          overlay={<Tooltip id="tooltip-share">{t("shareTopic")}</Tooltip>}
        >
          <button
            type="button"
            className="Breakdown-topic-actionButton"
            aria-label={t("shareTopic")}
            onClick={() => props.setShareModalShow(true)}
          >
            <Image
              className="Breakdown-toolbar-icon"
              src={shareIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        </OverlayTrigger>
      </div>

      <Dropdown align="end" className="Breakdown-topic-actionsMobile">
        <Dropdown.Toggle
          className="Breakdown-topic-overflowToggle"
          aria-label={t("topicActions")}
          title={t("topicActions")}
        >
          <span aria-hidden="true">•••</span>
        </Dropdown.Toggle>

        <Dropdown.Menu className="Breakdown-topic-overflowMenu">
          {props.user && (
            <>
              <Dropdown.Item
                as="button"
                onClick={handleStatusActionClick}
                disabled={!canRunStatusAction || loading}
              >
                <Image
                  src={publishIcon}
                  className={`Breakdown-toolbar-icon status-${statusClass} ${
                    loading ? "rotating" : ""
                  }`}
                  alt=""
                  aria-hidden="true"
                />
                <span>{statusActionLabel}</span>
              </Dropdown.Item>

              <Dropdown.Item as="button" disabled>
                <Image
                  className="Breakdown-toolbar-icon"
                  src={deleteIcon}
                  alt=""
                  aria-hidden="true"
                />
                <span>{t("deleteTopic")}</span>
              </Dropdown.Item>
            </>
          )}

          <Dropdown.Item
            as="button"
            onClick={() => props.setShareModalShow(true)}
          >
            <Image
              className="Breakdown-toolbar-icon"
              src={shareIcon}
              alt=""
              aria-hidden="true"
            />
            <span>{t("shareTopic")}</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <ShareModal
        show={props.shareModalShow}
        title={props.title}
        hashtags={props.hashtags}
        onHide={() => props.setShareModalShow(false)}
      />

      <PublishTopicModal
        show={statusKey === "DRAFT" && publishModalShow}
        onHide={() => setPublishModalShow(false)}
        onConfirm={handlePublishConfirmed}
        billingStatus={billingStatus}
        isPublishing={loading}
        showToast={props.showToast}
      />
    </div>
  );
}

export default TopicToolbar;
