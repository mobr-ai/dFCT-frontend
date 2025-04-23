import '../TopicBreakdownPage.css'
import { useTranslation } from "react-i18next";
import Image from 'react-bootstrap/Image';
import Linkify from "linkify-react";
import Badge from 'react-bootstrap/Badge';

const linkifyOpts = {
    defaultProtocol: "https",
    target: "_blank"
};

// ContentCard Component
const ContentCard = ({ item }) => {
    const { t } = useTranslation();

    return (
        <div className="Breakdown-content-card">
            {/* <h4>{item.content_title}</h4> */}

            {/* <p>Type: {item.content_type}</p> */}
            {item.content_type === 'image' && (
                <a href={item.src_url} target="_blank" rel="noreferrer">
                    <Image
                        src={item.local_url}
                        alt={item.content_title}
                        onError={(e) => e.target.style.display = "none"}
                        className='Breakdown-content-container'
                    />
                </a>
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
            <div className='Breakdown-content-source'>
                <Linkify as="div" options={linkifyOpts}><u>{t('source')}</u>:&nbsp;&nbsp;
                    {
                        item.src_url !== item.local_url ? item.src_url : (item.origins === "Unknown" ? t(item.origins) : item.origins)
                    }
                </Linkify></div>

            <p><Linkify as="div" options={linkifyOpts}>{item.description}</Linkify></p>
            {
                item.output_tags ? (<div className="Breakdown-content-tag-container">{item.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag) => (<div className='Breakdown-topic-claims-tag'><Badge bg="secondary">{t(tag)}</Badge></div>))}</div>) : ""
            }
        </div>
    );
};

// ContentList Component
function ContentList({ content }) {
    const { t } = useTranslation();

    return (
        <div className="Breakdown-content-list">
            <h3>{t('references')}</h3>
            {content.map((item, index) => (
                <ContentCard key={index} item={item} />
            ))}
        </div>
    );
}

export default ContentList;
