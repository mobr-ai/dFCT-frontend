import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlayCircle, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import './../styles/TopicBreakdownPage.css'
import { useTranslation } from "react-i18next";
import Image from 'react-bootstrap/Image';
import Linkify from "linkify-react";
import Badge from 'react-bootstrap/Badge';

const linkifyOpts = {
    defaultProtocol: "https",
    target: "_blank"
};

const ContentCard = ({ item, innerRef }) => {
    const { t } = useTranslation();
    const [overlayVisible, setOverlayVisible] = useState(true);
    const [isMuted, setIsMuted] = useState(true); // Track mute state
    const [showMuteIcon, setShowMuteIcon] = useState(true); // Control mute icon visibility
    const videoRef = useRef(null);

    const toggleVideo = () => {
        const video = videoRef.current;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation(); // Prevent play/pause toggle
        const video = videoRef.current;
        const newMuted = !video.muted;
        video.muted = newMuted;
        setIsMuted(newMuted);

        if (!newMuted) {
            // Fade out mute icon after 3s if unmuted
            setShowMuteIcon(true);
            setTimeout(() => setShowMuteIcon(false), 3000);
        } else {
            setShowMuteIcon(true); // Keep icon if muted
        }
    };

    const handlePlay = () => {
        setOverlayVisible(false);
        if (!isMuted) {
            // Start fade out when playing unmuted
            setTimeout(() => setShowMuteIcon(false), 3000);
        }
    };

    const handlePause = () => {
        setOverlayVisible(true);
        setShowMuteIcon(true); // Always show icon when paused
    };


    return (
        <div className="Breakdown-content-card" ref={innerRef}>
            {item.content_type === 'image' && (
                <a href={item.src_url} target="_blank" rel="noreferrer">
                    <Image src={item.local_url} alt={item.content_title} className='Breakdown-content-container' />
                </a>
            )}
            {item.content_type === 'video' && (
                <div className="Breakdown-video-wrapper" onClick={toggleVideo}>
                    <video
                        className="Breakdown-content-container"
                        ref={videoRef}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        playsInline
                        muted={isMuted}
                    >
                        <source src={item.local_url} type="video/mp4" />
                    </video>
                    {overlayVisible && (
                        <div className="Breakdown-video-overlay">
                            <FontAwesomeIcon icon={faPlayCircle} size="3x" />
                        </div>
                    )}
                    {showMuteIcon && (
                        <div className="Breakdown-mute-button" onClick={toggleMute}>
                            <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
                        </div>
                    )}
                </div>
            )}
            {item.content_type === 'audio' && (
                <audio className='Breakdown-audio-container' controls>
                    <source src={item.local_url} type="audio/mpeg" />
                </audio>
            )}
            <div className='Breakdown-content-source'>
                <Linkify as="div" options={linkifyOpts}><u>{t('source')}</u>:&nbsp;&nbsp;{item.src_url}</Linkify>
            </div>
            <p><Linkify as="div" options={linkifyOpts}>{item.description}</Linkify></p>
            {item.output_tags && (
                <div className="Breakdown-content-tag-container">
                    {item.output_tags.replaceAll('{', '').replaceAll('"', '').replaceAll('}', '').split(',').map((tag, idx) => (
                        <div key={idx} className='Breakdown-topic-claims-tag'>
                            <Badge bg="secondary">{t(tag)}</Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function ContentList({ content, refsMap }) {
    const { t } = useTranslation();

    return (
        <div className="Breakdown-content-list">
            <h3>{t('references')}</h3>
            {content.map((item, index) => (
                <ContentCard key={index} item={item} innerRef={refsMap[item.local_url]} />
            ))}
        </div>
    );
}

export default ContentList;
