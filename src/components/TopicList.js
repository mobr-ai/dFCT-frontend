import './../styles/TopicList.css'
import Card from 'react-bootstrap/Card';
import { useOutletContext, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRef, useEffect } from 'react';

function TopicList({ content, type, showSideBar }) {
    const { user, setLoading } = useOutletContext();

    const getElapsedTime = (timeStr) => {
        let pubTime = new Date(timeStr);
        let elapsed = Math.round(parseFloat((Date.now() - pubTime.getTime()) / 1000));
        if (elapsed < 1) elapsed = 1;
        if (elapsed >= 60) {
            elapsed = elapsed / 60;
            if (elapsed >= 60) {
                elapsed = elapsed / 60;
                if (elapsed >= 24) {
                    elapsed = elapsed / 24;
                    if (elapsed >= 31) {
                        elapsed = elapsed / (365 / 12);
                        if (elapsed >= 12) return Math.round(elapsed) + "y";
                        return Math.round(elapsed) + "mo";
                    }
                    return Math.round(elapsed) + "d";
                }
                return Math.round(elapsed) + "h";
            }
            return Math.round(elapsed) + "m";
        }
        return elapsed + "s";
    }

    const truncateString = (string = '', maxLength = 200) => {
        return string.length > maxLength ? `${string.substring(0, maxLength)}…` : string;
    }

    const TopicCard = ({ topic, type }) => {
        const { t } = useTranslation();
        const navigate = useNavigate();
        const videoRef = useRef(null);

        const checkContentType = (url) => {
            if (!url) return 'unknown';
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
            const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];
            const extension = url.split('.').pop().toLowerCase().split('?')[0].split('#')[0];
            if (imageExtensions.includes(extension)) return 'image';
            if (videoExtensions.includes(extension)) return 'video';
            return 'unknown';
        };

        const handleClick = () => {
            if (showSideBar) showSideBar(false)
            setLoading(true)
            navigate(`/t/${user.id}/${topic.id}`);
        };

        useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    const video = videoRef.current;
                    if (!video) return;
                    if (entry.isIntersecting) {
                        video.play().catch(() => { });
                    } else {
                        video.pause();
                    }
                },
                { threshold: 0.6 }
            );

            const currentVideo = videoRef.current;
            if (currentVideo) observer.observe(currentVideo);

            return () => {
                if (currentVideo) observer.unobserve(currentVideo);
            };
        }, []);

        if (!user || topic.title === "Topic template") return null;

        return (
            <Card variant="dark" className={"Topic-card Topic-card-" + type}>
                {checkContentType(topic.cover) === 'video' ? (
                    <video
                        ref={videoRef}
                        src={topic.cover}
                        className="Topic-card-img"
                        muted
                        preload="metadata"
                        playsInline
                        onClick={handleClick}
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                    />
                ) : (
                    <Card.Img
                        variant="top"
                        onClick={handleClick}
                        className="Topic-card-img"
                        src={topic.cover || "/placeholder.png"}
                    />
                )}
                <Card.Body>
                    <Card.Title className="Topic-card-title">{topic.title}</Card.Title>
                    <Card.Subtitle className="text-muted">
                        {t('Updated') + " " + (getElapsedTime(topic.timestamp) === "1s" ? t('moments ago') : getElapsedTime(topic.timestamp) + " " + t('ago'))}
                    </Card.Subtitle>
                    <Card.Text>{truncateString(topic.description)}</Card.Text>
                    <Card.Link href={`/t/${user.id}/${topic.id}`}>{t('readTopic')}</Card.Link>
                </Card.Body>
            </Card>
        );
    };

    return (
        content && (
            <div className={"Topic-list-container-" + type}>
                {content.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp)).map((item, index) => (
                    <TopicCard key={index} topic={item} type={type} />
                ))}
            </div>
        )
    );
}

export default TopicList;
