import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import detector from "i18next-browser-languagedetector";
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';

i18n.use(detector)
    .use(initReactI18next).init({
        resources: {
            en: { translation: translationEN },
            pt: { translation: translationPT }
        },
        // lng: 'en', // do not define the lng option if using language detector
        fallbackLng: 'en',
        interpolation: { escapeValue: false }
    });

export default i18n;