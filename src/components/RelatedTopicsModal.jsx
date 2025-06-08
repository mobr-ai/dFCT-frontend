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
    >
      <Modal.Header className="Submission-related-modal-header" closeButton>
        <Modal.Title>{t("relatedTopicsFound")}</Modal.Title>
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
