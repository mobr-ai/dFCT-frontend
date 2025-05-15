import './../styles/TopicList.css'
import Card from 'react-bootstrap/Card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState } from 'react';
import { useAuthRequest } from '../hooks/useAuthRequest';


function TopicList({ content, type, showSideBar }) {
    const [visibleTopics, setVisibleTopics] = useState(content);
    const { user, setLoading } = useOutletContext();
    const { authFetch } = useAuthRequest(user);

    useEffect(() => {
        setVisibleTopics(content);
    }, [content])

    const handleRemove = (id) => {
        const el = document.getElementById(`topic-card-${id}`);
        if (el) {
            el.classList.add('fade-out');
            setTimeout(() => {
                setVisibleTopics(prev => prev.filter(t => t.id !== id));
            }, 400); // matches animation duration
        }
    };

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

    const TopicCard = ({ topic, type, onDelete, key }) => {
        const { t } = useTranslation();
        const navigate = useNavigate();
        const videoRef = useRef(null);
        const location = useLocation();
        const isMyTopicsPage = location.pathname === '/mytopics';

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

        const handleDelete = async () => {
            if (!window.confirm(t('confirmDeleteTopic'))) return;

            try {
                const response = await authFetch(`/topic/${user.id}/${topic.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    onDelete(); // call parent callback to animate removal
                } else {
                    const error = await response.json();
                    alert(error.error || "Error deleting topic");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to delete topic.");
            }
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
            <Card
                id={`topic-card-${topic.id}`}
                variant="dark"
                className={"Topic-card Topic-card-" + type}
                onClick={() => navigate(`/t/${user.id}/${topic.id}`)}
            >
                {isMyTopicsPage && (
                    <button
                        className="Topic-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation(); // prevent triggering card click
                            handleDelete();
                        }}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                )}
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
                        {t('Updated') + " " + (getElapsedTime(topic.updatedAt) === "1s" ? t('moments ago') : getElapsedTime(topic.updatedAt) + " " + t('ago'))}
                    </Card.Subtitle>
                    <Card.Text>{truncateString(topic.description)}</Card.Text>
                </Card.Body>
            </Card>
        );
    };

    return (
        content && (
            <div className={"Topic-list-container-" + type}>
                {visibleTopics.map((topic) => (
                    <TopicCard key={topic.id} type={type} topic={topic} onDelete={() => handleRemove(topic.id)} />
                ))}
            </div>
        )
    );
}

export default TopicList;
