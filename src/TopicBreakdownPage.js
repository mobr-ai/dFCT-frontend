import './TopicBreakdownPage.css'
import logo from './logo.svg';
import { useLoaderData, Await } from "react-router-dom";
import { Suspense } from 'react';

// Topic Component
const Topic = ({ title, description, claimList, contentList }) => {
    return (
        <div className="Breakdown-topic-container">
            <h1 className='Breakdown-topic-title'>{title}</h1>
            <p>{description}</p>
            <h3>Claims</h3>
            <ul>
                {claimList.map((claim, index) => (
                    <li key={index}>{claim}</li>
                ))}
            </ul>
            <ContentList content={contentList} />
        </div>
    );
};

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

// const urlCards = urls.map((u) => (
//     <Card variant="dark" className="Landing-url-card">
//         <Card.Img className="Landing-url-card-img" onClick={() => openInNewTab(u.url)} variant="top" src={u.metadata['og:image'] || './placeholder.png'} style={u.metadata['og:image'] ? { opacity: '1' } : { opacity: '0.5' }} alt="Website image or cover" />
//         <Card.Body>
//             <Card.Title className="Landing-url-card-title">{getHostname(u.url)}</Card.Title>
//             <Card.Text>
//                 {truncateString(u.metadata['og:title'])}
//             </Card.Text>
//             <Button className="Landing-url-card-button" onClick={() => removeCard(u.url)} variant="secondary">Remove</Button>
//         </Card.Body>
//         <Card.Footer>
//             <small onClick={() => openInNewTab(u.url)} className="text-muted"><i>{u.url}</i></small>
//         </Card.Footer>
//     </Card>
// ));

// ContentCard Component
const ContentCard = ({ item }) => {
    return (
        <div className="Breakdown-content-card">
            {/* <h4>{item.content_title}</h4> */}

            {/* <p>Type: {item.content_type}</p> */}
            {item.content_type === 'image' && (
                <a href={item.src_url}><img src={item.local_url} alt={item.content_title} className='Breakdown-content-container' /></a>
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
            <p>{item.description}</p>
        </div>
    );
};

// Main component
function TopicBreakdownPage() {
    const { topicPromise } = useLoaderData()
    // const topicData = JSON.parse(topic)
    // const navigation = useNavigation()
    // const [user, loading, setLoading] = useOutletContext();

    // if (loading || navigation.state === "loading" || !topicData) {
    //     return <div className='loader'>Loading!</h1>;
    // }

    return (
        <div className="Breakdown-body" >
            <Suspense fallback={<img src={logo} className="Breakdown-loading" alt="loading sign"></img>}>
                <Await resolve={topicPromise}>
                    {
                        (topicData) =>
                            <Topic
                                title={JSON.parse(topicData).title}
                                description={JSON.parse(topicData).description}
                                claimList={JSON.parse(topicData).claim_list.replace("{\"", "").replace("\"}", "").split('","')}
                                contentList={JSON.parse(topicData).content}
                            />
                    }
                </Await>
            </Suspense>
        </div>
    );
};


export default TopicBreakdownPage;
