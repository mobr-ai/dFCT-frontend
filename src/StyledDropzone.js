import React from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';

const getColor = (props) => {
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
  background-color: #37474fff;
  color: #bdbdbd;
  outline: none;
  transition: border .24s ease-in-out;
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
        'video/*': ['.mp4', '.mov'],
        'image/*': ['.jpg', '.png'],
        'audio/*': ['.mp3']
        },
        onDrop: props.onDrop
    });

    const files = acceptedFiles.map((file) => (
      <p className="App-drop-item" key={file.path}>
        {file.path} ({(file.size/1024/1024).toFixed(2)} MB)
        <div class="loader"></div>
      </p>
    ));
  
  
  return (
    <div className="container">
      <Container {...getRootProps({isFocused, isDragAccept, isDragReject})}>
        <input {...getInputProps()} />
        <p>Drop files to verify, or click to select</p>
        <aside>
          <div>{files}</div>
        </aside>
      </Container>
    </div>
  );
}

<StyledDropzone />

export default StyledDropzone;