// SettingsPage.js
import React, { useState, useEffect, useRef } from 'react';
import './styles/SettingsPage.css';
import ShareModal from './components/ShareModal';
import { useOutletContext, useNavigate } from "react-router-dom";
import { Container, Form, Row, Col, Image } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt, faCopy, faPen, faUpload, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useAuthRequest } from './hooks/useAuthRequest';
import { useS3Upload } from './hooks/useS3Upload';
import { resizeImage } from './helpers/resizeImage'; // helper class
import useOnClickOutside from './hooks/useOnClickOutside'; // custom hook
import avatarImg from "./icons/avatar.png";


function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { user, setUser, showToast } = useOutletContext();
    const { authFetch, authRequest } = useAuthRequest(user);
    const { handleUploads } = useS3Upload();
    const [language, setLanguage] = useState(i18n.language.split('-')[0]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [editingUsername, setEditingUsername] = useState(false);
    const [editingAvatar, setEditingAvatar] = useState(false);
    const [newUsername, setNewUsername] = useState(user ? user.username : null);
    const [isSavingUsername, setIsSavingUsername] = useState(false);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const avatarInputRef = useRef(null)
    const parsedSettings = JSON.parse((user && user.settings) ? user.settings : '{}');
    const navigate = useNavigate()
    const usernameRef = useRef(null);

    useOnClickOutside(usernameRef, () => {
        if (editingUsername) {
            if (newUsername !== user.username) {
                saveSettings({
                    ...JSON.parse(user.settings || '{}'),
                    username: newUsername
                });
            }

            setEditingUsername(false);
        }
    });

    // Redirect when not logged
    useEffect(() => {
        if (!user || !user.id || !user.access_token) navigate('/')
    }, [user, navigate])

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsSavingAvatar(true);
            const resizedFile = await resizeImage(file); // resize to 512x512@85% on client-side
            const uploadResult = await handleUploads([resizedFile]);
            const avatarUrl = uploadResult[0].url;

            // update the backend user profile
            saveSettings({ ...JSON.parse(user.settings || '{}'), avatar: avatarUrl });
        } catch (err) {
            showToast({ message: t('avatarUpdateFailed'), type: 'error' });
        } finally {
            setIsSavingAvatar(false);
        }
    };

    const handleLanguageChange = (e) => {
        const selectedLang = e.target.value;
        setLanguage(selectedLang);
        localStorage.setItem('i18nextLng', selectedLang);
        i18n.changeLanguage(selectedLang);
    };

    const handleUsernameSubmit = async () => {
        // 6 to 30 chars; only letters, numbers, underscores, dots 
        // No spaces, emojis, special symbols; starting with letters
        const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9._]{5,29}$/;

        if (newUsername === user.username || !newUsername) return;

        const trimmed = newUsername.trim();

        if (!USERNAME_REGEX.test(trimmed)) {
            showToast(t('invalidUsername'), 'danger');
            return;
        }

        try {
            setIsSavingUsername(true);
            const res = await authRequest.post('/api/validate_username').send({ username: trimmed });
            if (!res.body.available) {
                showToast(t('usernameTaken'), 'danger');
                return;
            }

            await saveSettings({ ...JSON.parse(user.settings || '{}'), username: trimmed });
            setEditingUsername(false);
        } catch (err) {
            console.error(err);
            showToast(t('usernameUpdateFailed'), 'danger');
        } finally {
            setIsSavingUsername(false);
        }
    };

    const deleteAccount = async () => {
        if (!window.confirm(t('confirmAccountDeletion'))) return;
        setIsDeleting(true);
        try {
            const res = await authFetch(`/user/${user.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                localStorage.clear();
                setUser(null);
                navigate('/');
            } else {
                showToast(t('accountDeletionFailed'), 'danger');
            }
        } catch (err) {
            showToast(t('accountDeletionFailed'), 'danger');
        } finally {
            setIsDeleting(false);
        }
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

    async function saveSettings(updatedSettings) {
        if (updatedSettings.username && updatedSettings.username !== user.username) {
            setIsSavingUsername(true);
        }
        if (updatedSettings.avatar && updatedSettings.avatar !== user.avatar) {
            setIsSavingAvatar(true);
        }

        try {
            const response = await authFetch(`/user/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: updatedSettings })
            });
            const data = await response.json();
            console.log(data);
            setUser(prev => ({
                ...prev,
                settings: JSON.stringify(updatedSettings),
                avatar: updatedSettings.avatar ? updatedSettings.avatar : prev.avatar,
                username: updatedSettings.username ? updatedSettings.username : prev.username
            }));

            showToast(t('settingsSaved'), 'success');  // trigger toast when successful
        } catch (error) {
            console.error('Error updating settings:', error);
            showToast(t('settingsFailed'), 'danger')
        } finally {
            if (updatedSettings.username) setIsSavingUsername(false);
            if (updatedSettings.avatar) setIsSavingAvatar(false);
        }
    }

    return (
        user && (
            <div className="Settings-body">
                <Container className="Settings-container">
                    <h2 className="Settings-title">{t('settings')}</h2>
                    <div className="Settings-user-box">
                        <Row className="align-items-center">
                            <Col xs={4}>
                                {/* <Image src={user.avatar ? user.avatar : avatarImg} onError={(e) => e.target.src = avatarImg} roundedCircle fluid /> */}
                                <div
                                    className="Settings-avatar-wrapper"
                                    onMouseEnter={() => setEditingAvatar(true)}
                                    onMouseLeave={() => setEditingAvatar(false)}
                                >
                                    <Image
                                        src={user.avatar ? user.avatar : avatarImg}
                                        alt="Avatar"
                                        className="Settings-avatar-img"
                                        onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                                        onError={(e) => e.target.src = avatarImg}
                                        roundedCircle
                                        fluid
                                    />
                                    {/* {editingAvatar && (<FontAwesomeIcon icon={faUpload} className="Settings-avatar-icon" />)} */}
                                    {isSavingAvatar ? (
                                        <Spinner animation="border" size="sm" className="Settings-avatar-icon" />
                                    ) : editingAvatar && (
                                        <FontAwesomeIcon icon={faUpload} className="Settings-avatar-icon" onClick={() => avatarInputRef.current && avatarInputRef.current.click()} />
                                    )}

                                    <input
                                        type="file"
                                        id="avatarUpload"
                                        ref={avatarInputRef}
                                        style={{ display: "none" }}
                                        accept="image/*"
                                        max-size="5242880"
                                        onChange={handleAvatarChange}
                                    />
                                </div>
                            </Col>
                            <Col xs={8}>
                                <h5>
                                    <div className="Settings-username-wrapper" onClick={() => setEditingUsername(true)} ref={usernameRef}>
                                        {editingUsername ? (
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={(e) => {
                                                    if (e.target.value !== newUsername)
                                                        setNewUsername(e.target.value);
                                                }
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (newUsername !== user.username) {
                                                            handleUsernameSubmit()
                                                        }
                                                    }
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <div onClick={() => setEditingUsername(true)} style={{ cursor: 'pointer' }}>
                                                {user.username || `d-FCT User${user.user_id}`}
                                                {isSavingUsername ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <FontAwesomeIcon icon={faPen} className="Settings-username-icon" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </h5>

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
                        <Form.Group>
                            <Form.Label>{t('llmEngine')}</Form.Label>
                            <Form.Control
                                as="select"
                                value={parsedSettings.llmEngine || ''}
                                onChange={(e) => {
                                    saveSettings({
                                        ...JSON.parse(user.settings || '{}'),
                                        llmEngine: e.target.value
                                    });
                                }}
                            >
                                <option value="">{t('selectAnOption')}</option>
                                <option value="openai">OpenAI</option>
                                <option value="xai">xAI</option>
                                <option value="deepseek" disabled>Deepseek</option>
                                <option value="anthropic" disabled>Anthropic</option>
                                <option value="all" disabled>{t('allEngines')} ({t('premiumOnly')})</option>
                            </Form.Control>
                        </Form.Group>
                    </Form>
                    <div className="mt-4 p-3" style={{ backgroundColor: '#59454d', borderRadius: '6px' }}>
                        <h5 className="text-danger">{t('dangerZone')}</h5>
                        <Button variant="danger" onClick={deleteAccount} disabled={isDeleting}>
                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                            {isDeleting ? t('deleting') : t('deleteAccount')}
                        </Button>
                    </div>
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