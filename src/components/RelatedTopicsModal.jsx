import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import TopicList from "./topic/TopicList";
import "./../styles/TopicSubmission.css";

const RelatedTopicsModal = ({ show, onClose, onProceed, topics }) => {
  const { t } = useTranslation();

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      size="lg"
      centered
      dialogClassName="Submission-related-modal-dialog"
      contentClassName="Submission-related-modal-content"
    >
      <Modal.Header className="Submission-related-modal-header">
        <Modal.Title>{t("relatedTopicsFound")}</Modal.Title>
        <button
          type="button"
          className="Submission-related-modal-close"
          onClick={onClose}
          aria-label={t("closeModal")}
        >
          ×
        </button>
      </Modal.Header>
      <Modal.Body className="Submission-related-modal-body">
        <p>{t("relatedTopicsIntro")}</p>
        <TopicList content={topics} type="main" />
      </Modal.Body>
      <Modal.Footer className="Submission-related-modal-footer">
        <Button variant="secondary" onClick={onClose}>
          {t("addMoreFilesButton")}
        </Button>
        <Button variant="primary" onClick={onProceed}>
          {t("createNewTopicAnyway")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RelatedTopicsModal;
