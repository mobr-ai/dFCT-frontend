import { React } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import './TopicSubmission.css';
import LoadingPage from './LoadingPage';
import { faMagnifyingGlassArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


const getBackgroundColor = (props) => {
  if (props.background) {
    return props.background
  }
  return '#37474fff'
}

const getFontColor = (props) => {
  if (props.fontColor) {
    return props.fontColor
  }
  return '#bdbdbd'
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
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 15px;
  padding: 15px 40px 20px 40px;
  border-width: 2px;
  border-radius: 25px;
  border-color: ${props => getColor(props)};
  border-style: dashed;
  background-color: ${props => getBackgroundColor(props)};
  color: ${props => getFontColor(props)};
  outline: none;
  transition: border .24s ease-in-out;
  cursor: pointer;
  min-width: 310px;
`;

function StyledDropzone(props) {
  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: {
      'video/mp4': ['.mp4'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'audio/mpeg': ['.mp3', '.mpga', '.m4a'],
      'audio/wav': ['.wav'],
      'audio/webm': ['.weba']
    },
    onDropAccepted: props.onDropAccepted,
    noClick: props.noClick,
    noDrag: props.noDrag,
    noKeyboard: props.noKeyboard
  });

  const files = props.files.map((file) => (
    <div className="Submission-drop-item" key={file.name}>
      <div className="Submission-drop-img">
        {file.type.includes("video") ?
          <video width="15%" muted>
            <source src={URL.createObjectURL(file)} type={file.type} />
          </video> : <img src={file.type.includes("image") ? URL.createObjectURL(file) : "./placeholder.png"} style={file.type.includes("image") ? { opacity: '1' } : { opacity: '0.5' }} alt="Content preview"></img>
        }
      </div>
      <div className="Submission-drop-item-desc">
        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        <div className={file.completed ? 'done' : 'loader'}></div>
        {!file.completed && (<LoadingPage type="simple" style={{ height: "10px" }} />)}
      </div>
    </div>
  ));

  return (
    <Container border={props.border} fontColor={props.fontColor} background={props.background} {...getRootProps({ isFocused, isDragAccept, isDragReject })}>
      <input {...getInputProps()} />
      <FontAwesomeIcon icon={faMagnifyingGlassArrowRight} className="Landing-drop-icon" />
      <div className="Submission-drop-message">{props.msg}</div>
      {(props.showFiles && !props.showLoading) ?
        <div className="Submission-drop-files">{files}</div> : ""}
      {(props.showProgress && !props.showFiles) ? <div className='loader' style={{ width: props.progress + "%", marginLeft: 0 }}></div> : ""}
    </Container>
  );
}

<StyledDropzone />

export default StyledDropzone;