import './TopicList.css'
import Card from 'react-bootstrap/Card';
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";


function TopicList({ content }) {
    const { user } = useOutletContext();

    // Create human-readable elapsed timestamps
    const getElapsedTime = (timeStr) => {
        let pubTime = new Date(timeStr);
        let elapsed = Math.round(parseFloat((Date.now() - pubTime.getTime()) / 1000));

        if (elapsed < 1) {
            elapsed = 1;
        }

        if (elapsed >= 60) { //seconds
            elapsed = elapsed / 60; //minutes

            if (elapsed >= 60) {
                elapsed = elapsed / 60; //hours

                if (elapsed >= 24) {
                    elapsed = elapsed / 24; //days

                    if (elapsed >= 31) {
                        elapsed = elapsed / (365 / 12); //months

                        if (elapsed >= 12) {
                            elapsed = elapsed / 12; //years

                            return Math.round(elapsed) + "y"
                        }

                        return Math.round(elapsed) + "mo"
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
        return string.length > maxLength
            ? `${string.substring(0, maxLength)}…`
            : string
    }

    const TopicCard = ({ topic }) => {
        const { t } = useTranslation();

        if (!user || topic.title === "Topic template")
            return null

        return (
            <Card variant="dark" className="Topic-card">
                <Card.Body>
                    <Card.Title className="Topic-card-title">{topic.title}</Card.Title>
                    <Card.Subtitle className="text-muted">{t('Updated') + " " + (getElapsedTime(topic.timestamp) === "1s" ? t('moments ago') : getElapsedTime(topic.timestamp) + " " + t('ago'))}</Card.Subtitle>
                    <Card.Text>
                        {truncateString(topic.description)}
                    </Card.Text>
                    <Card.Link href={"/t/" + user.id + "/" + topic.id} >{t('readTopic')}</Card.Link>
                </Card.Body>
            </Card>
        )
    };

    return (
        content && (
            <div className="Topic-list-container">
                {content.sort(function (x, y) { return new Date(y.timestamp) - new Date(x.timestamp) }).map((item, _) => (
                    <TopicCard topic={item} />
                ))}
            </div>
        )
    )
}

export default TopicList;
