import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Stack from "react-bootstrap/Stack";
import { useTranslation } from "react-i18next";
import LifecycleStatusBadge from "./LifecycleStatusBadge";

function getTaskId(task) {
  return task?.id ?? task?.task_id ?? task?.taskId;
}

function getTopicTitle(task) {
  return (
    task?.topic?.title ||
    task?.topic_title ||
    task?.title ||
    task?.metadata?.topic_title ||
    task?.metadata?.title
  );
}

function getTopicDescription(task) {
  return (
    task?.topic?.description ||
    task?.topic_description ||
    task?.description ||
    task?.metadata?.topic_description ||
    task?.metadata?.description
  );
}

function getCreatedAt(task) {
  return task?.created_at || task?.createdAt || task?.metadata?.created_at;
}

export default function LifecycleTaskCard({
  task,
  mode = "available",
  actionTaskId,
  onAccept,
  children,
}) {
  const { t } = useTranslation();
  const taskId = getTaskId(task);
  const title = getTopicTitle(task) || t("dsm.untitledTask");
  const description = getTopicDescription(task);
  const createdAt = getCreatedAt(task);
  const isBusy = actionTaskId === taskId;

  return (
    <Card className="DsmTaskCard">
      <Card.Body>
        <Stack direction="horizontal" gap={2} className="DsmTaskCard-header">
          <LifecycleStatusBadge
            status={task?.status}
            taskType={task?.task_type || task?.taskType}
          />
          {createdAt && (
            <span className="DsmTaskCard-date">
              {new Date(createdAt).toLocaleString()}
            </span>
          )}
        </Stack>

        <Card.Title className="DsmTaskCard-title">{title}</Card.Title>

        {description && (
          <Card.Text className="DsmTaskCard-description">
            {description}
          </Card.Text>
        )}

        {task?.topic_id && (
          <div className="DsmTaskCard-meta">
            {t("topicReview.topicId")}: {task.topic_id}
          </div>
        )}

        {mode === "available" && (
          <Button
            variant="primary"
            disabled={isBusy}
            onClick={() => onAccept?.(taskId)}
          >
            {isBusy ? t("dsm.accepting") : t("dsm.acceptTask")}
          </Button>
        )}

        {children}
      </Card.Body>
    </Card>
  );
}
