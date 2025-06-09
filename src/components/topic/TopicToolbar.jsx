import React, { useState } from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ShareModal from "./../ShareModal";
import PublishTopicModal from "./PublishTopicModal";
import { useTranslation } from "react-i18next";
import { useAuthRequest } from "./../../hooks/useAuthRequest";
import { prepareTopicDatum } from "./../../chains/cardano/prepareTopicDatum";
import { buildTopicTx } from "./../../chains/cardano/buildTopicTx";
import { signAndSubmitTx } from "../../chains/cardano/signAndSubmitTx";
import publishIcon from "./../../icons/publish.svg";
import deleteIcon from "./../../icons/delete.svg";
import shareIcon from "./../../icons/share.svg";
import {
  DFCT_POLICY_ID,
  DFCT_TOKEN_NAME,
  PLUTUS_SCRIPT_ADDRESS,
} from "./../../chains/cardano/constants";

function TopicToolbar(props) {
  const { t: translate } = useTranslation();
  const t = translate ?? ((key) => key); // fallback no-op if t is undefined

  const { authRequest } = useAuthRequest(props.user);
  const [loading, setLoading] = useState(false);
  const [publishModalShow, setPublishModalShow] = useState(false);

  const statusToTooltipKey = {
    PROPOSED: "topicProposed",
    REVIEWED: "topicReviewed",
    ACTIVE: "topicActivated",
    CLOSED: "topicClosed",
    REJECTED: "topicRejected",
    DRAFT: "topicDraft", // fallback
  };

  const statusKey = String(props.status ?? "DRAFT").toUpperCase();
  const tooltipKey = statusToTooltipKey[statusKey] ?? statusToTooltipKey.DRAFT;
  const statusClass = statusKey.toLowerCase();

  const handlePublishConfirmed = async ({
    lovelace_amount,
    reward_amount,
    proposer_wallet_info,
  }) => {
    try {
      setLoading(true);
      setTooltipText(t("publishingTopic"));

      const walletApi = await window.cardano[
        proposer_wallet_info.name
      ].enable();

      const datum = await prepareTopicDatum({
        topicId: String(props.topicId),
        proposerPubKeyHash: proposer_wallet_info.pub_key_hash,
        lovelaceAmount: lovelace_amount,
        dfctAmount: reward_amount,
      });

      const tx = await buildTopicTx({
        walletApi,
        outputAddress: PLUTUS_SCRIPT_ADDRESS,
        datumHex: datum.datumHex,
        dfctPolicyId: DFCT_POLICY_ID,
        dfctAssetName: DFCT_TOKEN_NAME,
        dfctAmount: reward_amount,
        lovelaceAmount: lovelace_amount,
        changeAddressBech32: proposer_wallet_info.address,
        metadata: null,
      });

      const txHash = await signAndSubmitTx(tx, walletApi);
      props.showToast(t("publishingTopic"), "secondary");

      const res = await authRequest.post("/api/topic_tx_status").send({
        topic_id: String(props.topicId),
        transaction_hash: txHash,
        reward_amount,
        distribution_fee_amount: lovelace_amount,
      });

      const newStatusKey = String(
        res?.body?.topic?.status ?? "DRAFT"
      ).toUpperCase();
      setTooltipText(
        t(statusToTooltipKey[newStatusKey] ?? statusToTooltipKey.DRAFT)
      );

      props.onTopicUpdated?.({
        message: t("topicProposed"),
        updatedTopic: res.body.topic,
        datumHash: res.body.datum_hash,
      });
    } catch (err) {
      console.error("Topic proposal failed:", err);
      props.showToast(t("proposalFailed"), "danger");
      setTooltipText(t(tooltipKey));
    } finally {
      setLoading(false);
    }
  };

  const [tooltipText, setTooltipText] = useState(t(tooltipKey));

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
                  onClick={() => setPublishModalShow(true)}
                  style={{ cursor: "pointer" }}
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
        showToast={props.showToast}
      />
    </Container>
  );
}

export default TopicToolbar;
