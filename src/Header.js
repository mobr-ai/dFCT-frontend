import './NavigationSidebar.css'
import NavBar from './NavBar.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

function Header(props) {
    return (
        <>
            {props.userData && (<button className="Sidebar-toggle-btn" onClick={() => props.setSidebarOpen(true)}>
                <FontAwesomeIcon icon={faBars} />
            </button>)}
            <NavBar userData={props.userData} setUser={props.setUser} setLoading={props.setLoading} />
        </>

    )
}

export default Header;