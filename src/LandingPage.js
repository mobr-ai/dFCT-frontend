import logo from './logo.svg';
import './LandingPage.css';
import StyledDropzone from './StyledDropzone.js'
import request from 'superagent';
import React, { useState } from 'react';
import GoogleAuth from './GoogleAuth';
import { GoogleOAuthProvider } from '@react-oauth/google';

function LandingPage() {
  const [dropMsg, setDropMsg] = useState("Drop files to verify, or click to select.")
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [logoAnimation, setLogoAnimation] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [loading, showLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [disableDrop, setDisableDrop] = useState(false)
  const [progress, setProgress] = useState(10)
  // const pollingInterval = 1000

  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    //TODO: check if we want to fetch user-specific data
  };

  function onDropAccepted(acceptedFiles){
    setFiles(acceptedFiles)
    setLogoAnimation(true)

    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)
    
    function topicProcessError(res){
      // display error msg
      showError("Topic processing failed. Please try again later.")
      console.log("Topic processing failed: [" + res.status + "] (" + res.message + ")")
    }

    async function waitTopicProcess(res){
      var nextProgress = progress
      // const sleep = ms => new Promise(r => setTimeout(r, ms));
      const topic_id = res.body
      const check_status = (res) => {
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
        await request.post("/check").send(topic_id).then((res) => check_status(res))
        // await sleep(pollingInterval)
      }

      // TODO: send user to topic breakdown page
      setDropMsg("Topic processing ended")
      // showLoading(false)
      setLogoAnimation(false)
      // setDisableDrop(true)
    }
    
    function uploadSuccess(res){
      console.log("Upload success: " + res.req._data.get('key') + " [" + res.status + "]")

      const newFiles = acceptedFiles.map((f, i) => {
        if(f.name === res.req._data.get('key')){
          f.completed = true
        }
        return f
      });

      // all files completed
      if(newFiles.filter((f) => f.completed).length === acceptedFiles.length){
        console.log("Upload complete, processing files...")

        setDropMsg("Upload complete, processing files...")
        setShowFiles(false)
        showLoading(true)
        setDisableDrop(true)
        setLogoAnimation(true)

        // create request to process content
        var req = request.post("/process")
        req.send(newFiles)
        req.then(waitTopicProcess, topicProcessError);
      }
      setFiles(newFiles);    
    }

    function uploadError(res){
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
    }

    function reqSuccess(res){
      setDropMsg("Signed request success, uploading files...")
      setShowFiles(true)
      showLoading(false)
      setDisableDrop(true)
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

    function showError(msg=null){
      if(msg){
        setDropMsg(msg)
      }
      else {
        msg = dropMsg
      }
      
      setShowFiles(false)
      setDropBackground("#ff000045")
      setDropBorder("#eeeeee")
      setDisableDrop(false)
      setLogoAnimation(false)
      showLoading(false)

      // console.log("Error: " + msg)
    }
    
    function reqError(res){
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Signed request failed: " + res.status + " (" + res.message + ")")
    }

    // get signed request to S3 service
    const fileArgs = []
    acceptedFiles.forEach(file => {
      fileArgs.push({"file": file.name, "type": file.type})
    })
    
    request
      .post('/sign_s3')
      .send(fileArgs)
      .set('Accept', 'application/json')
      .then(reqSuccess, reqError)
  }

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <div className="Landing">
        <header className="Landing-header">
          {logoAnimation ? <img src={logo} className="Landing-logo" alt="logo" /> : <img src={logo} className="Landing-logo-static" alt="logo" />}

          <GoogleAuth onLoginSuccess={handleLoginSuccess} />

          {user && (
            <div className="Landing-drop">
              <StyledDropzone
                noKeyboard={disableDrop}
                noClick={disableDrop}
                noDrag={disableDrop}
                onDropAccepted={onDropAccepted}
                msg={dropMsg}
                showFiles={showFiles}
                showLoading={loading}
                background={dropBackground}
                border={dropBorder}
                progress={progress}
              />
            </div>
          )}
        </header>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LandingPage;
