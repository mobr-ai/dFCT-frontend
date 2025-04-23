import StyledDropzone from './StyledDropzone';

function FileUploadArea({
    disableDrop,
    dropMsg,
    dropBackground,
    dropBorder,
    showFiles,
    showProgress,
    progress,
    files,
    onDropAccepted
}) {
    return (
        <div className="Submission-drop">
            <StyledDropzone
                noKeyboard={disableDrop}
                noClick={disableDrop}
                noDrag={disableDrop}
                onDropAccepted={onDropAccepted}
                msg={dropMsg}
                key={dropMsg}
                showFiles={showFiles}
                showProgress={showProgress}
                background={dropBackground}
                border={dropBorder}
                progress={progress}
                files={files}
            />
        </div>
    );
}

export default FileUploadArea;
