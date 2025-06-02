import "./../styles/TopicBreakdownPage.css";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import i18n from "./../i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useS3Upload } from "../hooks/useS3Upload.js";
import request from "superagent";
import URLCardList from "../URLCardList.jsx";
import FileUploadArea from "./FileUploadArea.jsx";
import URLInputField from "./URLInputField.jsx";
import ContextInputField from "./ContextInputField.jsx";
import SubmissionControls from "./SubmissionControls.jsx";
import { useAuthRequest } from "../hooks/useAuthRequest";

function EvidenceModal(props) {
  const { t } = useTranslation();
  const [dropMsg, setDropMsg] = useState(t("dropEvidenceMsg"));
  const [dropBackground, setDropBackground] = useState("#54646C");
  const [dropBorder, setDropBorder] = useState();
  const [files, setFiles] = useState([]);
  const [topicId] = useState();
  const [urls, setURLs] = useState([]);
  const [progress, setProgress] = useState(10);
  const [showFiles, setShowFiles] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disableDrop, setDisableDrop] = useState(false);
  const [providedContext, setProvidedContext] = useState("");
  const [, setShowURLs] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { user } = useOutletContext();
  const { authRequest } = useAuthRequest(user);
  const { uploadProgress, handleUploads, hash } = useS3Upload();

  useEffect(() => {
    setDropMsg(t("dropEvidenceMsg").replace("{}", t(props.type)));
  }, [setDropMsg, t, props.type]);

  // sleep time expects milliseconds
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  const handleContextInput = (event) => {
    setProvidedContext(event.target.value);
  };

  const showError = (msg = null, clear = false) => {
    if (clear) {
      setDropBackground("#54646C");
      setDropBorder();
      setDropMsg(t("welcomeMsg"));
      return;
    }
    if (msg) {
      setDropMsg(msg);
      setFiles([]);
    } else {
      msg = dropMsg;
    }

    setShowFiles(false);
    setShowProgress(false);
    setDropBackground("#ff000045");
    setDropBorder("#eeeeee");
    setDisableDrop(false);
    setLoading(false);
  };

  // Called when user drops new files
  const onDropAccepted = async (acceptedFiles) => {
    console.log("User dropped accepted files = " + acceptedFiles.length);

    showError("", true);
    setFiles(files.concat(acceptedFiles));
    setLoading(true);
    setDropMsg(t("uploadingFiles"));
    setShowFiles(true);
    setShowProgress(true);

    try {
      await handleUploads(acceptedFiles);
    } catch (error) {
      console.error("Upload error:", error);
      showError(t("uploadFailed"));
    }
  };

  // Handle upload completion
  useEffect(() => {
    const allUploaded =
      files.length > 0 &&
      files.every((file) => uploadProgress[file.name] === 100);
    if (allUploaded) {
      files.forEach((f) => (f.completed = true));
      setDropMsg(t("addMoreFiles"));
      setLoading(false);
      setShowProgress(false);
    }
  }, [uploadProgress, files, t]);

  const handleURLInput = () => {
    if (document.getElementById("input-url-text").value) {
      if (!URL.canParse(document.getElementById("input-url-text").value)) {
        console.log(
          "Oops, invalid URL: " +
            document.getElementById("input-url-text").value
        );
        document.getElementById("input-url-help-msg").innerText =
          t("invalidURL");
        setFetching(false);
        return;
      }

      const metaSuccess = (res) => {
        let url = {
          url: document.getElementById("input-url-text").value,
          metadata: res.body,
        };

        setURLs(urls.concat([url]));
        setShowURLs(true);
        setFetching(false);

        if (document.querySelector("#input-process-button"))
          document
            .querySelector("#input-process-button")
            .scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("input-url-text").value = "";
      };

      const metaError = (res) => {
        // let url = { "url": document.getElementById('input-url-text').value, "metadata": "" }
        // display error msg
        console.log(
          "Oops, error fetching URL: " + res.status + " (" + res.message + ")"
        );
        document.getElementById("input-url-help-msg").innerText =
          t("fetchURLError");
        // setURLs(urls.concat([url]))
        // setShowURLs(true)
        setFetching(false);
        document.getElementById("input-url-text").value = "";
      };

      request
        .post("/fetch_url")
        .set("Accept", "application/json")
        .send({ url: document.getElementById("input-url-text").value })
        .then(metaSuccess, metaError);

      document.getElementById("input-url-help-msg").innerText = "";
      setFetching(true);
    }
  };

  const processEvidence = () => {
    const allUploaded =
      files.length > 0 &&
      files.every((file) => uploadProgress[file.name] === 100);

    function handleError(res) {
      // display error msg
      showError(t("topicCreationFailed"));
      console.log(
        "Topic (id = " +
          topicId +
          ") processing failed: [" +
          res.status +
          "] (" +
          res.message +
          ")"
      );
    }

    async function waitProcessing(res) {
      var nextProgress = progress;
      const topic = res.body;
      // const topicId = Object.keys(res.body)[0]
      // const topicURL = res.body['topic_url']
      const checkStatus = (res) => {
        try {
          var p = Number(res.text);
          if (p === -1) {
            throw new Error("Could not read metadata");
          }
          setProgress(p);
          nextProgress = p;
          console.log("Topic processing progress=" + p);
        } catch (e) {
          console.log("Error retrieving processing progress: " + e.message);
          setProgress(0);
          nextProgress = -1;
          showError(t("topicCreationFailed"));
        }
      };

      // request progress and wait for topic to be processed
      while (nextProgress >= 0 && nextProgress < 100) {
        // request synchronously to check progress
        await authRequest
          .post("/check")
          .send(topic)
          .then((res) => checkStatus(res));
        await sleep(2000);
      }

      // send user to topic breakdown page
      if (nextProgress === 100) {
        setDropMsg(t("topicProcessed"));
        setLoading(false);

        // refresh page
        window.location.reload();
      }
    }

    if (urls.length > 0 || allUploaded) {
      setDropMsg(t("processingContent"));
      setShowFiles(false);
      setShowURLs(false);
      setShowProgress(true);
      setDisableDrop(true);
      setLoading(true);

      authRequest
        .post("/process_evidence")
        .send({
          files: hash.map((file) => ({
            name: file.name,
            path: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            hash: file.hash,
          })),
          urls: urls,
          topicId: props.topicId,
          userId: user.id,
          evidenceType: props.type,
          claimId: props.claimId,
          providedContext: providedContext,
          language:
            i18n.language.split("-")[0] ||
            window.localStorage.i18nextLng.split("-")[0],
        })
        .then(waitProcessing, handleError);
    }
  };

  return (
    <Modal
      {...props}
      className="Breakdown-claim-evidence-modal"
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
        <FileUploadArea
          disableDrop={disableDrop}
          dropMsg={dropMsg}
          dropBackground={dropBackground}
          dropBorder={dropBorder}
          showFiles={showFiles}
          showProgress={showProgress}
          progress={progress}
          files={files}
          onDropAccepted={onDropAccepted}
        />

        {!loading && (
          <>
            <URLInputField
              fetching={fetching}
              handleURLInput={handleURLInput}
              t={t}
            />
            <URLCardList setURLs={setURLs} urls={urls} />
            <ContextInputField
              providedContext={providedContext}
              handleContextInput={handleContextInput}
              t={t}
            />
            <SubmissionControls
              loading={loading}
              processContent={processEvidence}
              files={files}
              urls={urls}
              t={t}
            />
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onHide}>
          {t("closeButton")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EvidenceModal;
