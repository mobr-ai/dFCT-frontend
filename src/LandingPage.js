import 'bootstrap/dist/css/bootstrap.min.css';
import './LandingPage.css';
import URLCardList from './URLCardList.js';
import TopicList from './TopicList'
import logo from './logo.svg';
import LoadingPage from './LoadingPage';
import StyledDropzone from './StyledDropzone.js'
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import request from 'superagent';
import { useOutletContext, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import ReactTextTransition, { presets } from 'react-text-transition';
import { useLoaderData, Await } from "react-router-dom";
import { Suspense } from 'react';
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
import detector from "i18next-browser-languagedetector";
import translationEN from './locales/en/translation.json';
import translationPT from './locales/pt/translation.json';

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

function LandingPage() {
  const { t } = useTranslation();
  const brandText = ['d-', 'de', 'fact', 'tool']
  const suffixText = ['FCT', 'centralized', '-checking', 'kit']
  const [brandIndex, setBrandIndex] = useState(1)
  const [suffixIndex, setSuffixBrandIndex] = useState(1)
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
  const [user, loading, userTopics, setLoading] = useOutletContext();
  const navigate = useNavigate()
  const { userTopicsPromise } = useLoaderData()


  useEffect(() => {
    setDropMsg(t('welcomeMsg'))

    const intervalId = setInterval(
      () => {
        setBrandIndex((index) => index < brandText.length ? index + 1 : index)
        setSuffixBrandIndex((index) => index < suffixText.length ? index + 1 : index)
      },
      500, // every ms
    );

    return () => clearTimeout(intervalId);
  }, [brandText.length, suffixText.length, setDropMsg, t]);


  const checkTopic = (callback) => {
    if (!topicId) {
      request
        .put('/topic/' + user.id)
        .send({ 'title': 'Topic template' })
        .send({ 'description': 'This is a new topic' })
        .send({ language: i18n.language || window.localStorage.i18nextLng })
        .then(callback, () => showError(t("topicCreationFailed")))
    }
    else {
      callback()
    }
  }

  const handleContextInput = (event) => {
    setProvidedContext(event.target.value);
  }

  const handleURLInput = () => {
    if (document.getElementById('input-url-text').value) {
      const url = { "url": document.getElementById('input-url-text').value, "metadata": "" }

      if (!URL.canParse(url.url)) {
        console.log("Oops, invalid URL: " + url.url)
        document.getElementById('input-url-help-msg').innerText = "Oops, invalid URL"
        setFetching(false)
        return
      }

      const metaSuccess = (res) => {
        url['metadata'] = res.body
        setURLs(urls.concat([url]))
        setShowURLs(true)
        setFetching(false)
      }

      const metaError = (res) => {
        // display error msg
        console.log("Oops, error fetching URL: " + res.status + " (" + res.message + ")")
        document.getElementById('input-url-help-msg').innerText = "Oops, error fetching URL"
        setFetching(false)
      }

      request
        .post('/fetch_url')
        .send({ "url": document.getElementById('input-url-text').value })
        .set('Accept', 'application/json')
        .then(metaSuccess, metaError)

      document.getElementById('input-url-text').value = ""
      document.getElementById('input-url-help-msg').innerText = ""
      setFetching(true)
    }
  }

  const onDropAccepted = (acceptedFiles) => {
    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)

    showError("", true)
    setFiles(files.concat(acceptedFiles))
    // setLoading(true)

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
      }
    }

    function uploadError(res) {
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
    }

    function reqSuccess(res) {
      setDropMsg(t('uploadingFiles'))
      setShowFiles(true)
      setShowProgress(true)
      // setDisableDrop(true)
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

        var req = request.post(file.data.url)
        req.send(postData)
        req.then(uploadSuccess, uploadError);
      })
    }

    function reqError(res) {
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Signed request failed: " + res.status + " (" + res.message + ")")
    }

    function getSignedRequest(res) {
      if (res && !topicId) {
        setTopicId(res.body.topicId)
      }

      // get signed request to S3 service
      const fileArgs = []
      acceptedFiles.forEach(file => {
        if (!file.completed)
          fileArgs.push({ "file": file.name, "type": file.type })
      })

      request
        .post('/sign_s3')
        .send(fileArgs)
        .send({ "topic_id": topicId || res.body.topicId })
        .set('Accept', 'application/json')
        .then(reqSuccess, reqError)
    }

    // create new topic for the content if necessary
    checkTopic(getSignedRequest)
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
        .send({ files: files })
        .send({ urls: urls })
        .send({ topicId: nextTopic })
        .send({ userId: user.id })
        .send({ providedContext: providedContext })
        .send({ language: i18n.language || window.localStorage.i18nextLng })
        .then(waitProcessing, handleError);
    }

    function handleError(res) {
      // display error msg
      showError("Topic (id = " + topicId + ") processing failed. Please try again later.")
      console.log("Topic processing failed: [" + res.status + "] (" + res.message + ")")
    }

    async function waitProcessing(res) {
      var nextProgress = progress
      const topic = res.body
      // const topicId = Object.keys(res.body)[0]
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
          showError("Error retrieving processing progress: " + e.message)
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

      window.scrollTo({ top: 0, behavior: 'auto' });
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

  const showError = (msg = null, clear = false) => {
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
  }

  return (
    <div className="Landing-body" >
      <div className='Landing-middle-column'>
        <div className="Landing-header-top" style={!user ? { position: 'absolute' } : { position: 'relative' }}>
          {loading ? (<img src={logo} className="Landing-logo" alt="logo"></img>) : (<img src={logo} className="Landing-logo-static" alt="logo"></img>)}
          {!user && !loading && (
            <section className="inline Landing-logo-text">
              <ReactTextTransition springConfig={presets.gentle} inline>
                {brandText[brandIndex % brandText.length]}
              </ReactTextTransition>
              {suffixText[suffixIndex % suffixText.length]}
            </section>
          )
          }
        </div>
        {user && (
          <Form.Group className="Landing-input-group mb-3" id="input-form-group">
            <div className="Landing-drop">
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
                <div>
                  <InputGroup className="Landing-input-url mb-3">
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
                <div className="Landing-input">
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
        <Suspense fallback={<LoadingPage type="ring" />}>
          <Await resolve={userTopicsPromise}>
            {
              (userTopics) =>
                userTopics && Object.keys(userTopics).length > 0 && (
                  <div className='Landing-left-column'>
                    <h3>{t('recentTopics')}</h3>
                    <TopicList content={userTopics} />
                  </div>
                )
            }
          </Await>
        </Suspense>
      )}
    </div>
  );
}

export default LandingPage;
