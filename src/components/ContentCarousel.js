import Carousel from 'react-bootstrap/Carousel';
import '../styles/ContentCarousel.css';

function ContentCarousel({ contentList }) {
    const mediaItems = contentList.slice(0, 4);

    const getRandomEffect = () => {
        const effects = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];
        return effects[Math.floor(Math.random() * effects.length)];
    };

    return (
        <Carousel
            fade
            indicators={mediaItems.length > 1}
            controls={mediaItems.length > 1}
            interval={4000}
        >
            {mediaItems.map((item, index) => {
                const isVideo = item.content_type === 'video';
                // const interval = isVideo ? 1000 : 500;
                const effect = isVideo ? '' : getRandomEffect();

                return (
                    <Carousel.Item key={index}>
                        {isVideo ? (
                            <video
                                src={item.local_url}
                                className="d-block w-100"
                                muted
                                autoPlay
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={item.local_url}
                                className={`d-block w-100 ${effect}`}
                                alt={`media-${index}`}
                            />
                        )}
                    </Carousel.Item>
                );
            })}
        </Carousel>
    );
}

export default ContentCarousel;
