export const TOPIC_REVIEW_TASK_TYPE = "topic_review";

const LIFECYCLE_REQUEST_TIMEOUT = {
  response: 10000,
  deadline: 20000,
};

function normalizeTaskList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.tasks)) return body.tasks;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function withLifecycleTimeout(req) {
  return req.timeout(LIFECYCLE_REQUEST_TIMEOUT);
}

export async function getOpenLifecycleTasks(authRequest, {
  taskType = TOPIC_REVIEW_TASK_TYPE,
} = {}) {
  const query = new URLSearchParams({ taskType }).toString();
  const res = await withLifecycleTimeout(
    authRequest.get(`/api/lifecycle-tasks/open?${query}`)
  );

  return normalizeTaskList(res.body);
}

export async function getMyLifecycleTasks(authRequest, {
  status = "accepted",
  taskType = TOPIC_REVIEW_TASK_TYPE,
} = {}) {
  const query = new URLSearchParams({ status, taskType }).toString();
  const res = await withLifecycleTimeout(
    authRequest.get(`/api/lifecycle-tasks/mine?${query}`)
  );

  return normalizeTaskList(res.body);
}

export async function acceptLifecycleTask(authRequest, taskId) {
  const res = await withLifecycleTimeout(
    authRequest.post(`/api/lifecycle-tasks/${taskId}/accept`)
  );

  return res.body;
}

export async function completeLifecycleTask(authRequest, taskId, {
  decision,
  reason = "",
  notes = "",
} = {}) {
  const res = await withLifecycleTimeout(
    authRequest
      .post(`/api/lifecycle-tasks/${taskId}/complete`)
      .send({
        decision,
        reason,
        notes,
      })
  );

  return res.body;
}
