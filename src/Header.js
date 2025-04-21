import './NavigationSidebar.css'
import NavigationSidebar from './NavigationSidebar.js';
import NavBar from './NavBar.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

function Header(props) {
    return (
        <>
            {props.userData && (
                <button className="Navbar-toggle-btn" onClick={() => props.setSidebarOpen(!props.sidebarIsOpen)}>
                    <FontAwesomeIcon icon={faBars} />
                </button>)}
            {props.userData && (<NavigationSidebar isOpen={props.sidebarIsOpen} setIsOpen={props.setSidebarOpen} />)}
            {props.userData && (<NavBar userData={props.userData} setUser={props.setUser} setLoading={props.setLoading} />)}
        </>

    )
}

export default Header;