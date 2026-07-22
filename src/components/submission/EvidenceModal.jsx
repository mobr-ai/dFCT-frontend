import "../../styles/TopicBreakdownPage.css";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import i18n from "../../i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useS3Upload } from "../../hooks/useS3Upload.js";
import { URLCardList } from "../content";
import FileUploadArea from "./FileUploadArea.jsx";
import URLInputField from "./URLInputField.jsx";
import ContextInputField from "./ContextInputField.jsx";
import SubmissionControls from "./SubmissionControls.jsx";
import { useAuthRequest } from "../../hooks/useAuthRequest";

function EvidenceModal(props) {
  const { t } = useTranslation();
  const [dropMsg, setDropMsg] = useState(t("dropEvidenceMsg"));
  const [dropBackground, setDropBackground] = useState("#54646C");
  const [dropBorder, setDropBorder] = useState();
  const [files, setFiles] = useState([]);
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
    if (import.meta.env.DEV) console.log("User dropped accepted files = " + acceptedFiles.length);

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
    const input = document.getElementById("input-url-text");
    const help = document.getElementById("input-url-help-msg");
    const rawUrl = input?.value?.trim();

    if (!rawUrl) return;

    if (!URL.canParse(rawUrl)) {
      if (help) help.innerText = t("invalidURL");
      setFetching(false);
      return;
    }

    const addURL = (metadata = null) => {
      setURLs((current) => {
        if (current.some((item) => item.url === rawUrl)) {
          return current;
        }

        return current.concat([
          {
            url: rawUrl,
            metadata,
          },
        ]);
      });

      setShowURLs(true);
      setFetching(false);

      if (input) input.value = "";

      requestAnimationFrame(() => {
        document
          .querySelector("#input-process-button")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      });
    };

    const metaSuccess = (res) => {
      if (help) help.innerText = "";
      addURL(res.body || null);
    };

    const metaError = () => {
      /*
       * Preview generation is best-effort. A publisher, paywall, bot
       * protection, or transient HTTP failure must not prevent the source
       * from entering the actual evidence-processing pipeline.
       */
      if (help) help.innerText = t("fetchURLPreviewUnavailable");

      addURL(null);
    };

    if (help) help.innerText = "";
    setFetching(true);

    authRequest
      .post("/api/fetch_url")
      .set("Accept", "application/json")
      .send({ url: rawUrl })
      .then(metaSuccess, metaError);
  };

  const processEvidence = () => {
    const allUploaded =
      files.length > 0 &&
      files.every((file) => uploadProgress[file.name] === 100);

    function handleError(res) {
      // display error msg
      showError(t("evidenceContribution.processingFailed"));
      if (import.meta.env.DEV) console.log(
        "Topic (id = " +
          props.topicId +
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
      if (
        topic?.duplicate === true ||
        topic?.preScreen?.outcome === "duplicate"
      ) {
        setDropMsg(t("evidenceContribution.duplicate"));
        setShowProgress(false);
        setDisableDrop(false);
        setLoading(false);
        return;
      }
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
          if (import.meta.env.DEV) console.log("Topic processing progress=" + p);
        } catch (e) {
          if (import.meta.env.DEV) console.log("Error retrieving processing progress: " + e.message);
          setProgress(0);
          nextProgress = -1;
          showError(t("evidenceContribution.processingFailed"));
        }
      };

      // request progress and wait for topic to be processed
      while (nextProgress >= 0 && nextProgress < 100) {
        // request synchronously to check progress
        await authRequest
          .post("/api/check")
          .send(topic)
          .then((res) => checkStatus(res));
        await sleep(2000);
      }

      // send user to topic breakdown page
      if (nextProgress === 100) {
        setDropMsg(
          t("evidenceContribution.processed"),
        );
        setLoading(false);

        try {
          window.sessionStorage.setItem(
            `dfct:evidence-submitted:${props.topicId}:${props.claimId}`,
            JSON.stringify({
              evidenceType: props.type,
              submittedAt: new Date().toISOString(),
            }),
          );
        } catch {
          // Best-effort UI acknowledgement only.
        }

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
        .post("/api/process_evidence")
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
      show={props.show}
      onHide={props.onHide}
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
        <div className="Breakdown-evidence-declared-view">
          <span>
            {t("evidenceContribution.yourView")}:
          </span>
          <strong>
            {props.type === "proEvidence"
              ? t("evidenceContribution.supports")
              : t("evidenceContribution.challenges")}
          </strong>
        </div>

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
