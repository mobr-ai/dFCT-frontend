import React, { useState } from 'react';
import logo from './icons/logo.svg';
import './styles/WaitingListPage.css';
import { useTranslation } from "react-i18next";
import request from "superagent"
import { useSearchParams } from 'react-router-dom'
import i18n from "i18next";


const WaitingList = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [success, setSuccess] = useState();
    const [searchParams] = useSearchParams();
    const [ref] = useState(searchParams.get("ref") || "");
    const { t } = useTranslation();

    const reqSuccess = (res) => {
        setSubmitted(true)
        setSuccess(true)
    }

    const reqError = (res) => {
        // Email already on list
        if (res.status === 418) {
            setSubmitted(true)
            setSuccess(null)
        }
        // Other error
        else {
            setSubmitted(true)
            setSuccess(false)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        // Handle form submission (send to backend or mailing list API)
        request
            .post('/wait_list')
            .set('accept', 'json')
            .send({ "email": email, "ref": ref, "language": i18n.language.split('-')[0] })
            .then(reqSuccess, reqError)
    };

    return (
        <div className="WaitingList-body">
            <div className="WaitingList-middle-column">
                {!submitted ? (<img src={logo} className="WaitingList-logo" alt="d-FCT Logo"></img>) : (<img src={logo} className="WaitingList-logo-static" alt="d-FCT Logo"></img>)}

                <h1 className="text-3xl font-semibold">{t('joinWaitList')}</h1>
                <p className="mt-2 text-gray-400">{t('joinWaitListSubtitle')}</p>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="WaitingList-input-form WaitingList-logo-text">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('enterEmailPlaceholder')}
                            className=""
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-secondary btn-lg"
                        >
                            {t('signUpButton')}
                        </button>
                    </form>
                ) : success === true ? (
                    <p className="mt-4">{t('successWaitListMsg')}</p>
                ) : success === false ? (
                    <p className="mt-4">{t('errorWaitListMsg')}</p>
                ) : <p className="mt-4">{t('alreadyOnWaitListMsg')}</p>}
            </div>
        </div>
    );
};

export default WaitingList;
