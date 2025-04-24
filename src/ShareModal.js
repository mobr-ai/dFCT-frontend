import './styles/ShareModal.css';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';

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
    const { showToast } = useOutletContext()
    const buttonProps = {
        url: props.link ? props.link : window.location.href,
        windowWidth: 640,
        windowHeight: 360,
        hashtags: props.hashtags,
        related: ['@mobrsys'],
        title: props.title ? props.title : t('shareMessage').replace("{}", props.title),
        subject: "d-FCT",
        body: props.message ? props.message : t('shareMessage').replace("{}", props.title)
    }
    const iconProps = {
        size: 50,
        borderRadius: 15
    }

    const copyToClipboard = () => {
        var msg = ""
        if (props.message) {
            msg = props.message
        }
        else {
            msg = t('shareMessage').replace("{}", props.title) + "\n\n" + window.location.href + "\n\n" + props.hashtags.map(tag => `#${tag}`).join(' ');
        }

        navigator.clipboard.writeText(msg)
            .then(() => showToast(t('copiedToClipboard'), 'success'))
            .catch(() => showToast(t('copyFailed'), 'danger'));
    };


    return (
        <>
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
                    <div className="ShareModal-grid-wrapper">
                        <div className="ShareModal-share-icon">
                            <EmailShareButton {...buttonProps}>
                                <EmailIcon {...iconProps} />
                                <p>E-mail</p>
                            </EmailShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <TwitterShareButton {...buttonProps}>
                                <XIcon {...iconProps} />
                                <p>X/Twitter</p>
                            </TwitterShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <WhatsappShareButton {...buttonProps}>
                                <WhatsappIcon {...iconProps} />
                                <p>WhatsApp</p>
                            </WhatsappShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <TelegramShareButton {...buttonProps}>
                                <TelegramIcon {...iconProps} />
                                <p>Telegram</p>
                            </TelegramShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <FacebookShareButton {...buttonProps}>
                                <FacebookIcon {...iconProps} />
                                <p>Facebook</p>
                            </FacebookShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <FacebookMessengerShareButton {...buttonProps}>
                                <FacebookMessengerIcon {...iconProps} />
                                <p>Messenger</p>
                            </FacebookMessengerShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <RedditShareButton {...buttonProps}>
                                <RedditIcon {...iconProps} />
                                <p>Reddit</p>
                            </RedditShareButton>
                        </div>
                        <div className="ShareModal-share-icon">
                            <LineShareButton {...buttonProps}>
                                <LineIcon {...iconProps} />
                                <p>Line</p>
                            </LineShareButton>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={copyToClipboard}>
                        📋 {t('copy')}
                    </Button>
                    <Button onClick={props.onHide}>{t('closeButton')}</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default ShareModal;