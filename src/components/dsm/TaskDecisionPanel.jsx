import { useState } from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Form from "react-bootstrap/Form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsDown, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

export default function TaskDecisionPanel({
  task,
  actionTaskId,
  onComplete,
}) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState("approve");
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const taskId = task?.id ?? task?.task_id ?? task?.taskId;
  const taskType = task?.taskType || task?.task_type || "topic_review";
  const isClaimReview = taskType === "claim_review_curation";

  const titleKey = isClaimReview
    ? "dsm.reviewDecisionTitleClaimReview"
    : "dsm.reviewDecisionTitle";

  const helpKey = isClaimReview
    ? "dsm.reviewDecisionHelpClaimReview"
    : taskType === "contribution_review"
      ? "dsm.reviewDecisionHelpContribution"
      : "dsm.reviewDecisionHelp";

  const approveLabel = t("dsm.approve");
  const rejectLabel = t("dsm.reject");

  const submitLabel = isClaimReview
    ? t("dsm.submitClaimReviewDecision")
    : t("dsm.submitDecision");

  const reasonPlaceholder = isClaimReview
    ? t("dsm.claimReviewReasonPlaceholder")
    : t("dsm.reasonPlaceholder");

  const notesPlaceholder = isClaimReview
    ? t("dsm.claimReviewNotesPlaceholder")
    : t("dsm.notesPlaceholder");

  const isBusy = actionTaskId === taskId;
  const requiresReason = decision === "reject";
  const trimmedReason = reason.trim();
  const reasonInvalid = requiresReason && !trimmedReason;
  const canSubmit = Boolean(taskId) && !isBusy && !reasonInvalid;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (reasonInvalid) {
      setReasonTouched(true);
      return;
    }

    await onComplete?.(taskId, {
      decision,
      reason: trimmedReason,
      notes: notes.trim(),
    });

    setReason("");
    setReasonTouched(false);
    setNotes("");
    setDecision("approve");
  };

  return (
    <Form className="DsmDecisionPanel" onSubmit={handleSubmit}>
      <div className="DsmDecisionPanel-intro">
        <strong>{t(titleKey)}</strong>
        <span>{t(helpKey)}</span>
      </div>

      <Form.Group className="mb-3">
        <Form.Label>{t("dsm.decision")}</Form.Label>
        <ButtonGroup className="DsmDecisionPanel-buttons">
          <Button
            type="button"
            variant={decision === "approve" ? "success" : "outline-success"}
            disabled={isBusy}
            aria-pressed={decision === "approve"}
            onClick={() => {
              setDecision("approve");
              setReasonTouched(false);
            }}
          >
            <FontAwesomeIcon icon={faThumbsUp} /> {approveLabel}
          </Button>
          <Button
            type="button"
            variant={decision === "reject" ? "danger" : "outline-danger"}
            disabled={isBusy}
            aria-pressed={decision === "reject"}
            onClick={() => setDecision("reject")}
          >
            <FontAwesomeIcon icon={faThumbsDown} /> {rejectLabel}
          </Button>
        </ButtonGroup>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>
          {t("dsm.reason")}
          {requiresReason && (
            <span className="DsmDecisionPanel-required">
              {t("dsm.required")}
            </span>
          )}
        </Form.Label>
        <Form.Control
          value={reason}
          required={requiresReason}
          isInvalid={reasonTouched && reasonInvalid}
          disabled={isBusy}
          onBlur={() => setReasonTouched(true)}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim()) {
              setReasonTouched(false);
            }
          }}
          placeholder={reasonPlaceholder}
        />
        <Form.Text className="DsmDecisionPanel-help">
          {t("dsm.reasonHelp")}
        </Form.Text>
        <Form.Control.Feedback type="invalid">
          {t("dsm.reasonRequired")}
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>{t("dsm.notes")}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={notes}
          disabled={isBusy}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={notesPlaceholder}
        />
      </Form.Group>

      <div className="DsmDecisionPanel-submitRow">
        <Button
          type="submit"
          variant={decision === "reject" ? "danger" : "success"}
          disabled={!canSubmit}
        >
          {isBusy ? t("dsm.submittingDecision") : submitLabel}
        </Button>
      </div>
    </Form>
  );
}
