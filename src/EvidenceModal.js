import './TopicBreakdownPage.css'
import StyledDropzone from './StyledDropzone.js'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from 'react';
import { useOutletContext } from "react-router-dom";
import request from 'superagent';
import URLCardList from './URLCardList.js';


function EvidenceModal(props) {
    const { t } = useTranslation();
    const [dropMsg, setDropMsg] = useState(t('dropEvidenceMsg'))
    const [dropBackground, setDropBackground] = useState("#54646C")
    const [dropBorder, setDropBorder] = useState()
    const [files, setFiles] = useState([])
    const [topicId, setTopicId] = useState()
    const [urls, setURLs] = useState([])
    const [progress, setProgress] = useState(10)
    const [showFiles, setShowFiles] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [loading, setLoading] = useState(false)
    const [disableDrop, setDisableDrop] = useState(false)
    const [providedContext, setProvidedContext] = useState("")
    const [showURLs, setShowURLs] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [user] = useOutletContext();


    useEffect(() => {
        setDropMsg(t('dropEvidenceMsg').replace("{}", t(props.type)))
    }, [setDropMsg, t, props.type]);


    // sleep time expects milliseconds
    function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

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
                .set('Accept', 'application/json')
                .then(reqSuccess, reqError)
        }

        // create signed request to upload files
        getSignedRequest()
    }

    const handleURLInput = () => {
        if (document.getElementById('input-url-text').value) {

            if (!URL.canParse(document.getElementById('input-url-text').value)) {
                console.log("Oops, invalid URL: " + document.getElementById('input-url-text').value)
                document.getElementById('input-url-help-msg').innerText = t('invalidURL')
                setFetching(false)
                return
            }

            const metaSuccess = (res) => {
                let url = { "url": document.getElementById('input-url-text').value, "metadata": res.body }

                setURLs(urls.concat([url]))
                setShowURLs(true)
                setFetching(false)

                if (document.querySelector("#input-process-button")) document.querySelector("#input-process-button").scrollIntoView({ behavior: "smooth", block: "center" })
                document.getElementById('input-url-text').value = ""
            }

            const metaError = (res) => {
                // let url = { "url": document.getElementById('input-url-text').value, "metadata": "" }
                // display error msg
                console.log("Oops, error fetching URL: " + res.status + " (" + res.message + ")")
                document.getElementById('input-url-help-msg').innerText = t('fetchURLError')
                // setURLs(urls.concat([url]))
                // setShowURLs(true)
                setFetching(false)
                document.getElementById('input-url-text').value = ""
            }

            request
                .post('/fetch_url')
                .send({ "url": document.getElementById('input-url-text').value })
                .set('Accept', 'application/json')
                .then(metaSuccess, metaError)

            document.getElementById('input-url-help-msg').innerText = ""
            setFetching(true)
        }
    }

    const processEvidence = () => {

        function requestProcessing(res) {

            // create request to process content
            request.post("/process_evidence")
                .send({ files: files })
                .send({ urls: urls })
                .send({ topicId: props.topicId })
                .send({ userId: user.id })
                .send({ evidenceType: props.type })
                .send({ claimId: props.claimId })
                .send({ providedContext: providedContext })
                .send({ language: i18n.language || window.localStorage.i18nextLng })
                .then(waitProcessing, handleError);
        }

        function handleError(res) {
            // display error msg
            showError(t('topicCreationFailed'))
            console.log("Topic (id = " + topicId + ") processing failed: [" + res.status + "] (" + res.message + ")")
        }

        async function waitProcessing(res) {
            var nextProgress = progress
            const topic = res.body
            // const topicId = Object.keys(res.body)[0]
            const topicURL = res.body['topic_url']
            const checkStatus = (res) => {
                try {
                    var p = Number(res.text)
                    if (p === -1) {
                        throw new Error("Could not read metadata")
                    }
                    setProgress(p)
                    nextProgress = p
                    console.log("Topic processing progress=" + p)
                }
                catch (e) {
                    console.log("Error retrieving processing progress: " + e.message)
                    setProgress(0)
                    nextProgress = -1
                    showError(t('topicCreationFailed'))
                }
            }

            // request progress and wait for topic to be processed
            while (nextProgress >= 0 && nextProgress < 100) {
                // request synchronously to check progress
                await request.post("/check").send(topic).then((res) => checkStatus(res))
                await sleep(2000);
            }

            // send user to topic breakdown page
            if (nextProgress === 100) {
                setDropMsg(t('topicProcessed'))
                setLoading(false)

                // refresh page
                window.location.reload();
            }
        }

        // all files completed
        if (urls.length > 0 || files.filter((f) => f.completed).length === files.length) {
            console.log("All files available, processing content...")

            window.scrollTo({ top: 0, behavior: 'auto' });
            setDropMsg(t('processingContent'))
            setShowFiles(false)
            setShowURLs(false)
            setShowProgress(true)
            setDisableDrop(true)
            setLoading(true)


            requestProcessing()
        }
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
                    msg={dropMsg.replace("{}", t(props.type))}
                    key={dropMsg}
                    showFiles={showFiles}
                    showProgress={showProgress}
                    background={dropBackground}
                    fontColor="white"
                    border={dropBorder}
                    progress={progress}
                    files={files}
                />
                {!loading
                    &&
                    (
                        <>
                            <div>
                                <InputGroup className="Landing-input-url mb-3">
                                    <InputGroup.Text id="input-url-label">WWW</InputGroup.Text>
                                    <Form.Control id="input-url-text" className='Breakdown-claim-evidence-modal-url-input' aria-label="Add an URL to be verified" aria-describedby="input-url-help-msg" />
                                    <Button
                                        id="input-url-button"
                                        variant="dark"
                                        onClick={!fetching ? handleURLInput : null}
                                        disabled={fetching}

                                    >{fetching ? t('loadingURL') : t('addURL')}</Button>
                                </InputGroup>
                                <Form.Text id="input-url-help-msg" muted />
                            </div>

                            <URLCardList setURLs={setURLs} urls={urls} />

                            <div className="Landing-input">
                                <Form.Label><b><i>{t('optional')}</i></b>{t('additionalEvidenceContext').replace("{}", t(props.type))}</Form.Label>
                                <Form.Control id="input-context" as="textarea" onChange={handleContextInput} placeholder={t(props.type + 'Example')} rows={3} />
                            </div>

                            <Button
                                id="input-process-button"
                                variant="dark"
                                onClick={!loading ? processEvidence : null}
                                disabled={(loading || !(files && files.filter((f) => f.completed).length === files.length))}
                            >{t('analyzeButton')}</Button>
                        </>)
                }
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={props.onHide}>{t('closeButton')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default EvidenceModal;