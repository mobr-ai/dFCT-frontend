import '../styles/TopicBreakdownPage.css'
import { useTranslation } from "react-i18next";
import Linkify from "linkify-react";
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Accordion from 'react-bootstrap/Accordion';

const linkifyOpts = {
    defaultProtocol: "https",
    target: "_blank"
};

// ClaimItem Component
const ClaimItem = ({ index, claim, showEvidenceModal, topicId }) => {
    const { t } = useTranslation();

    return (
        <Accordion.Item eventKey={index}>
            <Accordion.Header className='Breakdown-topic-claims-header'><b>{claim.statement}</b></Accordion.Header>
            <Accordion.Body>
                <div className='Breakdown-topic-claims-body'>
                    <div className='Breakdown-claim-evidence'>
                        <Linkify as="p" options={linkifyOpts}>{claim.pro_evidence + " " + claim.con_evidence}</Linkify>
                    </div>
                    {
                        claim.output_tags ? (<div className="Breakdown-content-tag-container">{claim.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag) => (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">{t(tag)}</Badge></div>))}</div>) : ""
                    }
                    <div className='Breakdown-topic-claims-toolbar'>
                        <p>
                            <ButtonGroup size="sm">
                                <Button variant="dark">{t('upVote')}</Button>
                                <Button variant="dark">{t('downVote')}</Button>
                                <Button variant="dark">{t('reviewClaim')}</Button>
                            </ButtonGroup>
                        </p>
                        <p>
                            <ButtonGroup size="sm">
                                <Button variant="success" onClick={() => showEvidenceModal(t('addProEvidence'), 'proEvidence', claim.claim_id)}>{t('addProEvidence')}</Button>
                                <Button variant="danger" onClick={() => showEvidenceModal(t('addConEvidence'), 'conEvidence', claim.claim_id)}>{t('addConEvidence')}</Button>
                            </ButtonGroup>
                        </p>
                    </div>
                </div>
            </Accordion.Body>
        </Accordion.Item>

    )
}

// ClaimList Component
function ClaimList({ content, showEvidenceModal, topicId }) {
    return (
        <Accordion className='Breakdown-topic-claims' flush>
            {content.map((item, index) => (
                <ClaimItem index={index} claim={item} showEvidenceModal={showEvidenceModal} topicId={topicId} />
            ))}
        </Accordion>
    );
}

export default ClaimList;
