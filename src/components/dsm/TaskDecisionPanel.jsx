import { useState } from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Form from "react-bootstrap/Form";
import { useTranslation } from "react-i18next";

export default function TaskDecisionPanel({
  task,
  actionTaskId,
  onComplete,
}) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState("approve");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const taskId = task?.id ?? task?.task_id ?? task?.taskId;
  const isBusy = actionTaskId === taskId;

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onComplete?.(taskId, {
      decision,
      reason,
      notes,
    });

    setReason("");
    setNotes("");
    setDecision("approve");
  };

  return (
    <Form className="DsmDecisionPanel" onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>{t("dsm.decision")}</Form.Label>
        <ButtonGroup className="DsmDecisionPanel-buttons">
          <Button
            type="button"
            variant={decision === "approve" ? "success" : "outline-success"}
            onClick={() => setDecision("approve")}
          >
            {t("dsm.approve")}
          </Button>
          <Button
            type="button"
            variant={decision === "reject" ? "danger" : "outline-danger"}
            onClick={() => setDecision("reject")}
          >
            {t("dsm.reject")}
          </Button>
        </ButtonGroup>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>{t("dsm.reason")}</Form.Label>
        <Form.Control
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("dsm.reasonPlaceholder")}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>{t("dsm.notes")}</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("dsm.notesPlaceholder")}
        />
      </Form.Group>

      <Button type="submit" variant="primary" disabled={isBusy}>
        {isBusy ? t("dsm.submittingDecision") : t("dsm.submitDecision")}
      </Button>
    </Form>
  );
}
