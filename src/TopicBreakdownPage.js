import './TopicBreakdownPage.css'
import { useOutletContext, useLoaderData, useNavigation } from "react-router-dom";

// Topic Component
const Topic = ({ title, description, claimList, contentList }) => {
    return (
        <div className="Breakdown-topic-container">
            <h1>{title}</h1>
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
            <h4>{item.content_title}</h4>
            <p>{item.description}</p>
            <p>Type: {item.content_type}</p>
            {item.content_type === 'image' && (
                <img src={item.content_id} alt={item.content_title} style={{ width: '100%' }} />
            )}
            {item.content_type === 'video' && (
                <video controls>
                    <source src={item.content_id} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            )}
        </div>
    );
};

// Main component
function TopicBreakdownPage() {
    const topicData = JSON.parse(useLoaderData())
    const navigation = useNavigation()

    if (navigation.state === "loading" || !topicData) {
        return <h1>Loading!</h1>;
    }

    return (
        <div className="Breakdown-body">
            <Topic
                title={topicData.title}
                description={topicData.description}
                claimList={topicData.claim_list.replace("{\"", "").replace("\"}", "").split('","')}
                contentList={topicData.content}
            />
        </div>
    );
};


export default TopicBreakdownPage;
