

import Container from 'react-bootstrap/Container';
import TopicList from './TopicList'
import { stack as Menu } from 'react-burger-menu'
import { useTranslation } from "react-i18next";

function TopicSidebar(props) {
    const { t } = useTranslation();

    if (!props.userTopics || Object.keys(props.userTopics).length === 0) {
        return <></>
    }


    return (
        <>
            {props.pageWidth >= 1024 ? (
                <div className='Landing-left-column'>
                    <Menu
                        styles={{ bmMenuWrap: { zIndex: !props.showUserTopics ? -1 : 1001 } }}
                        isOpen={props.showUserTopics}
                        customBurgerIcon={<p>🗊 ⟫ </p>}
                        onOpen={() => props.setShowUserTopics(true)}
                        onClose={() => props.setShowUserTopics(false)}

                    >
                        <p className="Landing-topics-title" href="#">🗊 {t('recentTopics')}</p>
                        <Container>
                            <TopicList content={props.userTopics} />
                        </Container>
                    </Menu>
                </div >
            )
                : (
                    <div className='Landing-left-column'>
                        <TopicList content={props.userTopics} />
                    </div>
                )
            }
        </>
    )
}

export default TopicSidebar;