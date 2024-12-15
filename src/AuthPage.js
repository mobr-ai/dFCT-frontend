import React from "react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from 'react';
import reactStringReplace from 'react-string-replace';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import { NavLink, useOutletContext } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';


import "./AuthPage.css"
import LoadingPage from "./LoadingPage";


function AuthPage(props) {
    const { t } = useTranslation();
    const [processing,] = useState(false)
    const [email, setEmail] = useState()
    const [pass, setPass] = useState()
    const { handleLogin, setLoading, loading } = useOutletContext();


    const handleAuthStep = () => {
        let newEmail = document.querySelector("#Auth-input-text")?.value
        let newPass = document.querySelector("#Auth-input-password-text")?.value

        if (newEmail && !email)
            setEmail(newEmail)
        if (newPass && !pass)
            setPass(newPass)
    }

    useEffect(() => {
        document.querySelector(".Auth-container").scrollIntoView({ behavior: "smooth", block: "center" })
    }, [email, setEmail])

    const handleApiRequest = useCallback(async (url, options = {}) => {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(props.userData?.token && { 'Authorization': `Bearer ${props.userData.token}` }),
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

                        <h1 className="Auth-title">{props.type === "create" ? t('signUpMsg') : t('loginMsg')}</h1>

                        {!email && (
                            <InputGroup className="Auth-input-email" size="lg">
                                <InputGroup.Text className="Auth-input-label"></InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-text"
                                    className='Auth-email-input'
                                    aria-label="Enter valid e-mail"
                                    aria-describedby="Auth-help-msg"
                                    placeholder={t('mailPlaceholder')}
                                    onFocus={() => { document.getElementById('Auth-input-text').placeholder = '' }}
                                    onBlur={() => document.getElementById('Auth-input-text').placeholder === '' ? document.getElementById('Auth-input-text').placeholder = t('mailPlaceholder') : pass}
                                />
                                <Form.Text id="Auth-help-msg" muted />
                            </InputGroup>
                        )}
                        {email && (
                            <InputGroup className="Auth-input-email-entered" size="lg">
                                <InputGroup.Text className="Auth-input-label" onClick={() => setEmail(null)}></InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-text"
                                    className='Auth-email-input'
                                    aria-label="Enter valid e-mail"
                                    placeholder={email}
                                    readOnly
                                />
                            </InputGroup>
                        )}
                        {email && (
                            <InputGroup className="Auth-input-pass" size="lg">
                                <InputGroup.Text className="Auth-input-label">*</InputGroup.Text>
                                <Form.Control
                                    id="Auth-input-password-text"
                                    className='Auth-password-input'
                                    aria-label="Enter password"
                                    aria-describedby="Auth-help-msg"
                                    type="password"
                                    placeholder="Password"
                                />
                                <Form.Text id="Auth-help-msg" muted />
                            </InputGroup>
                        )}
                        {(email && props.type === 'login') && (<p className="Auth-alternative-link">{t('forgotPass')}</p>)}


                        <Button
                            className="Auth-input-button"
                            variant="dark"
                            size="lg"
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
                            size="lg"
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
