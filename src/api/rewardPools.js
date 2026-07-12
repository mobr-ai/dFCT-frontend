import request from "superagent";

function unwrap(response) {
  return response?.body || {};
}

function queryString(params = {}) {
  const clean = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);

  if (!clean.length) return "";
  return `?${new URLSearchParams(clean).toString()}`;
}

function post(authRequest, url, payload = {}) {
  return authRequest.post(url).send(payload).then(unwrap);
}

export const fetchTopicRewardPool = (
  authRequest,
  topicId,
  { authenticated = true } = {},
) => {
  const url = `/api/topics/${topicId}/reward-pool`;
  const req = authenticated
    ? authRequest.get(url)
    : request.get(url).set("Accept", "application/json");

  return req.then(unwrap);
};

export const createTopicRewardPool = (
  authRequest,
  topicId,
  {
    initialAmount,
    idempotencyKey,
    metadata,
  } = {},
) =>
  post(authRequest, `/api/topics/${topicId}/reward-pool`, {
    initialAmount,
    idempotencyKey,
    ...(metadata ? { metadata } : {}),
  });

export const fundTopicRewardPool = (
  authRequest,
  topicId,
  {
    amount,
    idempotencyKey,
    metadata,
  } = {},
) =>
  post(authRequest, `/api/topics/${topicId}/reward-pool/fund`, {
    amount,
    idempotencyKey,
    ...(metadata ? { metadata } : {}),
  });

export const previewTopicRewardDistribution = (
  authRequest,
  topicId,
  {
    amount,
    cutoffEventId,
    idempotencyKey,
    metadata,
  } = {},
) =>
  post(
    authRequest,
    `/api/topics/${topicId}/reward-pool/distributions/preview`,
    {
      amount,
      idempotencyKey,
      ...(cutoffEventId ? { cutoffEventId } : {}),
      ...(metadata ? { metadata } : {}),
    },
  );

export const executeTopicRewardDistribution = (
  authRequest,
  topicId,
  distributionId,
) =>
  post(
    authRequest,
    `/api/topics/${topicId}/reward-pool/distributions`,
    { distributionId },
  );

export const fetchTopicRewardPoolActivity = (
  authRequest,
  topicId,
  { limit = 50 } = {},
) =>
  authRequest
    .get(
      `/api/topics/${topicId}/reward-pool/activity${queryString({ limit })}`,
    )
    .then(unwrap);
