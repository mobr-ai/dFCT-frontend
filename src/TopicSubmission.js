import 'bootstrap/dist/css/bootstrap.min.css';
import './TopicSubmission.css';
import './TopicList.css';
import './NavigationSidebar.css';
import TopicSidebar from './TopicSidebar.js';
import URLCardList from './URLCardList.js';
import StyledDropzone from './StyledDropzone.js';
import logo from './icons/logo.svg';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import request from 'superagent';
import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';
import { useOutletContext, useLocation, useNavigate, useLoaderData, Await } from "react-router-dom";
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useTranslation, initReactI18next } from "react-i18next";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

i18n
  .use(detector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: translationEN
      },
      pt: {
        translation: translationPT
      }
    },
    // lng: "pt", // do not define the lng option if using language detector
    fallbackLng: "en",

    interpolation: {
      escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    }
  });

function TopicSubmissionPage() {
  const { t } = useTranslation();
  const [disableDrop, setDisableDrop] = useState(false)
  const [dropMsg, setDropMsg] = useState(t('welcomeMsg'))
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [fetching, setFetching] = useState(false)
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(10)
  const [providedContext, setProvidedContext] = useState("")
  const [showFiles, setShowFiles] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showURLs, setShowURLs] = useState(false)
  const [topicId, setTopicId] = useState()
  const [urls, setURLs] = useState([])
  const [showUserTopics, setShowUserTopics] = useState(false)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { user, loading, setLoading, setSidebarOpen } = useOutletContext();
  const navigate = useNavigate()
  const location = useLocation()
  const { userTopicsPromise } = useLoaderData()

  const handleResize = () => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  // Scrolls things up
  const rollUp = useCallback(() => {
    document.getElementsByClassName("bm-menu")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementsByClassName("Submission-middle-column")[0]?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, []);

  // Displays error on drop zone
  const showError = useCallback((msg = null, clear = false) => {
    if (clear) {
      setDropBackground("#37474fff")
      setDropBorder()
      setDropMsg(t('welcomeMsg'))
      return
    }
    if (msg) {
      setDropMsg(msg)
      setFiles([])
    }
    else {
      msg = dropMsg
    }

    setShowFiles(false)
    setShowProgress(false)
    setDropBackground("#ff000045")
    setDropBorder("#eeeeee")
    setDisableDrop(false)
    setLoading(false)
  }, [dropMsg, setLoading, t])

  // Checks if a topic already exists and creat a template if not
  const checkTopic = useCallback(callback => {
    if (!topicId) {
      request
        .put('/topic/' + user.id)
        .send({ 'title': 'Topic template' })
        .send({ 'description': 'This is a new topic' })
        .send({ language: i18n.language.split('-')[0] || window.localStorage.i18nextLng.split('-')[0] })
        .then(callback, () => showError(t("topicCreationFailed")))
    }
    else {
      callback()
    }
  }, [showError, t, topicId, user])

  // Called when user drops new files 
  const onDropAccepted = useCallback(acceptedFiles => {
    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)

    showError("", true)
    setFiles(files.concat(acceptedFiles))
    setLoading(true)

    function uploadSuccess(res) {
      console.log("Upload success: " + res.req._data.get('key') + " [" + res.status + "]")

      const newFiles = acceptedFiles.map((f) => {
        if (f.name === res.req._data.get('key')) {
          f.completed = true
        }
        return f
      });

      if (newFiles.filter((f) => f.completed).length === newFiles.length) {
        // all current files uploaded
        setLoading(false)
        setDropMsg(t('addMoreFiles'))
        // document.querySelector("#input-process-button").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function uploadError(res) {
      // display error msg
      showError(t('uploadFailed'))
      console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
    }

    function reqSuccess(res) {
      setLoading(true)
      setDropMsg(t('uploadingFiles'))
      setShowFiles(true)
      setShowProgress(true)
      console.log(dropMsg)

      // upload files directly to s3
      JSON.parse(res.text).forEach(file => {
        console.log("Uploading " + file.data.fields.key)

        // post it as form data
        var postData = new FormData();
        for (var key in file.data.fields) {
          postData.append(key, file.data.fields[key]);
        }
        postData.append('file', acceptedFiles.filter((f) => f.name === file.data.fields.key)[0])

        request
          .post(file.data.url)
          .send(postData)
          .then(uploadSuccess, uploadError);
      })
    }

    function reqError(res) {
      // display error msg
      showError(t('uploadFailed'))
      console.log("Signed request failed: " + res.status + " (" + res.message + ")")
    }

    function getSignedRequest(res) {
      if (res && !topicId) {
        setTopicId(res.body.topicId)
      }

      // get signed request to S3 service
      const fileArgs = []
      acceptedFiles.forEach(file => {
        if (file.name && file.type && !file.completed)
          fileArgs.push({ "file": file.name, "type": file.type })
      })

      if (fileArgs.length > 0)
        request
          .post('/sign_s3')
          .send(fileArgs)
          .send({ "topic_id": topicId || res.body.topicId })
          .set('Accept', 'application/json')
          .then(reqSuccess, reqError)
    }

    // create new topic for the content if necessary
    checkTopic(getSignedRequest)
  }, [checkTopic, dropMsg, files, setLoading, showError, t, topicId])

  // Handle files passed via navigate()
  useEffect(() => {
    if (location.state?.files && Array.isArray(location.state.files)) {
      const transferredFiles = location.state.files.filter(f => f instanceof File);

      // Checks if transferredFiles are new
      var uniqueNewFiles = transferredFiles.filter(function (file) {
        return !files.some(function (existingFile) {
          return existingFile.name === file.name;
        });
      });

      if (uniqueNewFiles.length > 0) {
        onDropAccepted(uniqueNewFiles)
      }
    }
  }, [location.state, onDropAccepted, files]);

  // Handle resize and redirect when not logged
  useEffect(() => {
    window.addEventListener("resize", handleResize, false);

    if (!user) navigate('/')
  }, [user, navigate])

  useEffect(() => {
    setDropMsg(t('welcomeMsg'))
    rollUp()

    if (document.getElementById('input-url-help-msg'))
      document.getElementById('input-url-help-msg').innerText = ""

  }, [rollUp, setDropMsg, t]);

  const handleContextInput = (event) => {
    setProvidedContext(event.target.value);
  }

  const handleURLInput = () => {
    if (document.getElementById('input-url-text').value) {

      if (!URL.canParse(document.getElementById('input-url-text').value)) {
        console.log("Oops, invalid URL: " + document.getElementById('input-url-text').value)
        document.getElementById('input-url-help-msg').innerText = t('invalidURL')
        setFetching(false)
        return
      }

      const metaSuccess = (res) => {
        let url = { "url": document.getElementById('input-url-text').value, "metadata": res.body }

        setURLs(urls.concat([url]))
        setShowURLs(true)
        setFetching(false)

        // if (document.querySelector("#input-process-button")) document.querySelector("#input-process-button").scrollIntoView({ behavior: "smooth", block: "center" })
        document.getElementById('input-url-text').value = ""
      }

      const metaError = (res) => {
        console.log("Oops, error fetching URL: " + res.status + " (" + res.message + ")")
        document.getElementById('input-url-help-msg').innerText = t('fetchURLError')
        setFetching(false)
        document.getElementById('input-url-text').value = ""
      }

      request
        .post('/fetch_url')
        .send({ "url": document.getElementById('input-url-text').value })
        .set('Accept', 'application/json')
        .then(metaSuccess, metaError)

      document.getElementById('input-url-help-msg').innerText = ""
      setFetching(true)
    }
  }

  const processTopic = () => {

    function requestProcessing(res) {
      var nextTopic = topicId
      if (res && !topicId) {
        nextTopic = res.body.topicId
        setTopicId(res.body.topicId)
      }

      // create request to process content
      request.post("/process")
        .send({
          files: files.map(file => ({
            name: file.name,
            path: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          }))
        })
        .send({ urls: urls })
        .send({ topicId: nextTopic })
        .send({ userId: user.id })
        .send({ providedContext: providedContext })
        .send({ language: i18n.language.split('-')[0] || window.localStorage.i18nextLng.split('-')[0] })
        .then(waitProcessing, handleError);
    }

    function handleError(res) {
      // display error msg
      showError(t('topicCreationFailed'))
      console.log("Topic (id = " + topicId + ") processing failed: [" + res.status + "] (" + res.message + ")")
    }

    async function waitProcessing(res) {
      var nextProgress = progress
      const topic = res.body
      const topicURL = res.body['topic_url']
      const checkStatus = (res) => {
        try {
          var p = Number(res.text)
          if (p === -1) {
            throw new Error("Could not read metadata")
          }
          setProgress(p)
          nextProgress = p
          console.log("Topic processing progress=" + p)
        }
        catch (e) {
          console.log("Error retrieving processing progress: " + e.message)
          setProgress(0)
          nextProgress = -1
          showError(t('topicCreationFailed'))
        }
      }

      // request progress and wait for topic to be processed
      while (nextProgress >= 0 && nextProgress < 100) {
        // request synchronously to check progress
        await request.post("/check").send(topic).then((res) => checkStatus(res))
        await sleep(2000);
      }

      // send user to topic breakdown page
      if (nextProgress === 100) {
        setDropMsg(t('topicProcessed'))
        setLoading(false)
        // react soft navigation
        navigate(topicURL)
      }
    }

    // all files completed
    if (urls.length > 0 || files.filter((f) => f.completed).length === files.length) {
      console.log("All files available, processing content...")

      // window.scrollTo({ top: 0, behavior: 'auto' });
      setDropMsg(t('processingContent'))
      setShowFiles(false)
      setShowURLs(false)
      setShowProgress(true)
      setDisableDrop(true)
      setLoading(true)

      // create new topic if necessary (urls-only case)
      checkTopic(requestProcessing)
    }
  }

  // sleep time expects milliseconds
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  return (
    <div className="Submission-body" >
      {user && (<button className="Sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>
        <FontAwesomeIcon icon={faBars} />
      </button>)}
      <div className='Submission-middle-column'>
        <div className="Submission-header-top">
          {loading && files.length < 2 && (<img src={logo} className="Submission-logo" alt="logo"></img>)}
          {!loading && files.length === 0 && (<img src={logo} className="Submission-logo-static" alt="logo"></img>)}
        </div>
        {user && (
          <Form.Group className="Submission-input-group mb-3" id="input-form-group">
            <div className="Submission-drop">
              <StyledDropzone
                noKeyboard={disableDrop}
                noClick={disableDrop}
                noDrag={disableDrop}
                onDropAccepted={onDropAccepted}
                msg={dropMsg}
                key={dropMsg}
                showFiles={showFiles}
                showProgress={showProgress}
                background={dropBackground}
                border={dropBorder}
                progress={progress}
                files={files}
              />
            </div>
            {!loading && (
              <>
                <div className="Submission-divider"><span className="Submission-divider-or">{t('landingOR')}</span></div>
                <div>
                  <InputGroup className="Submission-input-url mb-3">
                    <InputGroup.Text id="input-url-label">WWW</InputGroup.Text>
                    <Form.Control id="input-url-text" aria-label="Add an URL to be verified" aria-describedby="input-url-help-msg" />
                    <Button
                      id="input-url-button"
                      variant="dark"
                      onClick={!fetching ? handleURLInput : null}
                      disabled={fetching}

                    >{fetching ? t('loadingURL') : t('addURL')}</Button>
                  </InputGroup>
                  <Form.Text id="input-url-help-msg" muted />
                </div>
                <br style={{ clear: "both" }} />
              </>
            )}

            {((showFiles && files.length > 0) || (showURLs && urls.length > 0)) && (
              <>
                <URLCardList setURLs={setURLs} urls={urls} />
                <div className="Submission-input">
                  <Form.Label><b><i>{t('optional')}</i></b>{t('additionalContext')}</Form.Label>
                  <Form.Control id="input-context" as="textarea" onChange={handleContextInput} placeholder={t('claimExample')} rows={3} />
                </div>
                <Button
                  id="input-process-button"
                  variant="dark"
                  onClick={!loading ? processTopic : null}
                  disabled={(loading || !(files && files.filter((f) => f.completed).length === files.length))}
                >{t('analyzeButton')}</Button>
              </>

            )}
          </Form.Group>
        )}
      </div>
      {user && (
        <Suspense>
          <Await resolve={userTopicsPromise}>
            {
              (userTopics) =>
                <TopicSidebar userTopics={userTopics.topics} pageWidth={dimensions.width} showUserTopics={showUserTopics} setShowUserTopics={setShowUserTopics} />
            }
          </Await>
        </Suspense>
      )}
    </div>
  );
}

export default TopicSubmissionPage;
