import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/TopicSubmission.css";
import "./styles/TopicList.css";
import "./styles/NavigationSidebar.css";
import TopicSidebar from "./components/topic/TopicSidebar.jsx";
import URLCardList from "./components/URLCardList.jsx";
import FileUploadArea from "./components/FileUploadArea.jsx";
import URLInputField from "./components/URLInputField.jsx";
import ContextInputField from "./components/ContextInputField.jsx";
import SubmissionControls from "./components/SubmissionControls.jsx";
import RelatedTopicsModal from "./components/RelatedTopicsModal.jsx";
import logo from "./icons/logo.svg";
import Form from "react-bootstrap/Form";
import i18n from "./i18n";
import detector from "i18next-browser-languagedetector";
import translationEN from "./locales/en/translation.json";
import translationPT from "./locales/pt/translation.json";
import {
  useOutletContext,
  useLocation,
  useNavigate,
  useLoaderData,
  Await,
} from "react-router-dom";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useTranslation, initReactI18next } from "react-i18next";
import { useS3Upload } from "./hooks/useS3Upload.js";
import { useAuthRequest } from "./hooks/useAuthRequest";

i18n
  .use(detector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: translationEN,
      },
      pt: {
        translation: translationPT,
      },
    },
    // lng: "pt", // do not define the lng option if using language detector
    fallbackLng: "en",

    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

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
          .put("/topic/" + user.id)
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
      console.log(
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
        console.log(
          "Oops, error fetching URL: " + res.status + " (" + res.message + ")"
        );
        document.getElementById("input-url-help-msg").innerText =
          t("fetchURLError");
        setFetching(false);
        document.getElementById("input-url-text").value = "";
      };

      authRequest
        .post("/fetch_url")
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
        .post("/process")
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
      const topicURL = res.body["topic_url"];
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
        await authRequest
          .post("/check")
          .send(topic)
          .then((res) => checkStatus(res))
          .catch((err) => {
            showError(t("topicCreationFailed"));
            console.log(
              "Topic (id = " + topicId + ") processing failed: [" + err + "]"
            );
          });
        await sleep(2000);
      }

      // send user to topic breakdown page
      if (nextProgress === 100) {
        setDropMsg(t("topicProcessed"));
        setLoading(false);
        // react soft navigation
        navigate(topicURL);
      }
    }

    // all files completed
    if (
      urls.length > 0 ||
      files.filter((f) => f.completed).length === files.length
    ) {
      console.log("All files available, processing content...");

      setDropMsg(t("processingContent"));
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
              showProgress={showProgress}
              progress={progress}
              files={files}
              onDropAccepted={onDropAccepted}
            />

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
