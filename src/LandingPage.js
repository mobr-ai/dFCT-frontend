import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/LandingPage.css';
import './styles/TopicList.css';
import './styles/NavigationSidebar.css';
import i18n from "i18next";
import { Button, Container } from 'react-bootstrap';
import { useOutletContext, useNavigate, useLoaderData, Await } from "react-router-dom";
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useTranslation, initReactI18next } from "react-i18next";
import ReactTextTransition, { presets } from 'react-text-transition';
import logo from './icons/logo.svg';
import detector from "i18next-browser-languagedetector";
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';
import TopicList from './TopicList.js';
import LoadingPage from './LoadingPage.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlassArrowRight } from '@fortawesome/free-solid-svg-icons';

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translationEN },
      pt: { translation: translationPT }
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

function LandingPage() {
  const { t } = useTranslation();
  const { userTopicsPromise } = useLoaderData()
  const { user, loading } = useOutletContext();
  const brandText = ['d-', 'de', 'fact', 'tool'];
  const suffixText = ['FCT', 'centralized', '-checking', 'kit'];
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState()
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const loadTopics = useCallback(async (newPage) => {
    if (typeof newPage === 'undefined') return;
    setLoadingMore(true)

    try {
      const perPage = window.sessionStorage.getItem("perPage") || 9
      const lang = i18n.language.split('-')[0] || window.localStorage.i18nextLng.split('-')[0]
      const response = await fetch(`/api/user/${user.id}/topics/${lang}/${newPage}/${perPage}`);
      const data = await response.json();

      if (data.topics.length === 0) {
        return
      }

      if (Number(data.page) !== page) {
        setPage(Number(data.page));
        setTopics([...topics, ...data.topics]);
      }
    } catch (error) {
      console.error("Failed to load topics:", error);
    }
    finally {
      setLoadingMore(false);
    }
  }, [setTopics, setPage, user, page, topics]);

  useEffect(() => {
    const scrollElement = document.querySelector('.Landing-middle-column');

    const handleScroll = () => {
      const el = scrollElement || document.documentElement;
      const scrollTop = el.scrollTop || window.scrollY;
      const scrollHeight = el.scrollHeight || document.body.scrollHeight;
      const clientHeight = el.clientHeight || window.innerHeight;

      if (!loadingMore && topics.length < totalTopics && scrollTop + clientHeight >= scrollHeight - 100) {
        loadTopics(page + 1);
      }
    };

    scrollElement?.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    return () => {
      scrollElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [page, topics, totalTopics, loadingMore, loadTopics]);

  useEffect(() => {
    const intervalId = setInterval(
      () => {
        setBrandIndex((index) => index < brandText.length ? index + 1 : index)
        setSuffixBrandIndex((index) => index < suffixText.length ? index + 1 : index)
      },
      600, // every ms
    );

    return () => clearTimeout(intervalId);
  }, [brandText.length, suffixText.length]);

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    dragCounter.current = 0;

    const files = Array.from(event.dataTransfer.files);
    if (files && files.length > 0) {
      navigate('/submit', { state: { files } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current++;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  };

  return (
    <div className="Landing-body">
      <Container
        className='Landing-middle-column' fluid
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onMouseLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="Landing-drag-overlay">
            <div className="Landing-drag-overlay-message">
              <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} className="Landing-drop-icon" />
              <div className="Landing-upload-text">{t('dragAndDropMsg')}</div>
            </div>
          </div>
        )}
        <div className="Landing-header-top" style={!user ? { position: 'absolute' } : { position: 'relative' }}>
          {!user && !loading && (
            <>
              <section>
                <img src={logo} className="Landing-logo-static" alt="logo" />
              </section>
              <section className="inline Landing-logo-text">
                <Container className="Landing-logo-text-transition">
                  <ReactTextTransition springConfig={presets.gentle} inline>
                    {brandText[brandIndex % brandText.length]}
                  </ReactTextTransition>
                  {suffixText[suffixIndex % suffixText.length]}
                </Container>
                <Container className='Landing-signup-login-buttons'>
                  <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>{t('loginButton')}</Button>
                  <Button variant="dark" size="lg" onClick={() => navigate('/signup')}>{t('signUpButton')}</Button>
                </Container>
              </section>
            </>
          )}
        </div>

        {user && (
          <TopicList content={topics} type="main" />
        )}

        {user && (
          <Suspense fallback={<LoadingPage />}>
            <Await resolve={userTopicsPromise}>
              {(userTopics) => {
                if (!topics || topics.length === 0) {
                  setTopics(userTopics.topics);
                  setTotalTopics(userTopics.total);
                }
              }}
            </Await>
          </Suspense>
        )}

        {user && (totalTopics === 0) &&
          (
            <p className="Landing-no-topics-msg">
              <section>
                <img src={logo} className="Landing-logo-static" alt="logo" />
              </section>
              {t('nothingHere')}
              <br />
              <p style={{ marginTop: "1rem" }}><strong>{t('firstSubmission')}</strong></p>
              <br />
              <Button className='Landing-first-submission-btn' variant="dark" size="md" onClick={() => navigate('/submit')}><FontAwesomeIcon icon={faMagnifyingGlassArrowRight} />&nbsp;{t('tryNow')}</Button>
            </p>
          )
        }
        {user && !loading && loadingMore && (
          <LoadingPage
            type="simple"
            style={{ position: "sticky", bottom: "1rem", marginBottom: "2rem", display: "list-item", listStyleType: "disclosure-closed", listStylePosition: "inside" }}
          />
        )}
      </Container>
    </div>
  );
}

export default LandingPage;
