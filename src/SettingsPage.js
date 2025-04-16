// SettingsPage.js
import React, { useState } from 'react';
import './SettingsPage.css';
import { useOutletContext } from "react-router-dom";
import { Container, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { user, setSidebarOpen } = useOutletContext();
    const [language, setLanguage] = useState(i18n.language.split('-')[0]);

    const handleLanguageChange = (e) => {
        const selectedLang = e.target.value;
        setLanguage(selectedLang);
        localStorage.setItem('i18nextLng', selectedLang);
        i18n.changeLanguage(selectedLang);
    };

    return (
        <div className="Settings-body">
            {user && (<button className="Sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>
                <FontAwesomeIcon icon={faBars} />
            </button>)}
            <Container className="Settings-container">
                <h2>{t('settings')}</h2>
                <Form>
                    <Form.Group controlId="languageSelect">
                        <Form.Label>{t('languageConf')}</Form.Label>
                        <Form.Control as="select" value={language} onChange={handleLanguageChange}>
                            <option value="en">🇺🇸 English (US)</option>
                            <option value="pt">🇧🇷 Português (BR)</option>
                        </Form.Control>
                    </Form.Group>

                    {/* expand here with more preferences */}
                </Form>
            </Container>
        </div>
    );
}

export default SettingsPage;
