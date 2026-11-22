import test from "node:test";
import assert from "node:assert/strict";
import { publicHealthPayload } from "../api/_lib/health-response.mjs";

test("public health response exposes only service and coarse status", () => {
  const payload = publicHealthPayload(true);
  assert.deepEqual(payload, { service: "ORVIA API", status: "online" });
  assert.equal("database" in payload, false);
  assert.equal("integrations" in payload, false);
  assert.equal("agents" in payload, false);
});

test("degraded health response does not reveal internal failure details", () => {
  const payload = publicHealthPayload(false);
  assert.deepEqual(payload, { service: "ORVIA API", status: "degraded" });
});
