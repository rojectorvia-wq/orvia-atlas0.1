import { createHash } from "node:crypto";

const MAX_COMPONENT_LENGTH = 200;

function requiredComponent(value, name) {
  if (typeof value !== "string" || value.trim() === "" || value.length > MAX_COMPONENT_LENGTH) {
    throw new TypeError(`${name} must be a non-empty string of at most ${MAX_COMPONENT_LENGTH} characters`);
  }
  return value.trim();
}

/**
 * Creates a deterministic, non-reversible idempotency key for one model stage.
 * Scope: restaurant + parent task + agent + stage.
 *
 * This helper does not reserve budget or call a provider. The database must
 * still enforce uniqueness atomically for the returned key.
 */
export function createModelIdempotencyKey({ restaurantId, taskId, agentId, stage }) {
  const identity = [
    "orvia-model-call-v1",
    requiredComponent(restaurantId, "restaurantId"),
    requiredComponent(taskId, "taskId"),
    requiredComponent(agentId, "agentId"),
    requiredComponent(stage, "stage")
  ];
  const digest = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
  return `orvia-model-v1:${digest}`;
}
