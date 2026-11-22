// Minimal unauthenticated health response. Do not expose integration flags,
// database schema state, provider configuration, or agent registry details.
export function publicHealthPayload(ready) {
  return {
    service: "ORVIA API",
    status: ready ? "online" : "degraded"
  };
}
