import Spinner from "react-bootstrap/Spinner";

export default function AdminSyncPill({
  isRefreshing = false,
  lastUpdatedAt = null,
  syncingLabel,
  waitingLabel,
  syncedAtLabel,
  className = "",
}) {
  const time = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const label = isRefreshing
    ? syncingLabel
    : time
      ? syncedAtLabel(time)
      : waitingLabel;

  return (
    <span
      className={`DfctAdminWorkflow-sync ${className}`.trim()}
      aria-live="polite"
      aria-busy={isRefreshing}
    >
      {isRefreshing ? (
        <Spinner
          className="DfctAdminWorkflow-syncSpinner"
          animation="border"
          size="sm"
          aria-hidden="true"
        />
      ) : (
        <span
          className="DfctAdminWorkflow-syncDot"
          aria-hidden="true"
        />
      )}

      <span>{label}</span>
    </span>
  );
}
