import { useTranslation } from "react-i18next";

function ProcessingProgress({
  progress = 0,
  status = null,
}) {
  const { t } = useTranslation();

  if (!status) return null;

  const stages = Array.isArray(status.stages)
    ? status.stages
    : [];

  const activeStages = Array.isArray(
    status.activeStages
  )
    ? status.activeStages
    : [];

  const visibleStages = stages.filter(
    (stage) =>
      stage.status === "succeeded" ||
      stage.status === "running"
  );

  return (
    <div
      className="Submission-processing"
      aria-live="polite"
    >
      <div className="Submission-processing-header">
        <span className="Submission-processing-message">
          {t(
            status.messageKey ||
              "topicProcessing.preparing"
          )}
        </span>

        <strong className="Submission-processing-percent">
          {Math.round(progress)}%
        </strong>
      </div>

      <div
        className="Submission-processing-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="Submission-processing-fill"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, progress)
            )}%`,
          }}
        />
      </div>

      {activeStages.length > 1 && (
        <div className="Submission-processing-parallel">
          {t("topicProcessing.parallelWork")}
        </div>
      )}

      <div className="Submission-processing-stages">
        {visibleStages.map((stage) => (
          <div
            key={stage.key}
            className={
              "Submission-processing-stage " +
              `is-${stage.status}`
            }
          >
            <span
              className="Submission-processing-stage-marker"
              aria-hidden="true"
            >
              {stage.status === "succeeded"
                ? "✓"
                : "●"}
            </span>

            <span>
              {t(stage.messageKey)}
            </span>
          </div>
        ))}
      </div>

      <div className="Submission-processing-note">
        {t("topicProcessing.complexityNote")}
      </div>
    </div>
  );
}

export default ProcessingProgress;
