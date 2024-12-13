import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import reactStringReplace from 'react-string-replace';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import { NavLink } from "react-router-dom";

import "./SignUpPage.css"


function SignUpPage(props) {
    const { t } = useTranslation();
    const [processing, setProcessing] = useState(false)

    const handleEmail = () => {
        setProcessing(true)
    }

    useEffect(() => {
        document.querySelector(".SignUp-container").scrollIntoView({ behavior: "smooth", block: "center" })
    }, [])

    return (
        <Container className="SignUp-container-wrapper">
            <Container className="SignUp-container">
                <Image className='SignUp-logo' src="./logo512.png" alt="d-FCT logo" />

                <h1 className="SignUp-title">{props.type === "create" ? t('signUpMsg') : t('loginMsg')}</h1>

                <InputGroup className="SignUp-input-email" size="lg">
                    <InputGroup.Text className="SignUp-input-label">@</InputGroup.Text>
                    <Form.Control
                        id="SignUp-input-text"
                        className='SignUp-email-input'
                        aria-label="Enter valid e-mail"
                        aria-describedby="SignUp-help-msg"
                    />
                    <Form.Text id="SignUp-help-msg" muted />
                </InputGroup>

                <Button
                    className="SignUp-input-email-button"
                    variant="dark"
                    size="lg"
                    onClick={!processing ? handleEmail : null} disabled={processing}
                >
                    {processing ? t('processingMail') : t('enterEmail')}
                </Button>

                <p>
                    {
                        props.type === "login" ?
                            (reactStringReplace(t('signUpAlternativeMsg'), "{}", () => (
                                <NavLink className="SignUp-alternative-link" to='/signup'>{t('signUpButton')}</NavLink>))) :
                            (reactStringReplace(t('loginAlternativeMsg'), "{}", () => (
                                <NavLink className="SignUp-alternative-link" to='/login'>{t('loginButton')}</NavLink>)))
                    }
                </p>
                <div className="SignUp-divider"><span className="SignUp-divider-or">{t('signUpOR')}</span></div>
                <Button
                    id="SignUp-oauth-google"
                    className="SignUp-oauth-button"
                    variant="outline-secondary"
                    size="lg"
                >
                    {t('loginWithGoogle')}
                </Button>
                {/* <Button style={{ backgroundImage: "url('./images/logo.png')", backgroundSize: "cover", width: "40px", height: "40px" }}></Button> */}

                {/* <Image className='SignUp-oauth-google' src="./g.png" alt="Google logo">
                    {t('loginWithGoogle')}
                </Image> */}

            </Container>

        </Container>
    )
}

export default SignUpPage;
