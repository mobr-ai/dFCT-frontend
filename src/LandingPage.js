import logo from './logo.svg';
import './LandingPage.css';
import StyledDropzone from './StyledDropzone.js'
import request from 'superagent';
import { useCallback } from 'react';

function LandingPage() {
  const onDrop = useCallback((acceptedFiles) => {
    const req = request.post('/upload')
    acceptedFiles.forEach(file => {
      req.attach(file.name, file)
    })
    req.end()
  }, []);
  
  return (
    <div className="Landing">
      <header className="Landing-header">
        <img src={logo} className="Landing-logo" alt="logo" />

        <div className="Landing-drop">
          <StyledDropzone onDrop={onDrop}/>
        </div>
      </header>
    </div>
  );
}

export default LandingPage;
