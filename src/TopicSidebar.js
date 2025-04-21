

import Container from 'react-bootstrap/Container';
import TopicList from './TopicList'
import { stack as Menu } from 'react-burger-menu'
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import './TopicSidebar.css'

function TopicSidebar(props) {
    const { t } = useTranslation();

    if (!props.userTopics || Object.keys(props.userTopics).length === 0) {
        return <></>
    }


    return (
        <>
            {props.pageWidth >= 1024 ? (
                <div className='Sidebar-left-column'>
                    <Menu
                        className={"Sidebar-menu"}
                        styles={{ bmMenuWrap: { zIndex: !props.showUserTopics ? -1 : 1001 } }}
                        isOpen={props.showUserTopics}
                        customBurgerIcon={<FontAwesomeIcon icon={faFolderOpen} />}
                        onOpen={() => props.setShowUserTopics(true)}
                        onClose={() => props.setShowUserTopics(false)}

                    >
                        <p className="Sidebar-topics-title">
                            <FontAwesomeIcon icon={faFolderOpen} style={{ marginRight: '0.5rem' }} />
                            {t('recentTopics')}
                        </p>
                        <Container>
                            <TopicList content={props.userTopics} type="sidebar" showSideBar={props.setShowUserTopics} />
                        </Container>
                    </Menu>
                </div >
            )
                : (
                    <div className='Sidebar-left-column'>
                        <Container><h3>{t('recentTopics')}</h3></Container>
                        <TopicList content={props.userTopics} type="sidebar" />
                    </div>
                )
            }
        </>
    )
}

export default TopicSidebar;