import {React} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import './LandingPage.css';

const getBackgroundColor = (props) => {
  if(props.background) {
    return props.background
  }
  return '#37474fff'
}

const getColor = (props) => {
  if (props.border) {
      return props.border;
  }
  if (props.isDragAccept) {
      return '#00e676';
  }
  if (props.isDragReject) {
      return '#ff1744';
  }
  if (props.isFocused) {
      return '#2196f3';
  }
  
  return '#eeeeee';
}

const Container = styled.div`
  // flex: 1;
  // display: flex;
  // flex-direction: column;
  align-items: center;
  font-size: 15px;
  padding: 15px;
  padding-left: 20px;
  padding-right: 20px;
  border-width: 2px;
  border-radius: 25px;
  border-color: ${props => getColor(props)};
  border-style: dashed;
  background-color: ${props => getBackgroundColor(props)};
  color: #bdbdbd;
  outline: none;
  transition: border .24s ease-in-out;
  cursor: pointer;
`;

function StyledDropzone(props) {
  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
    acceptedFiles,
    } = useDropzone({
        accept: {
        'video/mp4': ['.mp4'],
        'image/jpg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'audio/mp3': ['.mp3']
        },
        onDropAccepted: props.onDropAccepted
    });

    const files = acceptedFiles.map((file) => (
      <p className="Landing-drop-item" key={file.path}>
        {file.path} ({(file.size/1024/1024).toFixed(2)} MB)
        <div className="loader"></div>
      </p>
    ));
  
  
  return (
    <Container border={props.border} background={props.background} {...getRootProps({isFocused, isDragAccept, isDragReject})}>
      <input {...getInputProps()} />
      <div>{props.msg}</div>
      {props.showFiles ? <aside>
        <div>{files}</div>
      </aside>:""}
    </Container>
  );
}

<StyledDropzone />

export default StyledDropzone;