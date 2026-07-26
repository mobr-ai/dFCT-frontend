import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/TopicSubmission.css";
import "../styles/TopicList.css";
import "../styles/NavigationSidebar.css";
import { TopicSidebar } from "../components/topic";
import { URLCardList } from "../components/content";
import { FileUploadArea } from "../components/submission";
import { URLInputField } from "../components/submission";
import { ContextInputField } from "../components/submission";
import {
  SubmissionControls,
  ProcessingProgress,
} from "../components/submission";
import { RelatedTopicsModal } from "../components/topic";
import logo from "../icons/logo.svg";
import Form from "react-bootstrap/Form";
import i18n from "../i18n";
import {
  useOutletContext,
  useLocation,
  useNavigate,
  useLoaderData,
  Await,
} from "react-router-dom";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useS3Upload } from "../hooks/useS3Upload.js";
import { useAuthRequest } from "../hooks/useAuthRequest";

function TopicSubmissionPage() {
  const { t } = useTranslation();
  const { user, loading, setLoading } = useOutletContext();
  const { authFetch, authRequest } = useAuthRequest(user);
  const { userTopicsPromise } = useLoaderData();
  const { uploadProgress, handleUploads, hash } = useS3Upload();
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [disableDrop, setDisableDrop] = useState(false);
  const [dropMsg, setDropMsg] = useState(t("welcomeMsg"));
  const [dropBackground, setDropBackground] = useState("#37474fff");
  const [dropBorder, setDropBorder] = useState();
  const [fetching, setFetching] = useState(false);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(10);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [providedContext, setProvidedContext] = useState("");
  const [showFiles, setShowFiles] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showURLs, setShowURLs] = useState(false);
  const [showUserTopics, setShowUserTopics] = useState(false);
  const [topicId, setTopicId] = useState();
  const [urls, setURLs] = useState([]);
  const [relatedTopics, setRelatedTopics] = useState([]);
  const [showRelatedTopicsModal, setShowRelatedTopicsModal] = useState(false);
  const [hasDismissedRelatedModal, setHasDismissedRelatedModal] =
    useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleResize = () => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  // Scrolls things up
  const rollUp = useCallback(() => {
    document
      .getElementsByClassName("bm-menu")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    document
      .getElementsByClassName("Submission-middle-column")[0]
      ?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Displays error on drop zone
  const showError = useCallback(
    (msg = null, clear = false) => {
      if (clear) {
        setDropBackground("#37474fff");
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
      setProcessingStatus(null);
      setDropBackground("#ff000045");
      setDropBorder("#eeeeee");
      setDisableDrop(false);
      setLoading(false);
    },
    [dropMsg, setLoading, t]
  );

  // Checks if a topic already exists and create a template if not
  const checkTopic = useCallback(
    (callback) => {
      if (!topicId) {
        authRequest
          .put("/api/topic/" + user.id)
          .send({
            title: "Topic template",
            description: "This is a new topic",
            language:
              i18n.language.split("-")[0] ||
              window.localStorage.i18nextLng.split("-")[0],
          })
          .then(callback, () => showError(t("topicCreationFailed")));
      } else {
        callback();
      }
    },
    [showError, t, topicId, user, authRequest]
  );

  // Called when user drops new files
  const onDropAccepted = useCallback(
    (acceptedFiles) => {
      if (import.meta.env.DEV) console.log(
        "User dropped accepted files = " +
          acceptedFiles.length +
          " state.files = " +
          files.length
      );

      showError("", true);
      setFiles(files.concat(acceptedFiles));

      async function submitFiles(res) {
        if (res && !topicId) {
          setTopicId(res.body.topicId);
        }

        const filesToUpload = files
          .concat(acceptedFiles)
          .filter((file) => file instanceof File && !file.completed);

        if (filesToUpload.length > 0) {
          try {
            setLoading(true);
            setDropMsg(t("uploadingFiles"));
            setShowFiles(true);
            setShowProgress(true);
            await handleUploads(filesToUpload);

            // if new files, then show related modal again
            if (files.concat(acceptedFiles).length > files.length) {
              setHasDismissedRelatedModal(false);
            }
          } catch (error) {
            console.error("Upload error:", error);
            setDropMsg(t("uploadFailed"));
            setLoading(false);
          }
        }
      }

      // create new topic for the content if necessary
      checkTopic(submitFiles);
    },
    [checkTopic, files, setLoading, showError, t, topicId, handleUploads]
  );

  // Handle upload completion
  useEffect(() => {
    const allUploaded = files.every(
      (file) => uploadProgress[file.name] === 100
    );

    // Check if there's at least one file that is uploaded and NOT checked yet
    const newFilesToCheck = files.filter(
      (file) => uploadProgress[file.name] === 100 && !file.hasChecked
    );

    if (allUploaded && newFilesToCheck.length > 0) {
      // Mark files as completed & prepare hashes
      newFilesToCheck.forEach((file) => {
        file.completed = true;
        file.hasChecked = true; // mark as checked to prevent re-checking
      });

      setDropMsg(t("addMoreFiles"));
      setLoading(false);
      setShowProgress(false);

      // Call related topic check in background
      (async () => {
        const hashes = newFilesToCheck.map((file) => file.hash);
        const response = await authFetch(`/api/check_related_topics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hashes }),
        });

        const result = await response.json();
        if (result.topics && result.topics.length > 0) {
          setRelatedTopics((prevTopics) =>
            prevTopics.concat(
              result.topics.filter(
                (item2) => !prevTopics.some((item1) => item1.id === item2.id)
              )
            )
          );
          setShowRelatedTopicsModal(true);
        }
      })();
    }
  }, [
    uploadProgress,
    files,
    setLoading,
    loading,
    setRelatedTopics,
    t,
    authFetch,
  ]);

  // Handle files passed via navigate()
  useEffect(() => {
    if (location.state?.files && Array.isArray(location.state.files)) {
      const transferredFiles = location.state.files.filter(
        (f) => f instanceof File
      );

      // Checks if transferredFiles are new
      var uniqueNewFiles = transferredFiles.filter(function (file) {
        return !files.some(function (existingFile) {
          return existingFile.name === file.name;
        });
      });

      if (uniqueNewFiles.length > 0) {
        onDropAccepted(uniqueNewFiles);
      }
    }
  }, [location.state, onDropAccepted, files]);

  // Handle resize and redirect when not logged
  useEffect(() => {
    window.addEventListener("resize", handleResize, false);

    if (!user) navigate("/");

    return () => window.removeEventListener("resize", handleResize, false);
  }, [user, navigate]);

  useEffect(() => {
    setDropMsg(t("welcomeMsg"));
    rollUp();
    setLoading(false);

    if (document.getElementById("input-url-help-msg"))
      document.getElementById("input-url-help-msg").innerText = "";
  }, [rollUp, setDropMsg, t, setLoading]);

  const handleContextInput = (event) => {
    setProvidedContext(event.target.value);
  };

  const handleURLInput = () => {
    if (document.getElementById("input-url-text").value) {
      if (!URL.canParse(document.getElementById("input-url-text").value)) {
        if (import.meta.env.DEV) console.log(
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
        if (import.meta.env.DEV) console.log(
          "Oops, error fetching URL: " + res.status + " (" + res.message + ")"
        );
        document.getElementById("input-url-help-msg").innerText =
          t("fetchURLError");
        setFetching(false);
        document.getElementById("input-url-text").value = "";
      };

      authRequest
        .post("/api/fetch_url")
        .set("Accept", "application/json")
        .send({ url: document.getElementById("input-url-text").value })
        .then(metaSuccess, metaError);

      document.getElementById("input-url-help-msg").innerText = "";
      setFetching(true);
    }
  };

  // const handleProcessClick = async () => {
  //   const hasRelated = await checkForRelatedTopics();
  //   if (!hasRelated) {
  //     processTopic(); // no related topic found based on hash
  //   }
  // };

  const processTopic = () => {
    function requestProcessing(res) {
      var nextTopic = topicId;
      if (res && !topicId) {
        nextTopic = res.body.topicId;
        setTopicId(res.body.topicId);
      }

      // create request to process content
      authRequest
        .post("/api/process")
        .send({
          files: hash.map((file) => ({
            name: file.name,
            path: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            hash: file.hash,
            s3Key: file.s3Key,
          })),
          urls: urls,
          topicId: nextTopic,
          userId: user.id,
          providedContext: providedContext,
          language:
            i18n.language.split("-")[0] ||
            window.localStorage.i18nextLng.split("-")[0],
        })
        .then(waitProcessing, handleError);
    }

    function handleError(res) {
      // display error msg
      showError(t("topicCreationFailed"));
      if (import.meta.env.DEV) console.log(
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
      const topic = res.body;
      const topicURL = topic["topic_url"];
      const analysisRunId = topic.analysisRunId;

      if (!analysisRunId) {
        showError(t("topicCreationFailed"));
        return;
      }

      let nextProgress = 1;
      let terminalStatus = null;

      setProgress((current) =>
        Math.max(current, 1)
      );

      while (
        terminalStatus !== "succeeded" &&
        terminalStatus !== "failed"
      ) {
        try {
          const statusResponse = await authRequest
            .get(
              `/api/analysis-progress/${analysisRunId}`
            )
            .set("Accept", "application/json");

          const status = statusResponse.body || {};
          const reported = Number(
            status.progress
          );

          if (!Number.isFinite(reported)) {
            throw new Error(
              "Invalid analysis progress response"
            );
          }

          // Defensive monotonicity. The backend contract is designed
          // to be monotonic, but the UI must never visually move
          // backwards if polling observes concurrent transactions.
          nextProgress = Math.max(
            nextProgress,
            reported,
          );

          setProgress((current) =>
            Math.max(
              Number(current) || 0,
              nextProgress,
            )
          );

          setProcessingStatus(status);

          if (status.messageKey) {
            setDropMsg(
              t(status.messageKey)
            );
          }

          terminalStatus = status.status;

          if (import.meta.env.DEV) {
            console.log(
              "Analysis processing status=",
              status
            );
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.log(
              "Error retrieving analysis progress:",
              error
            );
          }

          showError(
            t("topicCreationFailed")
          );
          return;
        }

        if (
          terminalStatus !== "succeeded" &&
          terminalStatus !== "failed"
        ) {
          await sleep(1500);
        }
      }

      if (terminalStatus === "failed") {
        showError(
          t("topicCreationFailed")
        );
        return;
      }

      setProgress(100);
      setDropMsg(
        t("topicProcessing.complete")
      );
      setLoading(false);

      navigate(topicURL);
    }

    // all files completed
    if (
      urls.length > 0 ||
      files.filter((f) => f.completed).length === files.length
    ) {
      if (import.meta.env.DEV) console.log("All files available, processing content...");

      setDropMsg(
        t("topicProcessing.preparing")
      );
      setProcessingStatus({
        status: "queued",
        progress: 1,
        phase: "preparing",
        messageKey:
          "topicProcessing.preparing",
        activeStages: [],
        stages: [],
      });
      setProgress(1);
      setShowFiles(false);
      setShowURLs(false);
      setShowProgress(true);
      setDisableDrop(true);
      setLoading(true);

      // create new topic if necessary (urls-only case)
      checkTopic(requestProcessing);
    }
  };

  // sleep time expects milliseconds
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  return (
    <div className="Submission-body">
      <div className="Submission-middle-column">
        <div className="Submission-header-top">
          {loading && files.length < 2 && (
            <img src={logo} className="Submission-logo" alt="logo"></img>
          )}
          {!loading && files.length === 0 && (
            <img src={logo} className="Submission-logo-static" alt="logo"></img>
          )}
        </div>
        {user && (
          <Form.Group
            className="Submission-input-group mb-3"
            id="input-form-group"
          >
            <FileUploadArea
              disableDrop={disableDrop}
              dropMsg={dropMsg}
              dropBackground={dropBackground}
              dropBorder={dropBorder}
              showFiles={showFiles}
              showProgress={
                showProgress &&
                !processingStatus
              }
              progress={progress}
              files={files}
              onDropAccepted={onDropAccepted}
            />

            {processingStatus && loading && (
              <ProcessingProgress
                progress={progress}
                status={processingStatus}
              />
            )}

            {!loading && (
              <>
                <div className="Submission-divider">
                  <span className="Submission-divider-or">
                    {t("landingOR")}
                  </span>
                </div>
                <URLInputField
                  fetching={fetching}
                  handleURLInput={handleURLInput}
                  t={t}
                />
              </>
            )}

            {((showFiles && files.length > 0) ||
              (showURLs && urls.length > 0)) && (
              <>
                <URLCardList setURLs={setURLs} urls={urls} />
                <ContextInputField
                  providedContext={providedContext}
                  handleContextInput={handleContextInput}
                  t={t}
                />
                <SubmissionControls
                  loading={loading}
                  processContent={() => {
                    if (files.length > 0) {
                      setHasDismissedRelatedModal(false);
                      if (relatedTopics && relatedTopics.length > 0) {
                        setShowRelatedTopicsModal(true);
                      } else {
                        processTopic();
                      }
                    } else {
                      processTopic();
                    }
                  }}
                  files={files}
                  urls={urls}
                  t={t}
                />
              </>
            )}
          </Form.Group>
        )}
      </div>
      {user && (
        <Suspense>
          <Await resolve={userTopicsPromise}>
            {(userTopics) => {
              return (
                <TopicSidebar
                  userTopics={userTopics.topics}
                  pageWidth={dimensions.width}
                  showUserTopics={showUserTopics}
                  setShowUserTopics={setShowUserTopics}
                />
              );
            }}
          </Await>
        </Suspense>
      )}
      <RelatedTopicsModal
        show={
          showRelatedTopicsModal &&
          !hasDismissedRelatedModal &&
          files.length > 0
        }
        onClose={() => {
          setHasDismissedRelatedModal(true);
          setShowRelatedTopicsModal(false);
        }}
        onProceed={() => {
          setShowRelatedTopicsModal(false);
          processTopic(); // user proceeds anyway
        }}
        topics={relatedTopics}
      />
    </div>
  );
}

export default TopicSubmissionPage;
