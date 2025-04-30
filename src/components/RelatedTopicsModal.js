import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import TopicList from './TopicList';
import './../styles/TopicSubmission.css'


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
            <Modal.Header className='Submission-related-modal-header' closeButton>
                <Modal.Title>{t('relatedTopicsFound')}</Modal.Title>
            </Modal.Header>
            <Modal.Body className='Submission-related-modal-body'>
                <p>{t('relatedTopicsIntro')}</p>
                <TopicList content={topics} type='main' />
                {/* <Row className="gx-3 gy-4">
          {topics.map((topic) => (
            <Col key={topic.id} xs={12} sm={6} md={4}>
              <TopicCard topic={topic} />
            </Col>
          ))}
        </Row> */}
            </Modal.Body>
            <Modal.Footer className='Submission-related-modal-footer'>
                <Button variant="secondary" onClick={onClose}>
                    {t('addMoreFilesButton')}
                </Button>
                <Button variant="primary" onClick={onProceed}>
                    {t('createNewTopicAnyway')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RelatedTopicsModal;
