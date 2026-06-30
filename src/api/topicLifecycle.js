const TOPIC_LIFECYCLE_TIMEOUT = {
  response: 10000,
  deadline: 20000,
};

function normalizeLifecyclePayload(body) {
  if (Array.isArray(body)) {
    return {
      topicId: null,
      count: body.length,
      anchorReady: true,
      lifecycleEvents: body,
      events: body,
    };
  }

  const events = Array.isArray(body?.lifecycleEvents)
    ? body.lifecycleEvents
    : Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body?.items)
        ? body.items
        : [];

  return {
    ...body,
    count: Number(body?.count ?? events.length),
    anchorReady: body?.anchorReady ?? true,
    lifecycleEvents: events,
    events,
  };
}

export async function fetchTopicLifecycleEvents(authRequest, topicId, {
  limit = 50,
} = {}) {
  const query = new URLSearchParams({ limit: String(limit) }).toString();
  const res = await authRequest
    .get(`/api/topics/${topicId}/lifecycle-events?${query}`)
    .timeout(TOPIC_LIFECYCLE_TIMEOUT);

  return normalizeLifecyclePayload(res.body);
}
