import { Modal, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

function numberFrom(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function formatCredits(value) {
  const n = numberFrom(value);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(6).replace(/\.?0+$/, "");
}

function PublishTopicModal({
  show,
  onHide,
  onConfirm,
  billingStatus,
  isPublishing = false,
}) {
  const { t } = useTranslation();

  const access = billingStatus?.access || {};
  const balance = billingStatus?.balance || {};
  const loaded = Boolean(billingStatus?.loaded);
  const apiUnavailable = Boolean(billingStatus?.apiUnavailable);

  const freeTopicsRemaining = numberFrom(
    access.free_topics_remaining,
    access.freeTopicsRemaining,
  );
  const creditBalance = numberFrom(
    balance.credits_available,
    balance.available_credits,
    balance.balance,
    access.credit_balance,
  );
  const publishCost = numberFrom(
    access.topic_publish_credit_cost,
    access.topicPublishCreditCost,
    1,
  );

  const usesFreeQuota = freeTopicsRemaining > 0;
  const canPublish =
    loaded &&
    !apiUnavailable &&
    access.can_publish_topic !== false &&
    (usesFreeQuota || publishCost <= 0 || creditBalance >= publishCost);

  const accessMessage = (() => {
    if (!loaded) return t("publicationAccessLoading");
    if (apiUnavailable) return t("topicPublishAccessUnavailable");
    if (usesFreeQuota) return t("publicationUsesFreeQuota");
    if (canPublish) {
      return t("publicationUsesCredits", {
        count: formatCredits(publishCost),
      });
    }
    return t("publicationInsufficientCredits");
  })();

  const accessVariant = (() => {
    if (!loaded) return "secondary";
    if (apiUnavailable || !canPublish) return "warning";
    return usesFreeQuota ? "success" : "info";
  })();

  const handleSubmit = () => {
    onConfirm?.({
      rewardPoolEnabled: false,
    });
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      scrollable
      centered
      className="PublishTopicModal"
      contentClassName="PublishTopicModal-content"
    >
      <Modal.Header>
        <Modal.Title>{t("confirmPublishTitle")}</Modal.Title>
        <button
          type="button"
          className="PublishTopicModal-close"
          aria-label={t("cancel")}
          onClick={onHide}
          disabled={isPublishing}
        >
          ×
        </button>
      </Modal.Header>

      <Modal.Body>
        <div className={`PublishTopicModal-alert is-${accessVariant}`}>
          {accessMessage}
        </div>

        <div className="PublishTopicModal-accessSummary">
          <div>
            <span>{t("billingAccess.freeTopicsRemaining")}</span>
            <strong>{freeTopicsRemaining}</strong>
          </div>
          <div>
            <span>{t("billingAccess.creditsAvailable")}</span>
            <strong>{formatCredits(creditBalance)} DFCT</strong>
          </div>
          <div>
            <span>{t("publicationCreditCost")}</span>
            <strong>{formatCredits(publishCost)} DFCT</strong>
          </div>
        </div>

        <div className="PublishTopicModal-note">
          <strong>{t("publicationNoWalletRequired")}</strong>
          <span>{t("publicationRewardPoolOptionalText")}</span>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isPublishing}>
          {t("cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canPublish || isPublishing}
        >
          {isPublishing ? t("publishingTopic") : t("confirmPublishButton")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PublishTopicModal;
