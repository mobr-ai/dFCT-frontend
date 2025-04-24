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
            className='carousel-container'
            fade
            indicators={mediaItems.length > 1}
            controls={mediaItems.length > 1}
            interval={4000}
        >
            {mediaItems.map((item, index) => {
                const isVideo = item.content_type === 'video';
                const isImage = item.content_type === 'image';
                const isAudio = item.content_type === 'audio';
                // const interval = isVideo ? 1000 : 500;
                const effect = isVideo ? '' : getRandomEffect();

                return (
                    <Carousel.Item key={index}>
                        {isVideo && (
                            <video
                                src={item.local_url}
                                className="d-block w-100"
                                muted
                                autoPlay
                                loop
                                playsInline
                            />
                        )}
                        {isImage && (
                            <img
                                src={item.local_url}
                                className={`d-block w-100 ${effect}`}
                                alt={`media-${index}`}
                            />
                        )}
                        {isAudio && (
                            <div className="audio-carousel-item">
                                <audio controls>
                                    <source src={item.local_url} />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                    </Carousel.Item>
                );
            })}
        </Carousel>
    );
}

export default ContentCarousel;
