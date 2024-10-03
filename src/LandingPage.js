import './LandingPage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import logo from './logo.svg';
import StyledDropzone from './StyledDropzone.js'
import NavBar from './NavBar.js';
import request from 'superagent';
import React, { useState, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

function LandingPage() {
  const [dropMsg, setDropMsg] = useState("Drop files to analyze, or click to select.")
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [loading, setLoading] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [files, setFiles] = useState([])
  const [disableDrop, setDisableDrop] = useState(false)
  const [progress, setProgress] = useState(10)
  const [user, setUser] = useState(window.sessionStorage.userData ? JSON.parse(window.sessionStorage.userData) : null);
  const [topicId, setTopicId] = useState()
  const [providedContext, setProvidedContext] = useState()

  const handleLoginSuccess = useCallback(userData => {
    setUser(userData);
    window.sessionStorage.setItem("userData", JSON.stringify(userData));

    //TODO: check if we want to fetch user-specific data
  }, [setUser]);

  function showError(msg=null){
    if(msg){
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

  function processTopic(){
      
    function topicProcessError(res){
      // display error msg
      showError("Topic (id = "+topicId+") processing failed. Please try again later.")
      console.log("Topic processing failed: [" + res.status + "] (" + res.message + ")")
    }

    async function waitTopicProcess(res){
      setLoading(true)

      var nextProgress = progress
      const topic = res.body
      // const topicId = Object.keys(res.body)[0]
      const topicURL = res.body['topic_url']
      const checkStatus = (res) => {
        try {
          var p = Number(res.text)
          if(p === -1){
            throw new Error("Could not read metadata")
          }
          setProgress(p)
          nextProgress = p
          console.log("Topic processing progress=" + p)
        }
        catch(e){
          console.log("Error retrieving processing progress: " + e.message)
          setProgress(0)
          nextProgress = -1
          showError("Error retrieving processing progress: " + e.message)
        }
      }

      // request progress and wait for topic to be processed
      while(nextProgress >= 0 && nextProgress < 100){
        // request synchronously to check progress
        await request.post("/check").send(topic).then((res) => checkStatus(res))
      }

      // send user to topic breakdown page
      if(nextProgress == 100){
        setDropMsg("Topic processed successfully")
        setLoading(false)
        window.location.href = topicURL 
      }
    }

    // all files completed
    if(files.filter((f) => f.completed).length === files.length){
      console.log("Upload complete, processing files...")

      setDropMsg("Processing files...")
      setShowFiles(false)
      setShowProgress(true)
      setDisableDrop(true)

      // create request to process content
      request.post("/process")
        .send({files: files})
        .send({topicId: topicId})
        .send({userId: user.id})
        .send({providedContext: providedContext})
        .then(waitTopicProcess, topicProcessError);
    }
  }

  function onDropAccepted(acceptedFiles){
    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length) 

    setFiles(files.concat(acceptedFiles))
    setLoading(true)
    
    function uploadSuccess(res){
      console.log("Upload success: " + res.req._data.get('key') + " [" + res.status + "]")

      const newFiles = acceptedFiles.map((f, i) => {
        if(f.name === res.req._data.get('key')){
          f.completed = true
        }
        return f
      });

      if(newFiles.filter((f) => f.completed).length === newFiles.length){
        // all current files uploaded
        setLoading(false)
        setDropMsg("Add more files or hit 'ANALYZE'")
      }
    }

    function uploadError(res){
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
    }

    function reqSuccess(res){
      setDropMsg("Signed request success, uploading files...")
      setShowFiles(true)
      setShowProgress(false)
      // setDisableDrop(true)
      console.log(dropMsg)

      // upload files directly to s3
      JSON.parse(res.text).forEach(file => { 
        console.log("Uploading " + file.data.fields.key)
        
        // post it as form data
        var postData = new FormData();
        for(var key in file.data.fields){
          postData.append(key, file.data.fields[key]);
        }
        postData.append('file', acceptedFiles.filter((f) => f.name === file.data.fields.key)[0])

        var req = request.post(file.data.url)
        req.send(postData)
        req.then(uploadSuccess, uploadError);
      })
    }
    
    function reqError(res){
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Signed request failed: " + res.status + " (" + res.message + ")")
    }

    function getSignedRequest(res){
      if(!topicId) {
        setTopicId(res.body.topicId)
      }

      // get signed request to S3 service
      const fileArgs = []
      acceptedFiles.forEach(file => {
        if(!file.completed)
          fileArgs.push({"file": file.name, "type": file.type})
      })
      
      request
        .post('/sign_s3')
        .send(fileArgs)
        .send({"topic_id": topicId || res.body.topicId})
        .set('Accept', 'application/json')
        .then(reqSuccess, reqError)
    }

    // create new topic for the content
    if(!topicId){
      request
      .put('/topic/' + user.id)
      .send({'title': 'Topic template'})
      .send({'description': 'This is a new topic'})
      .then(getSignedRequest, () => showError("Oops, failed to create topic."))
    }
    else {
      getSignedRequest()
    }
  }

  const handleTextInput = (event) => {
    setProvidedContext(event.target.value);
  };

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <div className="Landing">
        
        <NavBar userData={user} setUser={handleLoginSuccess}/>
        
        <header className="Landing-header">
          <div className="Landing-header-top">
            {loading ? <img src={logo} className="Landing-logo" alt="logo" /> : <img src={logo} className="Landing-logo-static" alt="logo" />}
          </div>
          <Form.Group className="Landing-input-group mb-3" controlId="input-context">

          {user && (
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
          )}
          {(showFiles && files.length > 0) && (
            <div className="Landing-input">
                <Form.Label><b><i>Optional</i></b>: Claims or information you may want to fact-check</Form.Label>
                <Form.Control as="textarea" onChange={handleTextInput} placeholder='e.g. I came across this viral video claiming a new "turbo diet"' rows={3} />
                <Button 
                  id="input-process-button" 
                  variant="dark" 
                  onClick={!loading ? processTopic : null}
                  disabled={(loading || !(files && files.filter((f) => f.completed).length === files.length))}
                >ANALYZE</Button>
            </div>
          )}
          </Form.Group>
        </header>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LandingPage;
