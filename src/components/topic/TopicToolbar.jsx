import React, { useState } from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
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

function normalizeTopicUpdate(topic = {}) {
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
  const tooltipKey = canManageTopic
    ? statusToTooltipKey[statusKey] ?? statusToTooltipKey.DRAFT
    : "topicPublishOwnerOnly";
  const statusClass = statusKey.toLowerCase();

  const handlePublishClick = async () => {
    if (!canPublishTopic) return;

    if (!billingStatus.loaded && !billingStatus.apiUnavailable) {
      await billingStatus.refresh?.();
    }

    setPublishModalShow(true);
  };

  const handlePublishConfirmed = async ({ rewardPoolEnabled = false } = {}) => {
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

      props.onTopicUpdated?.({
        message,
        updatedTopic: normalizeTopicUpdate(result?.topic),
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
    <Container className="Breakdown-toolbar" fluid>
      <Row>
        {props.user && (
          <>
            <Col>
              <OverlayTrigger
                key="publish"
                placement="top"
                overlay={
                  <Tooltip id="tooltip-publish">
                    {loading ? t("publishingTopic") : t(tooltipKey)}
                  </Tooltip>
                }
              >
                <Image
                  src={publishIcon}
                  className={`Breakdown-toolbar-icon status-${statusClass} ${
                    loading ? "rotating" : ""
                  }`}
                  onClick={handlePublishClick}
                  style={{ cursor: statusKey === "DRAFT" ? "pointer" : "default" }}
                />
              </OverlayTrigger>
            </Col>
            <Col>
              <OverlayTrigger
                key="delete"
                placement="top"
                overlay={
                  <Tooltip id="tooltip-delete">{t("deleteTopic")}</Tooltip>
                }
              >
                <Image className="Breakdown-toolbar-icon" src={deleteIcon} />
              </OverlayTrigger>
            </Col>
          </>
        )}
        <Col>
          <OverlayTrigger
            key="share"
            placement="top"
            overlay={<Tooltip id="tooltip-share">{t("shareTopic")}</Tooltip>}
          >
            <Image
              className="Breakdown-toolbar-icon"
              src={shareIcon}
              onClick={() => props.setShareModalShow(true)}
            />
          </OverlayTrigger>
        </Col>
      </Row>

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
    </Container>
  );
}

export default TopicToolbar;
