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
        <strong>{t("dsm.reviewDecisionTitle")}</strong>
        <span>{t("dsm.reviewDecisionHelp")}</span>
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
            <FontAwesomeIcon icon={faThumbsUp} /> {t("dsm.approve")}
          </Button>
          <Button
            type="button"
            variant={decision === "reject" ? "danger" : "outline-danger"}
            disabled={isBusy}
            aria-pressed={decision === "reject"}
            onClick={() => setDecision("reject")}
          >
            <FontAwesomeIcon icon={faThumbsDown} /> {t("dsm.reject")}
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
          placeholder={t("dsm.reasonPlaceholder")}
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
          placeholder={t("dsm.notesPlaceholder")}
        />
      </Form.Group>

      <div className="DsmDecisionPanel-submitRow">
        <Button
          type="submit"
          variant={decision === "reject" ? "danger" : "success"}
          disabled={!canSubmit}
        >
          {isBusy ? t("dsm.submittingDecision") : t("dsm.submitDecision")}
        </Button>
      </div>
    </Form>
  );
}
