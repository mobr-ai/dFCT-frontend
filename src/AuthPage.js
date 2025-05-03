import React from "react";
import reactStringReplace from 'react-string-replace';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from 'react';
import { NavLink, useOutletContext, useSearchParams } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import "./styles/AuthPage.css"
import LoadingPage from "./LoadingPage";


function AuthPage(props) {
    const { t } = useTranslation();
    const [processing, setProcessing] = useState(false)
    const [email, setEmail] = useState()
    const [pass, setPass] = useState()
    const { handleLogin, setLoading, loading, showToast } = useOutletContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showPassword, setShowPassword] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');



    const handleEmailAuth = async () => {
        const endpoint = props.type === 'create' ? '/api/register' : '/api/login';
        setProcessing(true)
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: pass,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Auth failed: ', errorData.error);
                showToast(t(errorData.error), 'danger')
                setProcessing(false)
                setPass('')
                return;
            }
            const data = await response.json();
            console.log('Auth success:', data);

            // Save token to localStorage or context
            localStorage.setItem('access_token', data.access_token);
            // set user context here if needed
            handleLogin(data);  // if context

        } catch (error) {
            console.error('Auth error:', error);
            if (props.type === 'create')
                showToast(t('registerError'), 'danger')
            else {
                showToast(t('loginError'), 'danger')
            }
            setProcessing(false)
            setPass('')
        }
    };

    const handleAuthStep = () => {
        let newEmail = document.querySelector("#Auth-input-text")?.value
        let newPass = document.querySelector("#Auth-input-password-text")?.value

        if (newEmail && !email)
            setEmail(newEmail)
        if (newPass && !pass)
            setPass(newPass)
    }

    useEffect(() => {
        document.getElementsByClassName("Auth-container")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setLoading(false)
    }, [email, setEmail, setLoading])

    const handleApiRequest = useCallback(async (url, options = {}) => {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(props.userData?.token && { 'Authorization': `Bearer ${props.userData.access_token}` }),
            },
        };

        const finalOptions = { ...defaultOptions, ...options };
        console.log('API Request:', url, finalOptions);

        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }, [props.userData]);

    const handleGoogleResponse = async (tokenResponse, handleLogin) => {

        try {
            console.log('Google Response:', tokenResponse);
            const payload = { token: tokenResponse.access_token };
            console.log('Payload to server:', payload);

            const apiResponse = await handleApiRequest('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            console.log('Server Response:', apiResponse);
            handleLogin(apiResponse)

        } catch (err) {
            console.error('Authentication Error:', err);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: tokenResponse => {
            handleGoogleResponse(tokenResponse, handleLogin)
        },
    });

    useEffect(() => {
        if (email && pass && !processing) {
            handleEmailAuth()
        }
    })

    useEffect(() => {
        if (searchParams.get('sessionExpired') === '1') {
            showToast(t('sessionExpired'), 'secondary');
            // Remove the param so it doesn't trigger again on refresh
            searchParams.delete('sessionExpired');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams, showToast, t]);

    return (
        <Container className="Auth-body-wrapper" fluid>
            {loading && (
                <Container className="Auth-body-wrapper" fluid>
                    <LoadingPage />
                </Container>
            )
            }
            {!loading && (
                <Container className="Auth-container-wrapper" fluid>
                    <Container className="Auth-container">
                        <Image className='Auth-logo' src="./logo512.png" alt="d-FCT logo" />

                        <h2 className="Auth-title">{props.type === "create" ? t('signUpMsg') : t('loginMsg')}</h2>

                        {!email && (
                            <InputGroup className="Auth-input-email" size="md">
                                <InputGroup.Text className="Auth-input-label"></InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-text"
                                    className='Auth-email-input'
                                    aria-label="Enter valid e-mail"
                                    aria-describedby="Auth-help-msg"
                                    placeholder={t('mailPlaceholder')}
                                    onFocus={() => { document.getElementById('Auth-input-text').placeholder = '' }}
                                    onBlur={() => document.getElementById('Auth-input-text').placeholder === '' ? document.getElementById('Auth-input-text').placeholder = t('mailPlaceholder') : pass}
                                    size="md"
                                />
                                <Form.Text id="Auth-help-msg" muted />
                            </InputGroup>
                        )}
                        {email && (
                            <InputGroup className="Auth-input-email-entered" size="md">
                                <InputGroup.Text className="Auth-input-label" onClick={() => setEmail(null)}></InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-text"
                                    className='Auth-email-input'
                                    aria-label="Enter valid e-mail"
                                    placeholder={email}
                                    readOnly
                                    size="md"
                                />
                            </InputGroup>
                        )}
                        {email && (
                            <InputGroup className="Auth-input-pass" size="md">
                                <InputGroup.Text
                                    className="Auth-input-label Auth-password-eye"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <FontAwesomeIcon icon={!showPassword ? faEyeSlash : faEye} />
                                </InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-password-text"
                                    className='Auth-password-input'
                                    aria-label="Enter password"
                                    aria-describedby="Auth-help-msg"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    size="md"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();  // prevent default form submission
                                            setPass(passwordInput);  // commit on Enter
                                        }
                                    }} />
                                <Form.Text id="Auth-help-msg" muted />
                            </InputGroup>
                        )}
                        {(email && props.type === 'login') && (<p className="Auth-alternative-link">{t('forgotPass')}</p>)}

                        <Button
                            className="Auth-input-button"
                            variant="dark"
                            size="md"
                            onClick={!processing ? handleAuthStep : null} disabled={processing}
                        >
                            {processing ? t('processingMail') : t('authNextStep')}
                        </Button>

                        <p>
                            {
                                props.type === "login" ?
                                    (reactStringReplace(t('signUpAlternativeMsg'), "{}", () => (
                                        <NavLink className="Auth-alternative-link" to='/signup'>{t('signUpButton')}</NavLink>))) :
                                    (reactStringReplace(t('loginAlternativeMsg'), "{}", () => (
                                        <NavLink className="Auth-alternative-link" to='/login'>{t('loginButton')}</NavLink>)))
                            }
                        </p>
                        <div className="Auth-divider"><span className="Auth-divider-or">{t('signUpOR')}</span></div>
                        <Button
                            id="Auth-oauth-google"
                            className="Auth-oauth-button"
                            variant="outline-secondary"
                            size="md"
                            onClick={() => {
                                setLoading(true)
                                loginWithGoogle()
                            }}
                        >
                            {t('loginWithGoogle')}
                        </Button>
                    </Container>
                </Container>
            )}
        </Container>
    )
}

export default AuthPage;
