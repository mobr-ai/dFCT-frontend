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

function TopicToolbar() {
    const { t } = useTranslation();

    return (
        <Container className='Breakdown-toolbar' fluid>
            <Row>
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
                        key='publish'
                        placement='top'
                        overlay={
                            <Tooltip id={`tooltip-publish`}>
                                {t('deleteTopic')}
                            </Tooltip>
                        }
                    >
                        <Image className='Breakdown-toolbar-icon' src={deleteIcon} />
                    </OverlayTrigger>
                </Col>
                <Col>
                    <OverlayTrigger
                        key='publish'
                        placement='top'
                        overlay={
                            <Tooltip id={`tooltip-publish`}>
                                {t('shareTopic')}
                            </Tooltip>
                        }
                    >
                        <Image className='Breakdown-toolbar-icon' src={shareIcon} />
                    </OverlayTrigger>
                </Col>
            </Row>
        </Container>
    );
}

export default TopicToolbar;