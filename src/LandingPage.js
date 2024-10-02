import './LandingPage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from './logo.svg';
import StyledDropzone from './StyledDropzone.js'
import NavBar from './NavBar.js';
import request from 'superagent';
import React, { useState, useCallback } from 'react';
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
  const [user, setUser] = useState(null);


  const handleLoginSuccess = useCallback(userData => {
    setUser(userData);
    //TODO: check if we want to fetch user-specific data
  }, [setUser]);

  function onDropAccepted(acceptedFiles){
    setFiles(acceptedFiles)
    setLogoAnimation(true)
    var topicId

    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)
    
    function topicProcessError(res){
      // display error msg
      showError("Topic processing failed. Please try again later.")
      console.log("Topic processing failed: [" + res.status + "] (" + res.message + ")")
    }

    async function waitTopicProcess(res){
      var nextProgress = progress
      // const sleep = ms => new Promise(r => setTimeout(r, ms));
      const topicId = res.body
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
        await request.post("/check").send(topicId).then((res) => check_status(res))
        // await sleep(pollingInterval)
      }

      // send user to topic breakdown page
      setDropMsg("Topic processed successfully")
      setLogoAnimation(false)
      // return redirect('/topic/' + user.id + "/" + topicId)
      // this.props.history.push('/topic/' + user.id + "/" + topicId)
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
        request.post("/process")
          .send({files: newFiles})
          .send({topicId: topicId})
          .send({userId: user.id})
          .then(waitTopicProcess, topicProcessError);
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

    function getSignedRequest(res){
      topicId = res.body.topicId

      // get signed request to S3 service
      const fileArgs = []
      acceptedFiles.forEach(file => {
        fileArgs.push({"file": file.name, "type": file.type})
      })
      
      request
        .post('/sign_s3')
        .send(fileArgs)
        .send({"topic_id": topicId})
        .set('Accept', 'application/json')
        .then(reqSuccess, reqError)
    }


    // create new topic for the content
    request
      .put('/topic/' + user.id)
      .send({'title': 'Topic template'})
      .send({'description': 'This is a new topic'})
      .then(getSignedRequest, () => showError("Oops, failed to create topic."))
  }

  return (
    <GoogleOAuthProvider clientId="929889600149-2qik7i9dn76tr2lu78bc9m05ns27kmag.apps.googleusercontent.com">
      <div className="Landing">
        
        <NavBar userData={user} setUser={handleLoginSuccess}/>
        
        <header className="Landing-header">
          {logoAnimation ? <img src={logo} className="Landing-logo" alt="logo" /> : <img src={logo} className="Landing-logo-static" alt="logo" />}

          {/* <GoogleAuth onLoginSuccess={handleLoginSuccess} /> */}

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
