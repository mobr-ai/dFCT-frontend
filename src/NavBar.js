import './NavBar.css'
import ReactTextTransition, { presets } from 'react-text-transition';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import avatarImg from "./icons/avatar.png";

// const brandText = ['d-F', 'de', 'd-', 'd-F4C'];
// const suffixText = ['CT', 'facto', 'FaCTo', 'T0'];
const brandText = ['d-', 'de', 'fact', 'tool'];
const suffixText = ['FCT', 'centralized', '-checking', 'kit'];

function NavBar(props) {
    const [brandIndex, setBrandIndex] = useState(1);
    const [suffixIndex, setSuffixBrandIndex] = useState(1);
    const navigate = useNavigate()
    const { t } = useTranslation();

    const topClick = useCallback(() => {
        if (window.location.pathname !== '/')
            navigate("/")
        else {
            // document.getElementsByClassName("Topic-list-container")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
            document.getElementsByClassName("bm-menu")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
            document.getElementsByClassName("Landing-middle-column")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
            window.scrollTo({ top: 0, behavior: 'smooth' })
            // props.setShowUserTopics(true)
        }
    }, [navigate])

    useEffect(() => {
        const intervalId = setInterval(
            () => {
                setBrandIndex((index) => index < brandText.length ? index + 1 : index)
                setSuffixBrandIndex((index) => index < suffixText.length ? index + 1 : index)
            },
            600, // every ms
        );

        return () => clearTimeout(intervalId);
    }, []);

    const logout = () => {
        props.setUser(null)
    }

    const login = () => {
        navigate("/login")
    }

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    }

    const userMenu = props.userData && (
        <Container id="navbar-user-dropdown-container">
            <Image
                src={props.userData.avatar ? props.userData.avatar : avatarImg}
                alt="Profile avatar"
                onError={(e) => e.target.src = avatarImg}
                roundedCircle
                style={{ width: '30px', marginRight: '5px' }}
            />
            {' ' + props.userData.username}
        </Container>
    )
    return (
        <Navbar data-bs-theme="dark" expand="lg" className="bg-body-tertiary justify-content-end" sticky="top">
            <Container>
                <Navbar.Brand className="Navbar-brand-container" onClick={topClick}>
                    <img
                        alt=""
                        src="/favicon.png"
                        width="30"
                        height="30"
                        className="d-inline-block align-top Navbar-brand-img"
                    />{' '}
                    {props.userData && (
                        <section className="inline">
                            <ReactTextTransition springConfig={presets.gentle} inline>
                                {brandText[brandIndex % brandText.length]}
                            </ReactTextTransition>
                            {suffixText[suffixIndex % suffixText.length]}
                        </section>
                    )
                    }
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav className="ml-auto">
                        <Nav.Link onClick={() => {
                            window.open('https://drive.google.com/file/d/1_i5sOz7Uxer_Jkd7zBouV1o7iQwHhHxq/view', '_blank')
                        }}>Whitepaper</Nav.Link>
                        {
                            !props.userData && (
                                <Nav.Link onClick={() => {
                                    login()
                                }}>{t('logIn')}</Nav.Link>
                            )
                        }
                        <NavDropdown title={t('language')} id="navbar-dropdown">
                            <NavDropdown.Item onClick={() => changeLanguage('pt')}>
                                🇧🇷 Português (BR) {i18n.language === 'pt' ? <div className="Navbar-checkmark" /> : ''}
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item onClick={() => changeLanguage('en')}>
                                🇺🇸 English (US) {i18n.language === 'en' ? <div className="Navbar-checkmark" /> : ''}
                            </NavDropdown.Item>
                        </NavDropdown>
                        {
                            props.userData && (
                                <NavDropdown title={userMenu} id="navbar-dropdown">
                                    <NavDropdown.Item onClick={logout}>{t('logOut')}</NavDropdown.Item>
                                    <NavDropdown.Divider />
                                    <NavDropdown.Item>
                                        {t('settings')}
                                    </NavDropdown.Item>
                                </NavDropdown>
                            )
                        }
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default NavBar;