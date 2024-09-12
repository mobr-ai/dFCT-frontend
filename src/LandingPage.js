import logo from './logo.svg';
import './LandingPage.css';
import StyledDropzone from './StyledDropzone.js'
import request from 'superagent';
import { useCallback, useState } from 'react';

function LandingPage() {
  const [dropMsg, setDropMsg] = useState("Drop files to verify, or click to select.")
  const [dropBackground, setDropBackground] = useState("#37474fff")
  const [dropBorder, setDropBorder] = useState()
  const [showFiles, setShowFiles] = useState(true)

  const onDropAccepted = useCallback((files) => {
    function uploadSuccess(p){
      setDropMsg("Upload success, now processing files...")
      console.log(dropMsg)
    }
    
    function uploadError(p){
      // display error msg
      setDropMsg("Oops, file upload failed. Please try again.")
      setShowFiles(false)
      setDropBackground("#ff000045")
      setDropBorder("#eeeeee")

      console.log(dropMsg + ": " + p.status + " (" + p.message + ")")
    }

    const req = request.post('/upload')
    files.forEach(file => {
      req.attach(file.name, file)
    })
    req.then(uploadSuccess, uploadError)
  }, [dropMsg]);
  
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
