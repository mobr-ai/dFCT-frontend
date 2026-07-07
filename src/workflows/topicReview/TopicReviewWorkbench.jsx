import { useEffect, useRef, useState } from "react";
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

function getTaskType(task) {
  return task?.taskType || task?.task_type || "";
}

function isContributionReviewTask(task) {
  return getTaskType(task) === "contribution_review";
}

function isClaimReviewCurationTask(task) {
  return getTaskType(task) === "claim_review_curation";
}

function getTaskTopicId(task) {
  return (
    task?.topic?.topicId ||
    task?.topicId ||
    task?.contribution?.topicId ||
    task?.claimReview?.topicId ||
    null
  );
}

function taskToastKey(task, decision) {
  if (isClaimReviewCurationTask(task)) {
    return decision === "reject"
      ? "topicReview.claimReviewRejectedToast"
      : "topicReview.claimReviewApprovedToast";
  }

  if (isContributionReviewTask(task)) {
    return decision === "reject"
      ? "topicReview.contributionRejectedToast"
      : "topicReview.contributionApprovedToast";
  }

  return decision === "reject"
    ? "topicReview.rejectedToast"
    : "topicReview.approvedToast";
}

function dispatchTopicLifecycleUpdated(topicId) {
  if (!topicId || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("dfct:topic-lifecycle-updated", {
      detail: { topicId },
    })
  );
}

export default function TopicReviewWorkbench() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const user = outlet.user;
  const showToast = outlet.showToast;

  const {
    openTasks,
    myTasks,
    completedTasks,
    loadingOpen,
    loadingMine,
    loadingCompleted,
    actionTaskId,
    error,
    refresh,
    acceptTask,
    completeTask,
  } = useTopicReviewTasks(user);

  const initialLoadTokenRef = useRef("");
  const accessToken = user?.access_token || "";
  const [activeTab, setActiveTab] = useState("available");
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      navigate("/");
    }
  }, [accessToken, navigate]);

  const { consecutiveFailures } = useAutoRefresh({
    enabled: Boolean(accessToken),
    refresh: () => refresh({ silent: true }),
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: initialLoadTokenRef.current !== accessToken,
    onError: (err) => {
      if (import.meta.env.DEV) {
        console.error("Failed to load review workbench tasks:", err);
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
    setHighlightedTaskId(taskId);
    setActiveTab("mine");
    showToast?.(t("topicReview.acceptedToast"), "success");
  };

  const handleComplete = async (task, taskId, payload) => {
    const result = await completeTask(taskId, payload);
    const topicId = getTaskTopicId(result) || getTaskTopicId(task);

    dispatchTopicLifecycleUpdated(topicId);
    setHighlightedTaskId(taskId);
    setActiveTab("completed");

    showToast?.(
      t(taskToastKey(task, payload.decision)),
      payload.decision === "reject" ? "danger" : "success"
    );
  };

  return (
    <main className="DsmWorkbenchPage">
      <Container className="DsmWorkbench">
        <div className="DsmWorkbench-header">
          <span className="DsmWorkbench-eyebrow">
            {t("topicReview.eyebrow")}
          </span>
          <h1>{t("topicReview.title")}</h1>
          <p>{t("topicReview.subtitle")}</p>
        </div>

        {consecutiveFailures > 0 && (
          <div className="DsmWorkbench-actions" aria-live="polite">
            <span className="DsmWorkbench-refreshWarning">
              {t("dsm.refreshBackoff")}
            </span>
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        <Tabs
          activeKey={activeTab}
          onSelect={(key) => {
            if (key) setActiveTab(key);
          }}
          className="DsmWorkbench-tabs mb-3"
        >
          <Tab
            eventKey="available"
            title={t("topicReview.availableTasksCount", {
              count: openTasks.length,
            })}
          >
            <LifecycleTaskList
              tasks={openTasks}
              loading={loadingOpen}
              mode="available"
              emptyKey="topicReview.noAvailableReviewTasks"
              actionTaskId={actionTaskId}
              highlightedTaskId={highlightedTaskId}
              onAccept={handleAccept}
            />
          </Tab>

          <Tab
            eventKey="mine"
            title={t("topicReview.myAcceptedTasksCount", {
              count: myTasks.length,
            })}
          >
            <LifecycleTaskList
              tasks={myTasks}
              loading={loadingMine}
              mode="mine"
              emptyKey="topicReview.noAcceptedReviewTasks"
              actionTaskId={actionTaskId}
              highlightedTaskId={highlightedTaskId}
              renderTaskActions={(task) => (
                <TaskDecisionPanel
                  task={task}
                  actionTaskId={actionTaskId}
                  onComplete={(taskId, payload) =>
                    handleComplete(task, taskId, payload)
                  }
                />
              )}
            />
          </Tab>

          <Tab
            eventKey="completed"
            title={t("topicReview.completedTasksCount", {
              count: completedTasks.length,
            })}
          >
            <LifecycleTaskList
              tasks={completedTasks}
              loading={loadingCompleted}
              mode="completed"
              emptyKey="topicReview.noCompletedReviewTasks"
              actionTaskId={actionTaskId}
              highlightedTaskId={highlightedTaskId}
            />
          </Tab>
        </Tabs>
      </Container>
    </main>
  );
}
