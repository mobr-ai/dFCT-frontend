const CLAIM_VERIFICATION_TIMEOUT = {
  response: 10000,
  deadline: 20000,
};

function normalizeClaimSummary(summary = {}) {
  const agreeCount = Number(summary.agreeCount ?? summary.agree_count ?? 0);
  const disagreeCount = Number(summary.disagreeCount ?? summary.disagree_count ?? 0);
  const totalVotes = Number(
    summary.totalVotes ?? summary.total_votes ?? agreeCount + disagreeCount
  );

  return {
    ...summary,
    claimId: Number(summary.claimId ?? summary.claim_id),
    topicId: Number(summary.topicId ?? summary.topic_id),
    agreeCount,
    disagreeCount,
    totalVotes,
    agreeRatio: Number(
      summary.agreeRatio ??
        summary.agree_ratio ??
        (totalVotes ? agreeCount / totalVotes : 0)
    ),
    disagreeRatio: Number(
      summary.disagreeRatio ??
        summary.disagree_ratio ??
        (totalVotes ? disagreeCount / totalVotes : 0)
    ),
    currentUserVote: summary.currentUserVote ?? summary.current_user_vote ?? null,
  };
}

export function normalizeVerificationSummary(body = {}) {
  const claims = Array.isArray(body.claims)
    ? body.claims.map(normalizeClaimSummary)
    : [];

  const agreeCount = Number(
    body.agreeCount ??
      body.agree_count ??
      claims.reduce((sum, claim) => sum + claim.agreeCount, 0)
  );
  const disagreeCount = Number(
    body.disagreeCount ??
      body.disagree_count ??
      claims.reduce((sum, claim) => sum + claim.disagreeCount, 0)
  );
  const totalVotes = Number(
    body.totalVotes ?? body.total_votes ?? agreeCount + disagreeCount
  );

  return {
    ...body,
    topicId: Number(body.topicId ?? body.topic_id),
    topicStatus: body.topicStatus ?? body.topic_status,
    claimCount: Number(body.claimCount ?? body.claim_count ?? claims.length),
    agreeCount,
    disagreeCount,
    totalVotes,
    agreeRatio: Number(
      body.agreeRatio ??
        body.agree_ratio ??
        (totalVotes ? agreeCount / totalVotes : 0)
    ),
    claims,
  };
}

export async function fetchTopicVerificationSummary(authRequest, topicId) {
  const res = await authRequest
    .get(`/api/topics/${topicId}/verification-summary`)
    .timeout(CLAIM_VERIFICATION_TIMEOUT);

  return normalizeVerificationSummary(res.body || {});
}

export async function castClaimVote(authRequest, claimId, vote) {
  const res = await authRequest
    .post(`/api/claims/${claimId}/votes`)
    .send({ vote })
    .timeout(CLAIM_VERIFICATION_TIMEOUT);

  return {
    ...res.body,
    summary: normalizeClaimSummary(res.body?.summary || {}),
  };
}
