import './styles/LandingPage.css';
import { useRouteError } from "react-router-dom";
import logo from './icons/logo.svg';
import { useTranslation } from "react-i18next";

export default function ErrorPage() {
    const { t } = useTranslation();
    const error = useRouteError();
    console.error(error);

    return (
        <div className="Landing Landing-body Error-page d-flex flex-column" id="error-page">
            <div>
                <img src={logo} className="Error-page-logo" alt="logo"></img>
                <p>{t('errorMsg')}</p>
                <i>{error.statusText || error.message} ({error.status})</i>
            </div>
        </div>
    );
}