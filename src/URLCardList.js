import './URLCardList.css'
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button'
import { useTranslation } from "react-i18next";

function URLCardList(props) {
    const openInNewTab = (url) => {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
    }

    const truncateString = (string = '', maxLength = 100) => {
        return string.length > maxLength
            ? `${string.substring(0, maxLength)}…`
            : string
    }

    const getHostname = (url) => {
        // use URL constructor and return hostname
        return new URL(url).hostname;
    }

    const removeCard = (url) => {
        let filtered = props.urls.filter((u) => { return !u.url.includes(url) });
        props.setURLs(filtered)
    }

    const URLCard = ({ item }) => {
        const { t } = useTranslation();

        return (
            <Card variant="dark" className="Url-card">
                <Card.Img className="Url-card-img" onClick={() => openInNewTab(item.url)} variant="top" src={item.metadata['og:image'] || (item.metadata['image-array'] ? "data:image/png;base64,".concat(item.metadata['image-array']) : "") || './placeholder.png'} style={(item.metadata['og:image'] || item.metadata['image-array']) ? { opacity: '1' } : { opacity: '0.5' }} alt="Website image or cover" />
                <Card.Body>
                    <Card.Title className="Url-card-title">{getHostname(item.url)}</Card.Title>
                    <Card.Text>
                        {truncateString(item.metadata['og:title'])}
                    </Card.Text>
                    <Button className="Url-card-button" onClick={() => removeCard(item.url)} variant="secondary">{t('removeButton')}</Button>
                </Card.Body>
                <Card.Footer>
                    <small onClick={() => openInNewTab(item.url)} className="text-muted"><i>{item.url}</i></small>
                </Card.Footer>
            </Card>
        )
    };

    return (
        (props && props.urls) && (
            <div className="Url-card-container">
                {props.urls.map((item, _) => (
                    <URLCard item={item} />
                ))}
            </div>
        )
    )
}

export default URLCardList;
