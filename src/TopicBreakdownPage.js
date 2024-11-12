import './TopicBreakdownPage.css'
import TopicList from './TopicList'
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Accordion from 'react-bootstrap/Accordion';
import LoadingPage from './LoadingPage';
import { useLoaderData, Await } from "react-router-dom";
import { Suspense } from 'react';

// Topic Component
const Topic = ({ title, description, claimList, contentList }) => {
    return (
        <div className="Breakdown-topic-container">
            <h1 className='Breakdown-topic-title'>{title}</h1>
            <p>{description}</p>
            <h3>Claims</h3>
            <ClaimList content={claimList} />
            <ContentList content={contentList} />
        </div>
    );
};

// ClaimList Component
const ClaimList = ({ content }) => {
    return (
        <Accordion className='Breakdown-topic-claims' flush>
            {content.map((item, index) => (
                <ClaimItem index={index} claim={item} />
            ))}
        </Accordion>
    );
};

const ClaimItem = ({ index, claim }) => {
    return (
        <Accordion.Item eventKey={index}>
            <Accordion.Header className='Breakdown-topic-claims-header'><b>{claim.statement}</b></Accordion.Header>
            <Accordion.Body>
                <div className='Breakdown-topic-claims-body'>
                    {claim.pro_evidence ? claim.pro_evidence + " " : ""}
                    {claim.con_evidence ? claim.con_evidence : ""}
                    {
                        claim.output_tags ? (<div className="Breakdown-content-tag-container">{claim.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag) => (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">{tag}</Badge></div>))}</div>) : ""
                    }
                    <div className='Breakdown-topic-claims-toolbar'>
                        <ButtonGroup size="sm">
                            <Button variant="dark">▲ Up vote</Button>
                            <Button variant="dark">▼ Down vote</Button>
                            <Button variant="dark">☸ Review</Button>
                        </ButtonGroup>
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
            <p><u>Source</u>: {item.origins}</p>
            <p>{item.description}</p>
            {
                item.output_tags ? (<div className="Breakdown-content-tag-container">{item.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag) => (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">{tag}</Badge></div>))}</div>) : ""
            }
        </div>
    );
};

// Main component
function TopicBreakdownPage() {
    const { topicPromise, userTopicsPromise } = useLoaderData()

    return (
        <div className="Breakdown-body">
            <Suspense fallback={<LoadingPage />}>
                <div className='Breakdown-left-column'>
                    <Await resolve={userTopicsPromise}>
                        {
                            (userTopics) =>
                                <TopicList
                                    content={userTopics}
                                />
                        }
                    </Await>
                </div>
                <div className='Breakdown-middle-column'>
                    <Await resolve={topicPromise}>
                        {
                            (topicData) =>
                                <Topic
                                    title={JSON.parse(topicData).title}
                                    description={JSON.parse(topicData).description}
                                    claimList={JSON.parse(topicData).claims}
                                    contentList={JSON.parse(topicData).content}
                                />
                        }
                    </Await>
                </div>
                {/* <div className='Breakdown-right-column'>

                </div> */}

            </Suspense>
        </div>
    );
};


export default TopicBreakdownPage;
