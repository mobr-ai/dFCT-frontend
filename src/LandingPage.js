import logo from './logo.svg';
import './LandingPage.css';
import StyledDropzone from './StyledDropzone.js'
import request from 'superagent';
import { useCallback } from 'react';

function App() {
  const onDrop = useCallback((acceptedFiles) => {
    const req = request.post('/upload')
    acceptedFiles.forEach(file => {
      req.attach(file.name, file)
    })
    req.end()
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <div className="App-drop">
          <StyledDropzone onDrop={onDrop}/>
        </div>
      </header>
    </div>
  );
}

export default App;
