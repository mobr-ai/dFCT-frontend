import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import Row from 'react-bootstrap/Row';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useTranslation } from "react-i18next";
import shareIcon from './icons/share.svg';
import deleteIcon from './icons/delete.svg';
import publishIcon from './icons/publish.svg';
import ShareModal from './ShareModal'

function TopicToolbar(props) {
    const { t } = useTranslation();

    return (
        <Container className='Breakdown-toolbar' fluid>
            <Row>
                {props.user && (<>
                    <Col>
                        <OverlayTrigger
                            key='publish'
                            placement='top'
                            overlay={
                                <Tooltip id={`tooltip-publish`}>
                                    {t('publishTopic')}
                                </Tooltip>
                            }
                        >
                            <Image className='Breakdown-toolbar-icon' src={publishIcon} />
                        </OverlayTrigger>
                    </Col>
                    <Col>
                        <OverlayTrigger
                            key='delete'
                            placement='top'
                            overlay={
                                <Tooltip id={`tooltip-delete`}>
                                    {t('deleteTopic')}
                                </Tooltip>
                            }
                        >
                            <Image className='Breakdown-toolbar-icon' src={deleteIcon} />
                        </OverlayTrigger>
                    </Col>
                </>)}
                <Col>
                    <OverlayTrigger
                        key='share'
                        placement='top'
                        overlay={
                            <Tooltip id={`tooltip-share`}>
                                {t('shareTopic')}
                            </Tooltip>
                        }
                    >
                        <Image className='Breakdown-toolbar-icon' src={shareIcon} onClick={() => props.setModalShow(true)} />
                    </OverlayTrigger>
                </Col>
            </Row>
            <ShareModal
                show={props.modalShow}
                title={props.title}
                hashtags={props.hashtags}
                onHide={() => props.setModalShow(false)}
            />
        </Container>

    );
}

export default TopicToolbar;