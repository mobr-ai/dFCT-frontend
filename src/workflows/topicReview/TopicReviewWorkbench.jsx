import { useEffect, useRef } from "react";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  LifecycleTaskList,
  TaskDecisionPanel,
} from "../../components/dsm/index";
import { useTopicReviewTasks } from "../../hooks/useTopicReviewTasks";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "../../styles/dsm/Workbench.css";

export default function TopicReviewWorkbench() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const user = outlet.user;
  const showToast = outlet.showToast;

  const {
    openTasks,
    myTasks,
    loadingOpen,
    loadingMine,
    actionTaskId,
    error,
    refresh,
    acceptTask,
    completeTask,
  } = useTopicReviewTasks(user);

  const initialLoadTokenRef = useRef("");
  const accessToken = user?.access_token || "";

  useEffect(() => {
    if (!accessToken) {
      navigate("/");
    }
  }, [accessToken, navigate]);

  const {
    isRefreshing,
    lastUpdatedAt,
    consecutiveFailures,
  } = useAutoRefresh({
    enabled: Boolean(accessToken),
    refresh,
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: initialLoadTokenRef.current !== accessToken,
    onError: (err) => {
      if (import.meta.env.DEV) {
        console.error("Failed to load topic review tasks:", err);
      }
    },
  });

  useEffect(() => {
    if (accessToken) {
      initialLoadTokenRef.current = accessToken;
    }
  }, [accessToken]);

  const handleAccept = async (taskId) => {
    await acceptTask(taskId);
    showToast?.(t("topicReview.acceptedToast"), "success");
  };

  const handleComplete = async (taskId, payload) => {
    await completeTask(taskId, payload);
    showToast?.(
      payload.decision === "reject"
        ? t("topicReview.rejectedToast")
        : t("topicReview.approvedToast"),
      payload.decision === "reject" ? "danger" : "success"
    );
  };

  return (
    <main className="DsmWorkbenchPage">
      <Container className="DsmWorkbench">
        <div className="DsmWorkbench-header">
        <h1>{t("topicReview.title")}</h1>
        <p>{t("topicReview.subtitle")}</p>
      </div>

      <div className="DsmWorkbench-actions" aria-live="polite">
        <span className="DsmWorkbench-refreshState">
          {isRefreshing
            ? t("dsm.refreshing")
            : lastUpdatedAt
              ? t("dsm.lastUpdated", {
                  time: lastUpdatedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("dsm.waitingForRefresh")}
        </span>

        {consecutiveFailures > 0 && (
          <span className="DsmWorkbench-refreshWarning">
            {t("dsm.refreshBackoff")}
          </span>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Tabs defaultActiveKey="available" className="mb-3">
        <Tab eventKey="available" title={t("topicReview.availableTasks")}>
          <LifecycleTaskList
            tasks={openTasks}
            loading={loadingOpen}
            mode="available"
            emptyKey="topicReview.noAvailableTasks"
            actionTaskId={actionTaskId}
            onAccept={handleAccept}
          />
        </Tab>

        <Tab eventKey="mine" title={t("topicReview.myAcceptedTasks")}>
          <LifecycleTaskList
            tasks={myTasks}
            loading={loadingMine}
            mode="mine"
            emptyKey="topicReview.noAcceptedTasks"
            actionTaskId={actionTaskId}
            renderTaskActions={(task) => (
              <TaskDecisionPanel
                task={task}
                actionTaskId={actionTaskId}
                onComplete={handleComplete}
              />
            )}
          />
        </Tab>
      </Tabs>
      </Container>
    </main>
  );
}
