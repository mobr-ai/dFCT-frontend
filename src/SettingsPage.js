// SettingsPage.js
import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import ShareModal from './ShareModal';
import { useOutletContext, useNavigate } from "react-router-dom";
import { Container, Form, Row, Col, Image } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt, faCopy } from '@fortawesome/free-solid-svg-icons';
import avatarImg from "./icons/avatar.png";

function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { user, showToast } = useOutletContext();
    const [language, setLanguage] = useState(i18n.language.split('-')[0]);
    const [showShareModal, setShowShareModal] = useState(false);
    const navigate = useNavigate()

    // Redirect when not logged
    useEffect(() => {
        if (!user) navigate('/')
    }, [user, navigate])

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

    const copyReferralMessage = () => {
        const link = generateReferralLink(user.id);
        const message = `${t('shareMessageIntro')}:\n\n${link}\n\n${t('shareMessageOutro')}`;
        navigator.clipboard.writeText(message)
            .then(() => showToast(t('copiedToClipboard'), 'success'))
            .catch(() => showToast(t('copyFailed'), 'danger'));
    };

    return (
        user && (
            <div className="Settings-body">
                <Container className="Settings-container">
                    <h2 className="Settings-title">{t('settings')}</h2>
                    <div className="Settings-user-box">
                        <Row className="align-items-center">
                            <Col xs={4}>
                                <Image src={user.avatar ? user.avatar : avatarImg} onError={(e) => e.target.src = avatarImg} roundedCircle fluid />
                            </Col>
                            <Col xs={8}>
                                <h5>{user.username}</h5>
                                <p className="mb-1">{user.email}</p>
                                <small className='Settings-referral-row'>
                                    {t('referralLink')}:
                                    <div>
                                        <a
                                            href={generateReferralLink(user.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="Settings-referral-link"
                                        >
                                            {generateReferralLink(user.id)}
                                        </a>
                                    </div>
                                    <div className="Settings-referral-buttons">
                                        <Button size="sm" variant="outline-light" onClick={copyReferralMessage}>
                                            <FontAwesomeIcon icon={faCopy} className="Settings-icon" />
                                            {t('copy')}
                                        </Button>
                                        <Button size="sm" variant="outline-light" onClick={() => setShowShareModal(true)}>
                                            <FontAwesomeIcon icon={faShareAlt} className="Settings-icon" />
                                            {t('share')}
                                        </Button>
                                    </div>
                                </small>
                            </Col>
                        </Row>
                    </div>
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
                <ShareModal
                    show={showShareModal}
                    onHide={() => setShowShareModal(false)}
                    title={t('shareMessageIntro')}
                    hashtags={t('shareMessageOutro').split(/\s+/).map(tag => tag.replace(/^#/, ''))}
                    link={generateReferralLink(user.id)}
                    message={`${t('shareMessageIntro')}:\n\n${generateReferralLink(user.id)}\n\n${t('shareMessageOutro')}`}
                />
            </div>
        ));
}

export default SettingsPage;