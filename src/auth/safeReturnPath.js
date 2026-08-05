export function safeInternalReturnPath(candidate) {
  if (typeof candidate !== "string") {
    return null;
  }

  const value = candidate.trim();

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function currentInternalPath() {
  return safeInternalReturnPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function loginPathForReturnTo(returnTo) {
  const safePath = safeInternalReturnPath(returnTo);

  if (!safePath) {
    return "/login";
  }

  return `/login?returnTo=${encodeURIComponent(safePath)}`;
}
