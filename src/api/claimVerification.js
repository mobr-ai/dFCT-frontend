const CLAIM_VERIFICATION_TIMEOUT = {
  response: 10000,
  deadline: 20000,
};

function unwrap(res) {
  return res?.body || {};
}

export async function fetchTopicVerificationSummary(authRequest, topicId) {
  if (!authRequest || !topicId) return null;

  const res = await authRequest
    .get(`/api/topics/${topicId}/verification-summary`)
    .timeout(CLAIM_VERIFICATION_TIMEOUT);

  return unwrap(res);
}

export async function castClaimVote(authRequest, claimId, vote) {
  if (!authRequest || !claimId) {
    throw new Error("Missing claim voting request context");
  }

  const res = await authRequest
    .post(`/api/claims/${claimId}/votes`)
    .send({ vote })
    .timeout(CLAIM_VERIFICATION_TIMEOUT);

  return unwrap(res);
}


export async function reviewClaim(authRequest, claimId, review) {
  if (!authRequest || !claimId) {
    throw new Error("Missing claim review request context");
  }

  const res = await authRequest
    .post(`/api/claims/${claimId}/reviews`)
    .send(review)
    .timeout(CLAIM_VERIFICATION_TIMEOUT);

  return unwrap(res);
}
