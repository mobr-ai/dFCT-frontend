// NavigationSidebar.js
import React from 'react';
import { slide as Menu } from 'react-burger-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMagnifyingGlassArrowRight, faFolderOpen, faCog, faBars } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from "react-i18next";
import './NavigationSidebar.css';

function NavigationSidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    if (window.innerWidth < 1024) return null; // Hide on mobile

    const navigateTo = (route) => {
        navigate(route);
        setIsOpen(false);
    };

    return (
        <Menu isOpen={isOpen} customBurgerIcon={false} onStateChange={(state) => setIsOpen(state.isOpen)}>
            <div className="Sidebar-topics-title">{t('navigation')}</div>
            <a className={`menu-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigateTo('/')}>
                <FontAwesomeIcon icon={faHome} /> {t('home')}
            </a>
            <a className={`menu-item ${location.pathname === '/submit' ? 'active' : ''}`} onClick={() => navigateTo('/submit')}>
                <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} /> {t('verifyContent')}
            </a>
            <a className={`menu-item ${location.pathname.includes('/mytopics') ? 'active' : ''}`} onClick={() => navigateTo('/')}>
                <FontAwesomeIcon icon={faFolderOpen} /> {t('myTopics')}
            </a>
            <a className={`menu-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={() => navigateTo('/settings')}>
                <FontAwesomeIcon icon={faCog} /> {t('settings')}
            </a>
        </Menu>
    );
}

export default NavigationSidebar;
