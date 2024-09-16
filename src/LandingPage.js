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
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [disableDrop, setDisableDrop] = useState(false)


  function onDropAccepted(acceptedFiles){
    setFiles(acceptedFiles)

    console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)
    
    function uploadSuccess(res){
      console.log("Upload success: " + res.req._data.get('key') + " [" + res.status + "]")

      const newFiles = acceptedFiles.map((f, i) => {
        if(f.name === res.req._data.get('key')){
          f.completed = true
        }
        return f
      });
      if(newFiles.filter((f) => f.completed).length === acceptedFiles.length){
        setDropMsg("Upload complete, processing files...")
        console.log(dropMsg)
        setShowFiles(false)
        setLoading(true)
        setDisableDrop(true)
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
      setLoading(false)
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
    <div className="Landing">
      <header className="Landing-header">
        <img src={logo} className="Landing-logo" alt="logo" />

        <div className="Landing-drop">
          <StyledDropzone noKeyboard={disableDrop} noClick={disableDrop} noDrag={disableDrop} onDropAccepted={onDropAccepted} msg={dropMsg} showFiles={showFiles} showLoading={loading} background={dropBackground} border={dropBorder}/>
        </div>
      </header>
    </div>
  );
}

export default LandingPage;
