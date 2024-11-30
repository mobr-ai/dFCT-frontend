import './TopicBreakdownPage.css'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import { useTranslation } from "react-i18next";

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
    const commonProps = {
        url: window.location.href,
        windowWidth: 640,
        windowHeight: 360,
        hashtags: props.hashtags,
        related: ['@mobrsys'],
        title: t('shareMessage').replace("{}", props.title),
        subject: props.title,
        body: t('shareMessage').replace("{}", props.title)
    }
    const iconSize = 50

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
                            <EmailShareButton {...commonProps}>
                                <EmailIcon size={iconSize} borderRadius={15} />
                                <p>E-mail</p>
                            </EmailShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <TwitterShareButton {...commonProps}>
                                <XIcon size={iconSize} borderRadius={15} />
                                <p>X/Twitter</p>
                            </TwitterShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <WhatsappShareButton {...commonProps}>
                                <WhatsappIcon size={iconSize} borderRadius={15} />
                                <p>WhatsApp</p>
                            </WhatsappShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <TelegramShareButton {...commonProps}>
                                <TelegramIcon size={iconSize} borderRadius={15} />
                                <p>Telegram</p>
                            </TelegramShareButton>
                        </Container>
                    </Col>
                </Row>
                <Row>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <FacebookShareButton {...commonProps}>
                                <FacebookIcon size={iconSize} borderRadius={15} />
                                <p>Facebook</p>
                            </FacebookShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container >
                            <FacebookMessengerShareButton {...commonProps}>
                                <FacebookMessengerIcon size={iconSize} borderRadius={15} />
                                <p>Facebook Messenger</p>
                            </FacebookMessengerShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container>
                            <RedditShareButton {...commonProps}>
                                <RedditIcon size={iconSize} borderRadius={15} />
                                <p>Reddit</p>
                            </RedditShareButton>
                        </Container>
                    </Col>
                    <Col className='Breakdown-share-icon' >
                        <Container>
                            <LineShareButton {...commonProps}>
                                <LineIcon size={iconSize} borderRadius={15} />
                                <p>Line</p>
                            </LineShareButton>
                        </Container>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={props.onHide}>{t('closeButton')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ShareModal;