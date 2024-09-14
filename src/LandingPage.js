import logo from './logo.svg';
import './LandingPage.css';
import StyledDropzone from './StyledDropzone.js'
import request from 'superagent';
import { useState } from 'react';

function LandingPage() {
  const [dropMsg, setDropMsg] = useState("Drop files to verify, or click to select.")
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [showFiles, setShowFiles] = useState(true)


  function onDropAccepted(acceptedFiles){

    console.log("User dropped files = " + acceptedFiles.length)
    
    function uploadSuccess(res){
      console.log("Upload success: " + res.status)
    }

    function uploadError(res){
      // display error msg
      showError("Oops, upload failed. Please try again later.")
      console.log("Upload failed: " + res.status + " (" + res.message + ")")
    }

    function reqSuccess(res){
      setDropMsg("Signed request success, uploading files...")
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

  onDropAccepted.bind(this)

  return (
    <div className="Landing">
      <header className="Landing-header">
        <img src={logo} className="Landing-logo" alt="logo" />

        <div className="Landing-drop">
          <StyledDropzone onDropAccepted={onDropAccepted} msg={dropMsg} showFiles={showFiles} background={dropBackground} border={dropBorder}/>
        </div>
      </header>
    </div>
  );
}

export default LandingPage;
