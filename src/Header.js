import NavBar from './NavBar.js';

function Header(props) {
    return (
        <NavBar userData={props.userData} setUser={props.setUser} setLoading={props.setLoading} />
    )
}

export default Header;