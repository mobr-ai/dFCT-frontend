// SettingsPage.js
import React, { useState } from 'react';
import './SettingsPage.css';
import { Container, Form, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

function SettingsPage() {
    const { t, i18n } = useTranslation();
    const [language, setLanguage] = useState(i18n.language.split('-')[0]);

    const handleLanguageChange = (e) => {
        const selectedLang = e.target.value;
        setLanguage(selectedLang);
        localStorage.setItem('i18nextLng', selectedLang);
        i18n.changeLanguage(selectedLang);
    };

    return (
        <div className="Settings-body">
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
