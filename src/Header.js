import NavBar from './NavBar.js';

function Header(props) {
    return (
        <NavBar userData={props.userData} setUser={props.setUser} />
    )
}

export default Header;