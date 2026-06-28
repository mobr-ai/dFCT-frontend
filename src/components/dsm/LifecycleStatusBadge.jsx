import Badge from "react-bootstrap/Badge";
import { useTranslation } from "react-i18next";

const STATUS_VARIANTS = {
  open: "secondary",
  accepted: "info",
  completed: "success",
  expired: "dark",
  rejected: "danger",
  approved: "success",
};

export default function LifecycleStatusBadge({ status, taskType }) {
  const { t } = useTranslation();
  const normalizedStatus = String(status || "open").toLowerCase();
  const normalizedType = String(taskType || "").toLowerCase();

  return (
    <Badge
      bg={STATUS_VARIANTS[normalizedStatus] || "secondary"}
      className="DsmStatusBadge"
    >
      {normalizedType
        ? `${t(`dsm.taskTypes.${normalizedType}`, normalizedType)} · `
        : ""}
      {t(`dsm.status.${normalizedStatus}`, normalizedStatus)}
    </Badge>
  );
}
