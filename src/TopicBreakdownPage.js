import './TopicBreakdownPage.css'
import TopicList from './TopicList'
import TopicToolbar from './TopicToolbar';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Accordion from 'react-bootstrap/Accordion';
import LoadingPage from './LoadingPage';
import { useLoaderData, Await, useOutletContext } from "react-router-dom";
import { Suspense } from 'react';
import { useTranslation } from "react-i18next";
import Linkify from "linkify-react";
import { useState, useEffect } from 'react';
import EvidenceModal from './EvidenceModal';

const linkifyOpts = {
    defaultProtocol: "https",
    target: "_blank"
};

function getHashtags(contentList, jsx = false) {
    if (jsx) {
        let tags = contentList.map((c) => { return c.concept_list.replaceAll("'", "").replaceAll("\"", "").replaceAll("}", "").replaceAll("{", "").replaceAll("-", "").split(",").map((s) => { return s.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('') }) })[0]
        return tags.map((tag) => { return (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">#{tag}</Badge></div>) })
    }

    return contentList.map((c) => { return c.concept_list.replaceAll("'", "").replaceAll("\"", "").replaceAll("}", "").replaceAll("{", "").replaceAll("-", "").split(",").map((s) => { return s.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('') }) })
}

// Topic Component
const Topic = ({ title, description, claimList, contentList, user, shareModalShow, setShareModalShow, evidenceModalShow, setEvidenceModalShow }) => {
    const { t } = useTranslation();
    const [evidenceModalTitle, setEvidenceModalTitle] = useState("")
    const [evidenceType, setEvidenceType] = useState()

    const showEvidenceModal = (title, evidenceType) => {
        setEvidenceType(evidenceType)
        setEvidenceModalTitle(title)
        setEvidenceModalShow(true)
    }

    return (
        <div className="Breakdown-topic-container">
            <h1 className='Breakdown-topic-title'>{title}</h1>
            <TopicToolbar user={user} shareModalShow={shareModalShow} setShareModalShow={setShareModalShow} title={title} hashtags={getHashtags(contentList)} />
            <p>{description}</p>
            <p>{getHashtags(contentList, true)}</p>
            <h3>{t('claims')}</h3>
            <ClaimList content={claimList} showEvidenceModal={showEvidenceModal} />
            <ContentList content={contentList} />
            <EvidenceModal
                show={evidenceModalShow}
                title={evidenceModalTitle}
                onHide={() => setEvidenceModalShow(false)}
                type={evidenceType}
            />
        </div>
    );
};

// ClaimList Component
const ClaimList = ({ content, showEvidenceModal }) => {
    return (
        <Accordion className='Breakdown-topic-claims' flush>
            {content.map((item, index) => (
                <ClaimItem index={index} claim={item} showEvidenceModal={showEvidenceModal} />
            ))}
        </Accordion>
    );
};

const ClaimItem = ({ index, claim, showEvidenceModal }) => {
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
                                <Button variant="success" onClick={() => showEvidenceModal(t('addProEvidence'), t('proEvidence'))}>{t('addProEvidence')}</Button>
                                <Button variant="danger" onClick={() => showEvidenceModal(t('addConEvidence'), t('conEvidence'))}>{t('addConEvidence')}</Button>
                            </ButtonGroup>
                        </p>
                    </div>
                </div>
            </Accordion.Body>
        </Accordion.Item>

    )
}

// ContentList Component
const ContentList = ({ content }) => {
    return (
        <div className="Breakdown-content-list">
            {/* <h3>Content</h3> */}
            {content.map((item, index) => (
                <ContentCard key={index} item={item} />
            ))}
        </div>
    );
};

// ContentCard Component
const ContentCard = ({ item }) => {
    const { t } = useTranslation();

    return (
        <div className="Breakdown-content-card">
            {/* <h4>{item.content_title}</h4> */}

            {/* <p>Type: {item.content_type}</p> */}
            {item.content_type === 'image' && (
                <a href={item.src_url} target="_blank" rel="noreferrer"><img src={item.local_url} alt={item.content_title} className='Breakdown-content-container' /></a>
            )}
            {item.content_type === 'video' && (
                <video className='Breakdown-content-container' controls>
                    <source src={item.local_url} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            )}
            {item.content_type === 'audio' && (
                <audio className='Breakdown-audio-container' controls>
                    <source src={item.local_url} type="audio/mpeg" />
                    Your browser does not support the audio tag.
                </audio>
            )}
            <div className='Breakdown-content-source'><Linkify as="div" options={linkifyOpts}><u>{t('source')}</u>:&nbsp;&nbsp;{t(item.origins)}</Linkify></div>

            <p><Linkify as="div" options={linkifyOpts}>{item.description}</Linkify></p>
            {
                item.output_tags ? (<div className="Breakdown-content-tag-container">{item.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag) => (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">{t(tag)}</Badge></div>))}</div>) : ""
            }
        </div>
    );
};

// Main component
function TopicBreakdownPage() {
    const { t } = useTranslation();
    const { topicPromise, userTopicsPromise } = useLoaderData()
    const [user] = useOutletContext();

    const [shareModalShow, setShareModalShow] = useState(false);
    const [evidenceModalShow, setEvidenceModalShow] = useState(false);

    return (
        <div className="Breakdown-body">
            <Suspense fallback={<LoadingPage />}>
                {user && (<div className='Breakdown-left-column'>
                    <h3>{t('recentTopics')}</h3>
                    <Await resolve={userTopicsPromise}>
                        {
                            (userTopics) => <TopicList content={userTopics} />
                        }
                    </Await>
                </div>)}
                <div className='Breakdown-middle-column'>
                    <Await resolve={topicPromise}>
                        {
                            (topicData) =>
                                <Topic
                                    title={JSON.parse(topicData).title}
                                    description={JSON.parse(topicData).description}
                                    claimList={JSON.parse(topicData).claims}
                                    contentList={JSON.parse(topicData).content}
                                    user={user}
                                    shareModalShow={shareModalShow}
                                    setShareModalShow={setShareModalShow}
                                    evidenceModalShow={evidenceModalShow}
                                    setEvidenceModalShow={setEvidenceModalShow}
                                />
                        }
                    </Await>
                </div>
                <div className='Breakdown-right-column'>

                </div>

            </Suspense>
        </div>
    );
};


export default TopicBreakdownPage;
