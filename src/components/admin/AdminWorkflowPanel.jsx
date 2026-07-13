import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";

import { useAdminWorkflow } from "../../hooks/useAdminWorkflow";

const WORKFLOW_VIEWS = ["overview", "queue", "reviewers"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatAge(hours, t) {
  const value = Number(hours);
  if (!Number.isFinite(value)) return "—";
  if (value < 1) return t("adminWorkflow.time.lessThanHour");
  if (value < 24) {
    return t("adminWorkflow.time.hours", { count: Math.max(1, Math.round(value)) });
  }
  return t("adminWorkflow.time.days", { count: Math.max(1, Math.round(value / 24)) });
}

function userLabel(user, t) {
  return (
    user?.displayName ||
    user?.username ||
    user?.email ||
    (user?.userId ? t("adminWorkflow.userFallback", { id: user.userId }) : "—")
  );
}

function taskTopicLabel(task, t) {
  return (
    task?.topic?.title ||
    task?.metadata?.topicTitle ||
    (task?.topicId ? t("adminWorkflow.topicFallback", { id: task.topicId }) : "—")
  );
}

function taskTypeLabel(taskType, t) {
  const key = String(taskType || "unknown");
  return t(`adminWorkflow.taskTypes.${key}`, {
    defaultValue: key.replaceAll("_", " "),
  });
}

function productStatusLabel(status, t) {
  const key = String(status || "unknown");
  return t(`adminWorkflow.statuses.${key}`, {
    defaultValue: key.replaceAll("_", " "),
  });
}

function statusTone(status) {
  const value = String(status || "").toLowerCase();
  if (value === "completed") return "success";
  if (value === "claimed" || value === "in_review") return "primary";
  if (value === "expired" || value === "cancelled") return "secondary";
  if (value === "needs_attention") return "danger";
  return "warning";
}

function availabilityTone(value) {
  const availability = String(value || "").toLowerCase();
  if (availability === "available") return "success";
  if (availability === "busy") return "warning";
  return "secondary";
}

function attentionLabel(reason, t) {
  const key = String(reason || "unknown");
  return t(`adminWorkflow.attentionReasons.${key}`, {
    defaultValue: key.replaceAll("_", " "),
  });
}

function roleKey(role) {
  return role?.role?.key || role?.roleKey || role?.role_key || "reviewer";
}

function roleId(role) {
  return role?.userRoleId ?? role?.user_role_id ?? role?.id ?? null;
}

function roleScopeLabel(role, t) {
  if (role?.scopeType === "topic" && role?.scopeId) {
    return t("adminWorkflow.roles.topicScope", { id: role.scopeId });
  }
  return t("adminWorkflow.roles.globalScope");
}

function WorkflowStat({ label, value, caption, tone }) {
  return (
    <div className={`DfctAdmin-stat ${tone ? `DfctAdmin-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}

function TaskTopicLink({ task, t }) {
  const topicId = task?.topicId;
  const topicOwner = task?.topic?.proposedBy;
  const label = taskTopicLabel(task, t);

  if (!topicId || !topicOwner) return <strong>{label}</strong>;

  return (
    <Link className="DfctAdminWorkflow-topicLink" to={`/t/${topicOwner}/${topicId}`}>
      {label}
    </Link>
  );
}

function AttentionFeed({ items, t, onInspect, onOffer, actionLoading }) {
  if (!items.length) {
    return (
      <div className="DfctAdminWorkflow-emptyState">
        <strong>{t("adminWorkflow.attentionEmptyTitle")}</strong>
        <p>{t("adminWorkflow.attentionEmptyText")}</p>
      </div>
    );
  }

  return (
    <div className="DfctAdminWorkflow-attentionList">
      {items.map((task) => (
        <article key={task.taskId} className="DfctAdminWorkflow-attentionCard">
          <div className="DfctAdminWorkflow-attentionMain">
            <div className="DfctAdminWorkflow-taskHeading">
              <TaskTopicLink task={task} t={t} />
              <Badge bg={statusTone(task.productStatus)}>
                {productStatusLabel(task.productStatus, t)}
              </Badge>
            </div>
            <p>
              {taskTypeLabel(task.taskType, t)} · {formatAge(task.ageHours, t)}
            </p>
            <div className="DfctAdminWorkflow-reasonList">
              {asArray(task.attentionReasons).map((reason) => (
                <span key={reason}>{attentionLabel(reason, t)}</span>
              ))}
            </div>
          </div>
          <div className="DfctAdminWorkflow-cardActions">
            <Button size="sm" variant="outline-secondary" onClick={() => onInspect(task)}>
              {t("adminWorkflow.actions.inspect")}
            </Button>
            {task.canOffer ? (
              <Button
                size="sm"
                variant="primary"
                disabled={actionLoading === `offer:${task.taskId}`}
                onClick={() => onOffer(task)}
              >
                {actionLoading === `offer:${task.taskId}` ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  t("adminWorkflow.actions.reoffer")
                )}
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function TaskTable({ tasks, t, onInspect, onOffer, actionLoading }) {
  if (!tasks.length) {
    return (
      <div className="DfctAdminWorkflow-emptyState">
        <strong>{t("adminWorkflow.queueEmptyTitle")}</strong>
        <p>{t("adminWorkflow.queueEmptyText")}</p>
      </div>
    );
  }

  return (
    <div className="DfctAdmin-tableWrap DfctAdminWorkflow-tableWrap">
      <table className="DfctAdmin-table DfctAdminWorkflow-table">
        <thead>
          <tr>
            <th>{t("adminWorkflow.columns.topic")}</th>
            <th>{t("adminWorkflow.columns.topicId")}</th>
            <th>{t("adminWorkflow.columns.stage")}</th>
            <th>{t("adminWorkflow.columns.status")}</th>
            <th>{t("adminWorkflow.columns.coverage")}</th>
            <th>{t("adminWorkflow.columns.acceptedReviewer")}</th>
            <th>{t("adminWorkflow.columns.ageDeadline")}</th>
            <th>{t("adminWorkflow.columns.notifications")}</th>
            <th>{t("adminWorkflow.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.taskId} className={task.needsAttention ? "needs-attention" : ""}>
              <td>
                <TaskTopicLink task={task} t={t} />
                <small>{t("adminWorkflow.inspect.taskId")} #{task.taskId}</small>
              </td>
              <td><strong>#{task.topicId || "—"}</strong></td>
              <td>{taskTypeLabel(task.taskType, t)}</td>
              <td>
                <Badge bg={statusTone(task.productStatus)}>
                  {productStatusLabel(task.productStatus, t)}
                </Badge>
              </td>
              <td>
                <strong>{task.eligibleReviewerCount ?? 0}</strong>
                <small>{t("adminWorkflow.coverageEligible")}</small>
              </td>
              <td>{userLabel(task.acceptedReviewer, t)}</td>
              <td>
                <strong>{formatAge(task.ageHours, t)}</strong>
                <small>{formatDate(task.deadlineAt)}</small>
              </td>
              <td>
                <strong>{task.notification?.count ?? 0}</strong>
                <small>
                  {task.notification?.hasFailure
                    ? t("adminWorkflow.notificationFailed")
                    : task.notification?.latestStatus || t("adminWorkflow.notificationNone")}
                </small>
              </td>
              <td>
                <div className="DfctAdminWorkflow-rowActions">
                  <Button size="sm" variant="outline-secondary" onClick={() => onInspect(task)}>
                    {t("adminWorkflow.actions.inspect")}
                  </Button>
                  {task.canOffer ? (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={actionLoading === `offer:${task.taskId}`}
                      onClick={() => onOffer(task)}
                    >
                      {actionLoading === `offer:${task.taskId}` ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        t("adminWorkflow.actions.reoffer")
                      )}
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewerTable({ reviewers, t, onGrant, onRevoke, actionLoading }) {
  if (!reviewers.length) {
    return (
      <div className="DfctAdminWorkflow-emptyState">
        <strong>{t("adminWorkflow.reviewersEmptyTitle")}</strong>
        <p>{t("adminWorkflow.reviewersEmptyText")}</p>
      </div>
    );
  }

  return (
    <div className="DfctAdmin-tableWrap DfctAdminWorkflow-tableWrap">
      <table className="DfctAdmin-table DfctAdminWorkflow-table">
        <thead>
          <tr>
            <th>{t("adminWorkflow.columns.reviewer")}</th>
            <th>{t("adminWorkflow.columns.roles")}</th>
            <th>{t("adminWorkflow.columns.availability")}</th>
            <th>{t("adminWorkflow.columns.openAssignments")}</th>
            <th>{t("adminWorkflow.columns.completedReviews")}</th>
            <th>{t("adminWorkflow.columns.lastActivity")}</th>
            <th>{t("adminWorkflow.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {reviewers.map((reviewer) => {
            const roles = asArray(reviewer.roles);
            return (
              <tr key={reviewer.userId}>
                <td>
                  <strong>{userLabel(reviewer, t)}</strong>
                  <small>{reviewer.email || t("adminWorkflow.noEmail")}</small>
                </td>
                <td>
                  <div className="DfctAdminWorkflow-roleList">
                    {roles.length ? roles.map((role) => (
                      <span key={roleId(role) || `${roleKey(role)}:${role.scopeId || "global"}`}>
                        <Badge bg="secondary">{t(`adminWorkflow.roles.${roleKey(role)}`, {
                          defaultValue: roleKey(role).replaceAll("_", " "),
                        })}</Badge>
                        <small>{roleScopeLabel(role, t)}</small>
                        {roleId(role) ? (
                          <button
                            type="button"
                            disabled={actionLoading === `revoke:${roleId(role)}`}
                            onClick={() => onRevoke(reviewer, role)}
                            aria-label={t("adminWorkflow.actions.revokeRole")}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    )) : <small>{t("adminWorkflow.roles.none")}</small>}
                  </div>
                </td>
                <td>
                  <Badge bg={availabilityTone(reviewer.availability)}>
                    {t(`adminWorkflow.availability.${reviewer.availability || "unknown"}`, {
                      defaultValue: reviewer.availability || "unknown",
                    })}
                  </Badge>
                </td>
                <td>{reviewer.openAssignments ?? 0}</td>
                <td>{reviewer.completedReviews ?? 0}</td>
                <td>{formatDate(reviewer.lastActivityAt)}</td>
                <td>
                  <Button size="sm" variant="outline-primary" onClick={() => onGrant(reviewer)}>
                    {t("adminWorkflow.actions.grantRole")}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminWorkflowPanel({ t, user, showToast }) {
  const workflow = useAdminWorkflow(user, showToast, t);
  const [activeView, setActiveView] = useState("overview");
  const [selectedTask, setSelectedTask] = useState(null);
  const [offerTask, setOfferTask] = useState(null);
  const [offerReason, setOfferReason] = useState("");
  const [grantReviewer, setGrantReviewer] = useState(null);
  const [grantForm, setGrantForm] = useState({
    roleKey: "reviewer",
    scopeType: "global",
    scopeId: "",
    reason: "",
  });
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");

  const attention = useMemo(
    () => asArray(workflow.summary?.attention),
    [workflow.summary],
  );
  const health = workflow.summary?.health || {};
  const taskFilterReadyRef = useRef(false);
  const reviewerSearchReadyRef = useRef(false);

  useEffect(() => {
    if (!taskFilterReadyRef.current) {
      taskFilterReadyRef.current = true;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void workflow.loadTasks({ silent: true, filters: workflow.taskFilters });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [workflow.taskFilters]);

  useEffect(() => {
    if (!reviewerSearchReadyRef.current) {
      reviewerSearchReadyRef.current = true;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void workflow.loadReviewers({ silent: true, query: workflow.reviewerQuery });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [workflow.reviewerQuery]);

  const openOffer = (task) => {
    setOfferTask(task);
    setOfferReason("");
  };

  const submitOffer = async () => {
    if (!offerTask || !offerReason.trim()) return;
    const result = await workflow.offerTask(offerTask.taskId, offerReason);
    if (result) {
      setOfferTask(null);
      setOfferReason("");
    }
  };

  const openGrant = (reviewer) => {
    setGrantReviewer(reviewer);
    setGrantForm({
      roleKey: "reviewer",
      scopeType: "global",
      scopeId: "",
      reason: "",
    });
  };

  const submitGrant = async () => {
    if (!grantReviewer || !grantForm.reason.trim()) return;
    if (grantForm.scopeType === "topic" && !String(grantForm.scopeId).trim()) return;

    const result = await workflow.grantReviewerRole({
      userId: grantReviewer.userId,
      roleKey: grantForm.roleKey,
      scopeType: grantForm.scopeType === "topic" ? "topic" : null,
      scopeId: grantForm.scopeType === "topic" ? String(grantForm.scopeId).trim() : null,
      reason: grantForm.reason.trim(),
    });

    if (result) setGrantReviewer(null);
  };

  const openRevoke = (reviewer, role) => {
    setRevokeTarget({ reviewer, role });
    setRevokeReason("");
  };

  const submitRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    const result = await workflow.revokeReviewerRole(
      revokeTarget.role,
      revokeReason,
    );
    if (result) setRevokeTarget(null);
  };

  const syncLabel = workflow.lastUpdatedAt
    ? t("adminWorkflow.syncedAt", {
        time: workflow.lastUpdatedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : t("adminWorkflow.syncWaiting");



  return (
    <div className="DfctAdminConsole-panel DfctAdminWorkflow">
      <div className="DfctAdmin-header DfctAdminConsole-panelHeader">
        <div>
          <span className="DfctAdmin-eyebrow">{t("adminWorkflow.eyebrow")}</span>
          <h1>{t("adminWorkflow.title")}</h1>
          <p>{t("adminWorkflow.subtitle")}</p>
          <small className="DfctAdminWorkflow-poweredBy">
            {t("adminWorkflow.poweredBy")}
          </small>
        </div>
        <div className="DfctAdminWorkflow-headerActions">
          <span className="DfctAdminWorkflow-sync">
            {workflow.isRefreshing ? <Spinner size="sm" animation="border" /> : null}
            {syncLabel}
          </span>
        </div>
      </div>

      <div className="DfctAdmin-tabs nav nav-tabs DfctAdminConsole-subtabs" role="tablist">
        {WORKFLOW_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            className={`nav-link ${activeView === view ? "active" : ""}`}
            onClick={() => setActiveView(view)}
            role="tab"
            aria-selected={activeView === view}
          >
            {t(`adminWorkflow.views.${view}`)}
          </button>
        ))}
      </div>

      {workflow.accessDenied ? (
        <Alert variant="danger">{t("adminWorkflow.accessDenied")}</Alert>
      ) : null}
      {workflow.error ? (
        <Alert variant="danger" dismissible onClose={() => workflow.setError("")}>
          {workflow.error}
        </Alert>
      ) : null}
      {workflow.summary?.recovery?.changed ? (
        <Alert variant="info" className="DfctAdminWorkflow-recoveryNotice">
          {t("adminWorkflow.recoveryNotice", {
            assignments: workflow.summary.recovery.expiredAssignments || 0,
            tasks: workflow.summary.recovery.reopenedTasks || 0,
          })}
        </Alert>
      ) : null}

      {activeView === "overview" ? (
        <>
          <section className="DfctAdmin-section">
            <div className="DfctAdmin-sectionHeader">
              <span className="DfctAdmin-eyebrow">{t("adminWorkflow.healthEyebrow")}</span>
              <h2>{t("adminWorkflow.healthTitle")}</h2>
              <p>{t("adminWorkflow.healthSubtitle")}</p>
            </div>

            <div className="DfctAdmin-statGrid">
              <WorkflowStat
                label={t("adminWorkflow.health.awaitingReview")}
                value={health.awaitingReview}
                caption={t("adminWorkflow.health.awaitingReviewCaption")}
                tone="warning"
              />
              <WorkflowStat
                label={t("adminWorkflow.health.noReviewerAvailable")}
                value={health.noReviewerAvailable}
                caption={t("adminWorkflow.health.noReviewerAvailableCaption")}
                tone="danger"
              />
              <WorkflowStat
                label={t("adminWorkflow.health.inProgress")}
                value={health.inProgress}
                caption={t("adminWorkflow.health.inProgressCaption")}
                tone="info"
              />
              <WorkflowStat
                label={t("adminWorkflow.health.atRiskOrExpired")}
                value={health.atRiskOrExpired}
                caption={t("adminWorkflow.health.atRiskOrExpiredCaption")}
                tone="danger"
              />
            </div>
          </section>

          <section className="DfctAdmin-section">
            <div className="DfctAdmin-sectionHeader DfctAdminWorkflow-sectionHeaderSplit">
              <div>
                <span className="DfctAdmin-eyebrow">{t("adminWorkflow.attentionEyebrow")}</span>
                <h2>{t("adminWorkflow.attentionTitle")}</h2>
                <p>{t("adminWorkflow.attentionSubtitle", {
                  count: workflow.summary?.attentionCount || 0,
                })}</p>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => setActiveView("queue")}>
                {t("adminWorkflow.actions.openQueue")}
              </Button>
            </div>
            {workflow.summaryLoading && !workflow.summary ? (
              <div className="DfctAdminWorkflow-loading">
                <Spinner animation="border" size="sm" />
                <span>{t("adminWorkflow.loading")}</span>
              </div>
            ) : (
              <AttentionFeed
                items={attention}
                t={t}
                onInspect={setSelectedTask}
                onOffer={openOffer}
                actionLoading={workflow.actionLoading}
              />
            )}
          </section>
        </>
      ) : null}

      {activeView === "queue" ? (
        <section className="DfctAdmin-section">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">{t("adminWorkflow.queueEyebrow")}</span>
            <h2>{t("adminWorkflow.queueTitle")}</h2>
            <p>{t("adminWorkflow.queueSubtitle")}</p>
          </div>

          <Form className="DfctAdminWorkflow-filters" onSubmit={(event) => event.preventDefault()}>
            <Form.Group>
              <Form.Label>{t("adminWorkflow.filters.status")}</Form.Label>
              <Form.Select
                value={workflow.taskFilters.status}
                onChange={(event) => workflow.setTaskFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))}
              >
                <option value="all">{t("adminWorkflow.filters.allStatuses")}</option>
                <option value="open">{t("adminWorkflow.rawStatuses.open")}</option>
                <option value="assigned">{t("adminWorkflow.rawStatuses.assigned")}</option>
                <option value="completed">{t("adminWorkflow.rawStatuses.completed")}</option>
                <option value="expired">{t("adminWorkflow.rawStatuses.expired")}</option>
                <option value="cancelled">{t("adminWorkflow.rawStatuses.cancelled")}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("adminWorkflow.filters.taskType")}</Form.Label>
              <Form.Select
                value={workflow.taskFilters.taskType}
                onChange={(event) => workflow.setTaskFilters((current) => ({
                  ...current,
                  taskType: event.target.value,
                }))}
              >
                <option value="all">{t("adminWorkflow.filters.allTaskTypes")}</option>
                <option value="topic_review">{t("adminWorkflow.taskTypes.topic_review")}</option>
                <option value="contribution_review">{t("adminWorkflow.taskTypes.contribution_review")}</option>
                <option value="claim_review_curation">{t("adminWorkflow.taskTypes.claim_review_curation")}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="DfctAdminWorkflow-searchField">
              <Form.Label>{t("adminWorkflow.filters.search")}</Form.Label>
              <Form.Control
                type="search"
                value={workflow.taskFilters.query}
                placeholder={t("adminWorkflow.filters.searchPlaceholder")}
                onChange={(event) => workflow.setTaskFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("adminWorkflow.filters.topicId")}</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={workflow.taskFilters.topicId}
                placeholder={t("adminWorkflow.filters.topicIdPlaceholder")}
                onChange={(event) => workflow.setTaskFilters((current) => ({
                  ...current,
                  topicId: event.target.value,
                }))}
              />
            </Form.Group>
          </Form>

          <TaskTable
            tasks={workflow.tasks}
            t={t}
            onInspect={setSelectedTask}
            onOffer={openOffer}
            actionLoading={workflow.actionLoading}
          />
        </section>
      ) : null}

      {activeView === "reviewers" ? (
        <section className="DfctAdmin-section">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">{t("adminWorkflow.reviewersEyebrow")}</span>
            <h2>{t("adminWorkflow.reviewersTitle")}</h2>
            <p>{t("adminWorkflow.reviewersSubtitle")}</p>
          </div>

          <Form className="DfctAdminWorkflow-reviewerSearch" onSubmit={(event) => event.preventDefault()}>
            <Form.Control
              type="search"
              value={workflow.reviewerQuery}
              placeholder={t("adminWorkflow.reviewersSearchPlaceholder")}
              onChange={(event) => workflow.setReviewerQuery(event.target.value)}
            />
            {workflow.reviewerQuery ? (
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  workflow.setReviewerQuery("");
                }}
              >
                {t("adminWorkflow.actions.clear")}
              </Button>
            ) : null}
          </Form>

          <ReviewerTable
            reviewers={workflow.reviewers}
            t={t}
            onGrant={openGrant}
            onRevoke={openRevoke}
            actionLoading={workflow.actionLoading}
          />
        </section>
      ) : null}

      <Modal
        show={Boolean(selectedTask)}
        onHide={() => setSelectedTask(null)}
        centered
        size="lg"
        className="DfctAdminWorkflow-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("adminWorkflow.inspect.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask ? (
            <div className="DfctAdminWorkflow-inspectGrid">
              <div><span>{t("adminWorkflow.columns.topic")}</span><strong>{taskTopicLabel(selectedTask, t)}</strong></div>
              <div><span>{t("adminWorkflow.inspect.taskId")}</span><strong>#{selectedTask.taskId}</strong></div>
              <div><span>{t("adminWorkflow.columns.stage")}</span><strong>{taskTypeLabel(selectedTask.taskType, t)}</strong></div>
              <div><span>{t("adminWorkflow.columns.status")}</span><strong>{productStatusLabel(selectedTask.productStatus, t)}</strong></div>
              <div><span>{t("adminWorkflow.columns.coverage")}</span><strong>{selectedTask.eligibleReviewerCount ?? 0}</strong></div>
              <div><span>{t("adminWorkflow.columns.acceptedReviewer")}</span><strong>{userLabel(selectedTask.acceptedReviewer, t)}</strong></div>
              <div><span>{t("adminWorkflow.inspect.createdAt")}</span><strong>{formatDate(selectedTask.createdAt)}</strong></div>
              <div><span>{t("adminWorkflow.inspect.deadlineAt")}</span><strong>{formatDate(selectedTask.deadlineAt)}</strong></div>
            </div>
          ) : null}

          {selectedTask?.attentionReasons?.length ? (
            <div className="DfctAdminWorkflow-modalSection">
              <h4>{t("adminWorkflow.inspect.attention")}</h4>
              <div className="DfctAdminWorkflow-reasonList">
                {selectedTask.attentionReasons.map((reason) => (
                  <span key={reason}>{attentionLabel(reason, t)}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="DfctAdminWorkflow-modalSection">
            <h4>{t("adminWorkflow.inspect.audit")}</h4>
            {asArray(selectedTask?.metadata?.adminWorkflowAudit).length ? (
              <div className="DfctAdminWorkflow-auditList">
                {asArray(selectedTask.metadata.adminWorkflowAudit).slice().reverse().map((event, index) => (
                  <div key={`${event.timestamp || "audit"}:${index}`}>
                    <strong>{event.type || event.result || t("adminWorkflow.inspect.auditEvent")}</strong>
                    <span>{formatDate(event.timestamp)}</span>
                    <p>{event.reason || t("adminWorkflow.inspect.noReason")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="DfctAdminWorkflow-muted">{t("adminWorkflow.inspect.auditEmpty")}</p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedTask(null)}>
            {t("adminWorkflow.actions.close")}
          </Button>
          {selectedTask?.canOffer ? (
            <Button
              variant="primary"
              onClick={() => {
                openOffer(selectedTask);
                setSelectedTask(null);
              }}
            >
              {t("adminWorkflow.actions.reoffer")}
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(offerTask)} onHide={() => setOfferTask(null)} centered className="DfctAdminWorkflow-modal">
        <Modal.Header closeButton>
          <Modal.Title>{t("adminWorkflow.offer.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("adminWorkflow.offer.text", { topic: taskTopicLabel(offerTask, t) })}</p>
          <Form.Group>
            <Form.Label>{t("adminWorkflow.fields.reason")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={offerReason}
              placeholder={t("adminWorkflow.offer.reasonPlaceholder")}
              onChange={(event) => setOfferReason(event.target.value)}
            />
            <Form.Text>{t("adminWorkflow.fields.reasonAuditHint")}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOfferTask(null)}>{t("adminWorkflow.actions.cancel")}</Button>
          <Button
            variant="primary"
            disabled={!offerReason.trim() || workflow.actionLoading === `offer:${offerTask?.taskId}`}
            onClick={submitOffer}
          >
            {workflow.actionLoading === `offer:${offerTask?.taskId}` ? <Spinner size="sm" animation="border" /> : t("adminWorkflow.actions.confirmOffer")}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(grantReviewer)} onHide={() => setGrantReviewer(null)} centered className="DfctAdminWorkflow-modal">
        <Modal.Header closeButton>
          <Modal.Title>{t("adminWorkflow.grant.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("adminWorkflow.grant.text", { reviewer: userLabel(grantReviewer, t) })}</p>
          <Form.Group className="mb-3">
            <Form.Label>{t("adminWorkflow.fields.role")}</Form.Label>
            <Form.Select
              value={grantForm.roleKey}
              onChange={(event) => setGrantForm((current) => ({ ...current, roleKey: event.target.value }))}
            >
              <option value="reviewer">{t("adminWorkflow.roles.reviewer")}</option>
              <option value="moderator">{t("adminWorkflow.roles.moderator")}</option>
              <option value="expert_reviewer">{t("adminWorkflow.roles.expert_reviewer")}</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("adminWorkflow.fields.scope")}</Form.Label>
            <Form.Select
              value={grantForm.scopeType}
              onChange={(event) => setGrantForm((current) => ({ ...current, scopeType: event.target.value, scopeId: "" }))}
            >
              <option value="global">{t("adminWorkflow.roles.globalScope")}</option>
              <option value="topic">{t("adminWorkflow.roles.topicScoped")}</option>
            </Form.Select>
          </Form.Group>
          {grantForm.scopeType === "topic" ? (
            <Form.Group className="mb-3">
              <Form.Label>{t("adminWorkflow.filters.topicId")}</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={grantForm.scopeId}
                onChange={(event) => setGrantForm((current) => ({ ...current, scopeId: event.target.value }))}
              />
            </Form.Group>
          ) : null}
          <Form.Group>
            <Form.Label>{t("adminWorkflow.fields.reason")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={grantForm.reason}
              placeholder={t("adminWorkflow.grant.reasonPlaceholder")}
              onChange={(event) => setGrantForm((current) => ({ ...current, reason: event.target.value }))}
            />
            <Form.Text>{t("adminWorkflow.fields.reasonAuditHint")}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setGrantReviewer(null)}>{t("adminWorkflow.actions.cancel")}</Button>
          <Button
            variant="primary"
            disabled={!grantForm.reason.trim() || (grantForm.scopeType === "topic" && !String(grantForm.scopeId).trim()) || workflow.actionLoading === "grantRole"}
            onClick={submitGrant}
          >
            {workflow.actionLoading === "grantRole" ? <Spinner size="sm" animation="border" /> : t("adminWorkflow.actions.confirmGrant")}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(revokeTarget)} onHide={() => setRevokeTarget(null)} centered className="DfctAdminWorkflow-modal">
        <Modal.Header closeButton>
          <Modal.Title>{t("adminWorkflow.revoke.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t("adminWorkflow.revoke.text", {
            reviewer: userLabel(revokeTarget?.reviewer, t),
            role: t(`adminWorkflow.roles.${roleKey(revokeTarget?.role)}`, {
              defaultValue: roleKey(revokeTarget?.role).replaceAll("_", " "),
            }),
          })}</p>
          <Form.Group>
            <Form.Label>{t("adminWorkflow.fields.reason")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={revokeReason}
              placeholder={t("adminWorkflow.revoke.reasonPlaceholder")}
              onChange={(event) => setRevokeReason(event.target.value)}
            />
            <Form.Text>{t("adminWorkflow.fields.reasonAuditHint")}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRevokeTarget(null)}>{t("adminWorkflow.actions.cancel")}</Button>
          <Button
            variant="danger"
            disabled={!revokeReason.trim() || workflow.actionLoading === `revoke:${roleId(revokeTarget?.role)}`}
            onClick={submitRevoke}
          >
            {workflow.actionLoading === `revoke:${roleId(revokeTarget?.role)}` ? <Spinner size="sm" animation="border" /> : t("adminWorkflow.actions.confirmRevoke")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
