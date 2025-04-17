// SettingsPage.js
import React, { useState } from 'react';
import './SettingsPage.css';
import { useOutletContext } from "react-router-dom";
import { Container, Form, Row, Col, Image } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import avatarImg from "./icons/avatar.png";


function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { user } = useOutletContext();
    const [language, setLanguage] = useState(i18n.language.split('-')[0]);

    const handleLanguageChange = (e) => {
        const selectedLang = e.target.value;
        setLanguage(selectedLang);
        localStorage.setItem('i18nextLng', selectedLang);
        i18n.changeLanguage(selectedLang);
    };

    const encodeBase62 = (num) => {
        const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (num === 0) return BASE62_ALPHABET[0];

        let base62 = '';
        while (num > 0) {
            const remainder = num % 62;
            base62 = BASE62_ALPHABET[remainder] + base62;
            num = Math.floor(num / 62);
        }

        return base62;
    }

    const generateReferralLink = (userId, baseUrl = "https://dfc.to/signup?ref=") => {
        if (typeof userId !== 'number' || userId < 0) {
            throw new Error("userId must be a non-negative integer");
        }
        return `${baseUrl}${encodeBase62(userId)}`;
    }

    return (
        <div className="Settings-body">
            <Container className="Settings-container">
                <h2 style={{ marginBottom: "1.5rem", marginTop: "1rem" }}>{t('settings')}</h2>

                {user && (
                    <div className="Settings-user-box mb-4">
                        <Row className="align-items-center">
                            <Col xs={4}>
                                <Image src={user.avatar ? user.avatar : avatarImg} onError={(e) => e.target.src = avatarImg}
                                    roundedCircle fluid />
                            </Col>
                            <Col xs={8}>
                                <h5>{user.username}</h5>
                                <p className="mb-1">{user.email}</p>
                                <small>
                                    {t('referralLink')}:<br />
                                    <a
                                        href={generateReferralLink(user.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#61dafb', wordBreak: 'break-all' }}
                                    >
                                        {generateReferralLink(user.id)}
                                    </a>
                                </small>
                            </Col>
                        </Row>
                    </div>
                )}
                <Form>
                    <Form.Group controlId="languageSelect" className="mb-3">
                        <Form.Label>{t('languageConf')}</Form.Label>
                        <Form.Select value={language} onChange={handleLanguageChange}>
                            <option value="en">🇺🇸 English (US)</option>
                            <option value="pt">🇧🇷 Português (BR)</option>
                        </Form.Select>
                    </Form.Group>
                </Form>
            </Container>
        </div>
    );
}

export default SettingsPage;
