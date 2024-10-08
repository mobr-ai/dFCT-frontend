import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useGoogleLogin } from '@react-oauth/google';
import { useCallback } from 'react';


function NavBar(props) {
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

    const handleGoogleResponse = async (tokenResponse) => {

        try {
            console.log('Google Response:', tokenResponse);
            const payload = { token: tokenResponse.access_token };
            console.log('Payload to server:', payload);

            const apiResponse = await handleApiRequest('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            console.log('Server Response:', apiResponse);
            props.setUser(apiResponse)

        } catch (err) {
            console.error('Authentication Error:', err);
        }
    };

    const login = useGoogleLogin({
        onSuccess: tokenResponse => {
            handleGoogleResponse(tokenResponse)
        },
    });
    const userMenu = props.userData && (
        <Container id="navbar-user-dropdown-container">
            <Image
                src={props.userData.avatar}
                alt="Profile avatar"
                roundedCircle
                style={{ width: '30px', marginRight: '5px' }}
            />
            {' ' + props.userData.username}
        </Container>
    )
    return (
        <Navbar data-bs-theme="dark" expand="lg" className="bg-body-tertiary justify-content-end" sticky="top">
            <Container>
                <Navbar.Brand href="#home">
                    <img
                        alt=""
                        src="/favicon.png"
                        width="30"
                        height="30"
                        className="d-inline-block align-top"
                    />{' '}
                    d-FCT
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav className="ml-auto">
                        {
                            !props.userData && (
                                <Nav.Link onClick={() => {
                                    props.setLoading(true)
                                    login()
                                }}>Sign in</Nav.Link>
                            )
                        }
                        {
                            props.userData && (
                                <NavDropdown title={userMenu} id="navbar-dropdown">
                                    <NavDropdown.Item onClick={() => props.setUser(null)}>Logout</NavDropdown.Item>
                                    <NavDropdown.Divider />
                                    <NavDropdown.Item>
                                        Preferences
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