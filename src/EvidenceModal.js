import './TopicBreakdownPage.css'
import StyledDropzone from './StyledDropzone.js'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { useTranslation } from "react-i18next";
import { useEffect, useState } from 'react';
import request from 'superagent';


function EvidenceModal(props) {
    const { t } = useTranslation();
    const [dropMsg, setDropMsg] = useState(t('dropEvidenceMsg'))
    const [dropBackground, setDropBackground] = useState("#54646C")
    const [dropBorder, setDropBorder] = useState()
    const [files, setFiles] = useState([])
    const [progress, setProgress] = useState(10)
    const [showFiles, setShowFiles] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [loading, setLoading] = useState(false)
    const [disableDrop, setDisableDrop] = useState(false)
    const [providedContext, setProvidedContext] = useState()

    useEffect(() => {
        setDropMsg(t('dropEvidenceMsg').replace("{}", props.type))
    }, [setDropMsg, t, props.type]);


    const handleContextInput = (event) => {
        setProvidedContext(event.target.value);
    }

    const showError = (msg = null, clear = false) => {
        if (clear) {
            setDropBackground("#54646C")
            setDropBorder()
            setDropMsg(t('welcomeMsg'))
            return
        }
        if (msg) {
            setDropMsg(msg)
            setFiles([])
        }
        else {
            msg = dropMsg
        }

        setShowFiles(false)
        setShowProgress(false)
        setDropBackground("#ff000045")
        setDropBorder("#eeeeee")
        setDisableDrop(false)
        setLoading(false)
    }


    const onDropAccepted = (acceptedFiles) => {
        console.log("User dropped accepted files = " + acceptedFiles.length + " state.files = " + files.length)

        showError("", true)
        setFiles(files.concat(acceptedFiles))
        // setLoading(true)

        function uploadSuccess(res) {
            console.log("Upload success: " + res.req._data.get('key') + " [" + res.status + "]")

            const newFiles = acceptedFiles.map((f) => {
                if (f.name === res.req._data.get('key')) {
                    f.completed = true
                }
                return f
            });

            if (newFiles.filter((f) => f.completed).length === newFiles.length) {
                // all current files uploaded
                setLoading(false)
                setDropMsg(t('addMoreFiles'))
                document.querySelector("#input-process-button").scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }

        function uploadError(res) {
            // display error msg
            showError(t('uploadFailed'))
            console.log("Upload failed: " + res.req._data.get('key') + " [" + res.status + "] (" + res.message + ")")
        }

        function reqSuccess(res) {
            setDropMsg(t('uploadingFiles'))
            setShowFiles(true)
            setShowProgress(true)
            // setDisableDrop(true)
            console.log(dropMsg)

            // upload files directly to s3
            JSON.parse(res.text).forEach(file => {
                console.log("Uploading " + file.data.fields.key)

                // post it as form data
                var postData = new FormData();
                for (var key in file.data.fields) {
                    postData.append(key, file.data.fields[key]);
                }
                postData.append('file', acceptedFiles.filter((f) => f.name === file.data.fields.key)[0])

                var req = request.post(file.data.url)
                req.send(postData)
                req.then(uploadSuccess, uploadError);
            })
        }

        function reqError(res) {
            // display error msg
            showError(t('uploadFailed'))
            console.log("Signed request failed: " + res.status + " (" + res.message + ")")
        }

        function getSignedRequest() {
            // get signed request to S3 service
            const fileArgs = []
            acceptedFiles.forEach(file => {
                if (!file.completed)
                    fileArgs.push({ "file": file.name, "type": file.type })
            })

            request
                .post('/sign_s3')
                .send(fileArgs)
                .send({ "topic_id": props.topicId })
                .set('Accept', 'application/json')
                .then(reqSuccess, reqError)
        }

        // create signed request to upload files
        getSignedRequest()
    }

    const processEvidence = () => {

    }

    return (
        <Modal
            {...props}
            className='Breakdown-claim-evidence-modal'
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    {props.title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <StyledDropzone
                    noKeyboard={disableDrop}
                    noClick={disableDrop}
                    noDrag={disableDrop}
                    onDropAccepted={onDropAccepted}
                    msg={dropMsg.replace("{}", props.type)}
                    key={dropMsg}
                    showFiles={showFiles}
                    showProgress={showProgress}
                    background={dropBackground}
                    fontColor="white"
                    border={dropBorder}
                    progress={progress}
                    files={files}
                />
                <div className="Landing-input">
                    <Form.Label><b><i>{t('optional')}</i></b>{t('additionalEvidenceContext').replace("{}", props.type)}</Form.Label>
                    <Form.Control id="input-context" as="textarea" onChange={handleContextInput} placeholder={t('evidenceExample')} rows={3} />
                </div>
                <Button
                    id="input-process-button"
                    variant="dark"
                    onClick={!loading ? processEvidence : null}
                    disabled={(loading || !(files && files.filter((f) => f.completed).length === files.length))}
                >{t('analyzeButton')}</Button>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={props.onHide}>{t('closeButton')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default EvidenceModal;