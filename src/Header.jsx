import './styles/NavigationSidebar.css'
import NavigationSidebar from './components/NavigationSidebar.jsx';
import NavBar from './components/NavBar.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

function Header(props) {
    return (
        <>
            {props.userData && (
                <button className="Navbar-toggle-btn" onClick={() => props.setSidebarOpen(!props.sidebarIsOpen)}>
                    <FontAwesomeIcon icon={faBars} />
                </button>
            )}
            {props.userData && (
                <NavigationSidebar isOpen={props.sidebarIsOpen} setIsOpen={props.setSidebarOpen} />
            )}
            {/* Always show NavBar, even if not logged in */}
            <NavBar userData={props.userData} setUser={props.setUser} setLoading={props.setLoading} />
        </>
    );
}


export default Header;