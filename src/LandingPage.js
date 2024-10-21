import './LandingPage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import request from 'superagent';
import React, { useState, useEffect, useCallback } from 'react';
import ReactTextTransition, { presets } from 'react-text-transition';
import { GoogleOAuthProvider } from '@react-oauth/google';
import logo from './logo.svg';
import StyledDropzone from './StyledDropzone.js'
import NavBar from './NavBar.js';

function LandingPage() {
  const welcomeMsg = "Drop files here and/or enter URLs to fact-check"
  const [disableDrop, setDisableDrop] = useState(false)
  const [dropMsg, setDropMsg] = useState(welcomeMsg)
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [fetching, setFetching] = useState(false)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(10)
  const [providedContext, setProvidedContext] = useState("")
  const [showFiles, setShowFiles] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showURLs, setShowURLs] = useState(false)
  const [topicId, setTopicId] = useState()
  const [urls, setURLs] = useState([])
  const [user, setUser] = useState(window.sessionStorage.userData ? JSON.parse(window.sessionStorage.userData) : null);

  const brandText = ['d-', 'de', 'fact', 'tool'];
  const suffixText = ['FCT', 'centralized', '-checking', 'kit'];
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);

  useEffect(() => {
    const intervalId = setInterval(
      () => {
        setBrandIndex((index) => index < brandText.length ? index + 1 : index)
        setSuffixBrandIndex((index) => index < suffixText.length ? index + 1 : index)
      },
      500, // every ms
    );

    return () => clearTimeout(intervalId);
  }, [brandText.length, suffixText.length]);


  const checkTopic = (callback) => {
    if (!topicId) {
      request
        .put('/topic/' + user.id)
        .send({ 'title': 'Topic template' })
        .send({ 'description': 'This is a new topic' })
        .then(callback, () => showError("Oops, failed to create topic."))
    }
    else {
      callback()
    }
  }

  const getHostname = (url) => {
    // use URL constructor and return hostname
    return new URL(url).hostname;
  }

  const handleContextInput = (event) => {
    setProvidedContext(event.target.value);
  }

  const handleLoginSuccess = useCallback(userData => {
    setUser(userData);
    window.sessionStorage.setItem("userData", JSON.stringify(userData));
    setLoading(false)

    //TODO: check if we want to fetch user-specific data
  }, [setUser]);

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
        setDropMsg("Add more files or hit 'ANALYZE'")
      }
    }

    function uploadError(res) {
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
    }

    function reqSuccess(res) {
      setDropMsg("Signed request success, uploading files...")
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

  const openInNewTab = (url) => {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
    if (newWindow) newWindow.opener = null
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
        setDropMsg("Topic processed successfully")
        // setLoading(false)
        window.location.href = topicURL
      }
    }

    // all files completed
    if (urls.length > 0 || files.filter((f) => f.completed).length === files.length) {
      console.log("All files available, processing content...")

      setDropMsg("Processing content...")
      setShowFiles(false)
      setShowURLs(false)
      setShowProgress(true)
      setDisableDrop(true)
      setLoading(true)

      // create new topic if necessary (urls-only case)
      checkTopic(requestProcessing)
    }
  }

  const removeCard = (url) => {
    let filtered = urls.filter((u) => { return !u.url.includes(url) });
    setURLs(filtered)
  }

  // sleep time expects milliseconds
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  const showError = (msg = null, clear = false) => {
    if (clear) {
      setDropBackground("#37474fff")
      setDropBorder()
      setDropMsg(welcomeMsg)
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

    // console.log("Error: " + msg)
  }

  const truncateString = (string = '', maxLength = 100) => {
    return string.length > maxLength
      ? `${string.substring(0, maxLength)}…`
      : string
  }

  const urlCards = urls.map((u) => (
    <Card variant="dark" className="Landing-url-card">
      <Card.Img className="Landing-url-card-img" onClick={() => openInNewTab(u.url)} variant="top" src={u.metadata['og:image'] || './placeholder.png'} style={u.metadata['og:image'] ? { opacity: '1' } : { opacity: '0.5' }} alt="Website image or cover" />
      <Card.Body>
        <Card.Title className="Landing-url-card-title">{getHostname(u.url)}</Card.Title>
        <Card.Text>
          {truncateString(u.metadata['og:title'])}
        </Card.Text>
        <Button className="Landing-url-card-button" onClick={() => removeCard(u.url)} variant="secondary">Remove</Button>
      </Card.Body>
      <Card.Footer>
        <small onClick={() => openInNewTab(u.url)} className="text-muted"><i>{u.url}</i></small>
      </Card.Footer>
    </Card>
  ));

  return (
    <div className="Landing d-flex flex-column">
      <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
        <NavBar userData={user} setUser={handleLoginSuccess} setLoading={setLoading} />

        <div className="Landing-body">
          <main>
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
                    {/* <Form.Text id="landing-input-or-label" muted>
                      AND/OR
                    </Form.Text> */}
                    <div>
                      <InputGroup className="Landing-input-url mb-3">
                        <InputGroup.Text id="input-url-label">WWW</InputGroup.Text>
                        <Form.Control id="input-url-text" aria-label="Add an URL to be verified" aria-describedby="input-url-help-msg" />
                        <Button
                          id="input-url-button"
                          variant="dark"
                          onClick={!fetching ? handleURLInput : null}
                          disabled={fetching}

                        >{fetching ? 'Loading...' : 'Add URL'}</Button>
                      </InputGroup>
                      <Form.Text id="input-url-help-msg" muted />
                    </div>
                    <br style={{ clear: "both" }} />
                  </>
                )}

                {((showFiles && files.length > 0) || (showURLs && urls.length > 0)) && (
                  <>
                    <div className="Landing-url-card-container">{urlCards}</div>
                    <div className="Landing-input">
                      <Form.Label><b><i>Optional</i></b>: Claims or additional information about the files and URLs you want to fact-check</Form.Label>
                      <Form.Control id="input-context" as="textarea" onChange={handleContextInput} placeholder='e.g. I came across this viral video claiming a new "turbo diet"' rows={3} />
                    </div>
                    <Button
                      id="input-process-button"
                      variant="dark"
                      onClick={!loading ? processTopic : null}
                      disabled={(loading || !(files && files.filter((f) => f.completed).length === files.length))}
                    >ANALYZE</Button>
                  </>

                )}
              </Form.Group>
            )}
          </main>
          <footer>

          </footer>
        </div>
      </GoogleOAuthProvider>
    </div>
  );
}

export default LandingPage;
