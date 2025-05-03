import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/LandingPage.css';
import './styles/TopicList.css';
import './styles/NavigationSidebar.css';
import i18n from "i18next";
import { Button, Container, Spinner } from 'react-bootstrap';
import { useOutletContext, useNavigate, useLocation, useLoaderData, Await } from "react-router-dom";
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useTranslation, initReactI18next } from "react-i18next";
import ReactTextTransition, { presets } from 'react-text-transition';
import logo from './icons/logo.svg';
import detector from "i18next-browser-languagedetector";
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';
import TopicList from './components/TopicList.js';
import LoadingPage from './LoadingPage.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlassArrowRight, faMagnifyingGlass, faTimes, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { InputGroup, FormControl } from 'react-bootstrap';
import { useAuthRequest } from './hooks/useAuthRequest';


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

function LandingPage(props) {
  const { t } = useTranslation();
  const { userTopicsPromise, allTopicsPromise } = useLoaderData()
  const { user, loading, setLoading } = useOutletContext();
  const { authFetch } = useAuthRequest(user);
  const brandText = ['d-', 'de', 'fact', 'tool'];
  const suffixText = ['FCT', 'centralized', '-checking', 'kit'];
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState()
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollUpButton, setShowScrollUpButton] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const displayedTopics = searching ? searchResults : topics;
  const dragCounter = useRef(0);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('q') ? "#" + params.get('q') : '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();

  // Trigger search when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      setSearching(true);
    }
  }, [initialQuery]);

  const scrollUp = () => {
    document.getElementsByClassName("Landing-middle-column")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementsByClassName("Landing-body")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // const bounceBack = () => {
  //   const scrollElement = document.querySelector('.Landing-middle-column');
  //   if (!scrollElement) return;

  //   scrollElement.scrollBy({
  //     top: -100, // Bounce up 100px
  //     behavior: 'smooth'
  //   });
  // };

  const loadTopics = useCallback(async (newPage) => {
    if (typeof newPage === 'undefined') return;
    setLoadingMore(true)

    try {
      const perPage = window.sessionStorage.getItem("perPage") || 9
      const lang = i18n.language.split('-')[0] || window.localStorage.i18nextLng.split('-')[0]
      var request = ''

      if (props.type === 'user') {
        request = `/api/user/${user.id}/topics/${lang}/${newPage}/${perPage}`
      }
      else if (props.type === 'all') {
        request = `/api/topics/${lang}/${newPage}/${perPage}`
      }

      const response = await authFetch(request, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.topics.length === 0) {
        setShowScrollUpButton(true);
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
  }, [setTopics, setPage, user, page, topics, props.type, authFetch]);

  useEffect(() => {
    const scrollElement = document.querySelector('.Landing-middle-column');

    const handleScroll = () => {
      const scrollElement = document.querySelector('.Landing-middle-column');

      if (!scrollElement) return;

      const nearBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 50;
      const perPage = window.sessionStorage.getItem("perPage") || 9

      if (nearBottom && !loadingMore && !searching) {
        if (page * perPage < totalTopics) {
          const nextPage = page + 1;
          loadTopics(nextPage);
        } else {
          if (!showScrollUpButton) {
            // Only trigger bounce once
            // bounceBack();
            setTimeout(() => {
              setShowScrollUpButton(true);
            }, 500); // Delay showing the button after bounce finishes
          }
        }
      }

      // Show scroll up button if user manually scrolls up
      // if (scrollElement.scrollTop > 300) {
      //   setShowScrollUpButton(true);
      // }
    };


    scrollElement?.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    return () => {
      scrollElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [page, topics, totalTopics, loadingMore, loadTopics, searching, showScrollUpButton]);

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

  const clearSearch = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setSearchQuery('')
    setSearchResults([])
    setTimeout(scrollUp, 500)
  }

  useEffect(() => {
    const fetchTopics = async () => {
      const lang = i18n.language.split('-')[0];
      const query = searchQuery.trim();

      if (query) {
        setSearching(true);
        setSearchLoading(true); // Start loading indicator

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&lang=${lang}`);
        const data = await response.json();

        setSearchResults(data.topics);
        setSearchLoading(false); // End loading after fetch
        setLoading(false)
      } else {
        setSearching(false);
        setSearchResults([]);
        setSearchLoading(false); // No loading when cleared
      }
    };

    const debounceTimeout = setTimeout(() => {
      if (user) fetchTopics();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, user, setLoading]);


  useEffect(() => {
    // Reset when switching between / and /mytopics
    setTopics([]);
    setTotalTopics(0);
    setPage(1);
    setSearching(false);
    // setSearchQuery('');
    setSearchResults([]);
    setLoading(true)
  }, [location.pathname, setLoading]);

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
          {!user && (
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

        {user && (searchResults?.length > 0 || topics?.length > 0) && (
          <div className="Landing-search-sticky">
            <InputGroup className="Landing-search-bar mb-3">
              <FormControl
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery ? (
                searchLoading ? (
                  <Button className='Landing-search-button' variant="outline-secondary" disabled>
                    <Spinner animation="border" size="sm" />
                  </Button>
                ) : (
                  <Button className='Landing-search-button' variant="outline-secondary" onClick={() => clearSearch()}>
                    <FontAwesomeIcon icon={faTimes} />
                  </Button>
                )
              ) : (
                <div className="Landing-search-dummy-button">
                  <Button className='Landing-search-button' variant="outline-secondary" disabled>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </Button>
                </div>
              )}
            </InputGroup>
          </div>
        )}

        {user && !loading && (
          <>
            {!searching && !searchLoading && (<div className='Landing-section-title'><h3>{props.type === 'user' ? t('myTopics') : t('recentTopics')}</h3></div>)}
            <TopicList content={displayedTopics} type="main" />
          </>
        )}

        {user && (
          <Suspense fallback={<LoadingPage />}>
            <Await resolve={searchResults?.length > 0 || props.type === 'user' ? userTopicsPromise : allTopicsPromise}>
              {(loadedTopics) => {
                if (loadedTopics && (!topics || topics.length === 0)) {
                  setTopics(loadedTopics.topics);
                  setTotalTopics(loadedTopics.total);
                  setLoading(false)
                }
              }}
            </Await>
            {user && showScrollUpButton && !loadingMore && !loading && displayedTopics.length > 3 && (
              <Button
                variant="secondary"
                className="Landing-scroll-up"
                onClick={scrollUp}
              >
                <FontAwesomeIcon icon={faArrowUp} />
              </Button>
            )}
          </Suspense>
        )}


        {!loading && user && searching && !searchLoading && searchQuery && searchResults.length === 0 && (
          <p className="Landing-no-results-msg">{t('noResultsFound')}</p>
        )}

        {user && !loading && !searching && !searchQuery && (searchResults.length === 0) && (totalTopics === 0) &&
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
