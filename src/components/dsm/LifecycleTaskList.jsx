import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import { useTranslation } from "react-i18next";
import LifecycleTaskCard from "./LifecycleTaskCard";

export default function LifecycleTaskList({
  tasks,
  loading,
  emptyKey = "dsm.noTasks",
  mode,
  actionTaskId,
  highlightedTaskId,
  onAccept,
  renderTaskActions,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="DsmTaskList-loading">
        <Spinner animation="border" size="sm" /> {t("dsm.loadingTasks")}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return <Alert variant="secondary">{t(emptyKey)}</Alert>;
  }

  return (
    <div className="DsmTaskList">
      {tasks.map((task) => {
        const taskId = task?.id ?? task?.task_id ?? task?.taskId;

        return (
          <LifecycleTaskCard
            key={taskId}
            task={task}
            mode={mode}
            actionTaskId={actionTaskId}
            highlighted={highlightedTaskId === taskId}
            onAccept={onAccept}
          >
            {renderTaskActions?.(task)}
          </LifecycleTaskCard>
        );
      })}
    </div>
  );
}
