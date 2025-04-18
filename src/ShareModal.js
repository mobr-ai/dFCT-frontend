import './TopicBreakdownPage.css'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import { useTranslation } from "react-i18next";
import { useMatch } from 'react-router-dom';

import {
    EmailIcon,
    EmailShareButton,
    FacebookIcon,
    FacebookMessengerIcon,
    FacebookMessengerShareButton,
    FacebookShareButton,
    LineIcon,
    LineShareButton,
    RedditIcon,
    RedditShareButton,
    TelegramIcon,
    TelegramShareButton,
    TwitterShareButton,
    WhatsappIcon,
    WhatsappShareButton,
    XIcon,
} from "react-share";


function ShareModal(props) {
    const { t } = useTranslation();
    const buttonProps = {
        url: window.location.href,
        windowWidth: 640,
        windowHeight: 360,
        hashtags: props.hashtags,
        related: ['@mobrsys'],
        title: t('shareMessage').replace("{}", props.title),
        subject: props.title,
        body: t('shareMessage').replace("{}", props.title)
    }
    const iconProps = {
        size: 50,
        borderRadius: 15
    }

    const isTopicBreakdown = useMatch('/t/:userId/:topicId');

    const copyToClipboard = () => {
        var msg = props.message || ""
        if (isTopicBreakdown) {
            msg = t('shareMessage').replace("{}", props.title) + "\n\n" + window.location.href + "\n" + props.hashtags.map(tag => `#${tag}`).join(' ');
        }

        navigator.clipboard.writeText(msg).then(() => {
            alert(t('copiedToClipboard'));
        }).catch(() => {
            alert(t('copyFailed'));
        });
    };


    return (
        <Modal
            {...props}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    {t('shareTopicTo')}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <EmailShareButton {...buttonProps}>
                                <EmailIcon {...iconProps} />
                                <p>E-mail</p>
                            </EmailShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <TwitterShareButton {...buttonProps}>
                                <XIcon {...iconProps} />
                                <p>X/Twitter</p>
                            </TwitterShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <WhatsappShareButton {...buttonProps}>
                                <WhatsappIcon {...iconProps} />
                                <p>WhatsApp</p>
                            </WhatsappShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <TelegramShareButton {...buttonProps}>
                                <TelegramIcon {...iconProps} />
                                <p>Telegram</p>
                            </TelegramShareButton>
                        </Container>
                    </Col>
                </Row>
                <Row>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <FacebookShareButton {...buttonProps}>
                                <FacebookIcon {...iconProps} />
                                <p>Facebook</p>
                            </FacebookShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <FacebookMessengerShareButton {...buttonProps}>
                                <FacebookMessengerIcon {...iconProps} />
                                <p>Facebook Messenger</p>
                            </FacebookMessengerShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container>
                            <RedditShareButton {...buttonProps}>
                                <RedditIcon {...iconProps} />
                                <p>Reddit</p>
                            </RedditShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container>
                            <LineShareButton {...buttonProps}>
                                <LineIcon {...iconProps} />
                                <p>Line</p>
                            </LineShareButton>
                        </Container>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={copyToClipboard}>
                    📋 {t('copy')}
                </Button>
                <Button onClick={props.onHide}>{t('closeButton')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ShareModal;