import './LandingPage.css';
import { useRouteError } from "react-router-dom";
import logo from './logo.svg';

export default function ErrorPage() {
    const error = useRouteError();
    console.error(error);

    return (
        <div className="Landing Landing-body Error-page d-flex flex-column" id="error-page">
            <div>
                <img src={logo} className="Error-page-logo" alt="logo"></img>
                <p>Oops! Something is wrong</p>
                <i>{error.statusText || error.message} ({error.status})</i>
            </div>
        </div>
    );
}