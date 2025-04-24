// NavigationSidebar.js
import React from 'react';
import Button from 'react-bootstrap/Button';
import { slide as Menu } from 'react-burger-menu';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMagnifyingGlassArrowRight, faFolderOpen, faCog } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from "react-i18next";
import './styles/NavigationSidebar.css'

function NavigationSidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    if (window.innerWidth < 1024) return null; // Hide on mobile

    return (
        <Menu className="" isOpen={isOpen} customBurgerIcon={false} onStateChange={(state) => setIsOpen(state.isOpen)}>
            <Button
                variant="dark"
                size="md"
                onClick={() => {
                    navigate('/submit');
                    setIsOpen(false);
                }}
            >
                <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} /> {t('verifyContent')}
            </Button>
            <div className="Navbar-topics-title">{t('navigation')}</div>
            <Link onClick={() => { setIsOpen(false) }} to="/" className={`Navbar-item ${location.pathname === '/' ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faHome} /> {t('home')}
            </Link>
            <Link onClick={() => { setIsOpen(false) }} to="/"
                className={`Navbar-item ${location.pathname.includes('/mytopics') ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faFolderOpen} /> {t('myTopics')}
            </Link>
            <Link onClick={() => { setIsOpen(false) }} to="/settings"
                className={`Navbar-item ${location.pathname === '/settings' ? 'active' : ''}`}>
                <FontAwesomeIcon icon={faCog} /> {t('settings')}
            </Link>
        </Menu>
    );
}

export default NavigationSidebar;
