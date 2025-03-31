import './TopicBreakdownPage.css'
import TopicSidebar from './TopicSidebar'
import TopicToolbar from './TopicToolbar';
import EvidenceModal from './EvidenceModal';
import Badge from 'react-bootstrap/Badge';
import LoadingPage from './LoadingPage';
import ContentList from './ContentList';
import ClaimList from './ClaimList';
import { useLoaderData, Await, useOutletContext } from "react-router-dom";
import { Suspense } from 'react';
import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';


function getHashtags(contentList, jsx = false, limit = 5) {
    let tags = [...new Set(contentList.map((c) => { return c.concept_list.replaceAll("'", "").replaceAll("\"", "").replaceAll("}", "").replaceAll("{", "").replaceAll("-", "").split(",").map((s) => { return s.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('') }) }).flat())].slice(0, limit)
    if (jsx) {
        return tags.map((tag) => { return (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">#{tag}</Badge></div>) })
    }
    return tags
}

// Topic Component
const Topic = ({ topicId, title, description, claimList, article, contentList, user, shareModalShow, setShareModalShow, evidenceModalShow, setEvidenceModalShow }) => {
    const { t } = useTranslation();
    const [evidenceModalTitle, setEvidenceModalTitle] = useState(title)
    const [evidenceType, setEvidenceType] = useState()
    const [claimId, setClaimId] = useState()

    const showEvidenceModal = (title, evidenceType, claimId) => {
        setEvidenceType(evidenceType)
        setEvidenceModalTitle(title)
        setClaimId(claimId)
        setEvidenceModalShow(true)
    }

    return (
        <div className="Breakdown-topic-container">
            <h1 className='Breakdown-topic-title'>{title}</h1>
            <TopicToolbar user={user} shareModalShow={shareModalShow} setShareModalShow={setShareModalShow} title={title} hashtags={getHashtags(contentList)} />
            <p>{description}</p>
            <p>{getHashtags(contentList, true, 6)}</p>
            {claimList && claimList.length > 0 && (<h3>{t('claims')}</h3>)}
            <ClaimList content={claimList} showEvidenceModal={showEvidenceModal} topicId={topicId} />
            <div className='Breakdown-topic-article'>{article}</div>
            {contentList && contentList.length > 0 && (<ContentList content={contentList} />)}
            <EvidenceModal
                show={evidenceModalShow}
                title={evidenceModalTitle}
                onHide={() => setEvidenceModalShow(false)}
                type={evidenceType}
                claimId={claimId}
                topicId={topicId}
            />
        </div>
    );
};

// Main page component
function TopicBreakdownPage() {
    const [showUserTopics, setShowUserTopics] = useState(false)
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [shareModalShow, setShareModalShow] = useState(false);
    const [evidenceModalShow, setEvidenceModalShow] = useState(false);
    const { topicPromise, userTopicsPromise } = useLoaderData()
    const { user } = useOutletContext();

    const handleResize = () => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }

    useEffect(() => {
        window.addEventListener("resize", handleResize, false);
    }, [])

    return (
        <div className="Breakdown-body">
            {user && (
                <Suspense>
                    <Await resolve={userTopicsPromise}>
                        {
                            (userTopics) =>
                                <TopicSidebar
                                    userTopics={userTopics}
                                    pageWidth={dimensions.width}
                                    showUserTopics={showUserTopics}
                                    setShowUserTopics={setShowUserTopics}
                                />
                        }
                    </Await>
                </Suspense>
            )}
            <Suspense fallback={<LoadingPage />}>
                <div className='Breakdown-middle-column'>
                    <Await resolve={topicPromise}>
                        {
                            (topicData) =>
                                <Topic
                                    topicId={JSON.parse(topicData).topic_id}
                                    title={JSON.parse(topicData).title}
                                    description={JSON.parse(topicData).description}
                                    claimList={JSON.parse(topicData).claims || []}
                                    article={JSON.parse(topicData).article}
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
