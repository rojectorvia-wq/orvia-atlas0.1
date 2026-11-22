import test from "node:test";
import assert from "node:assert/strict";
import { createNodePostgresTransactionRunner } from "../api/_lib/node-postgres-transaction-runner.mjs";

function makePool({ failAt } = {}) {
  const calls = [];
  let released = 0;
  const client = {
    async query(statement) {
      calls.push(statement);
      if (statement === failAt) throw new Error(`failed at ${statement}`);
      return { rows: [] };
    },
    release() { released += 1; }
  };
  return {
    pool: { async connect() { return client; } },
    calls,
    get released() { return released; }
  };
}

test("transaction runner commits successful work and releases the client", async () => {
  const h = makePool();
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  const result = await withTransaction(async (client) => {
    await client.query("SELECT 1");
    return "ok";
  });
  assert.equal(result, "ok");
  assert.deepEqual(h.calls, ["BEGIN", "SELECT 1", "COMMIT"]);
  assert.equal(h.released, 1);
});

test("transaction runner rolls back failed work and preserves the original error", async () => {
  const h = makePool();
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(
    withTransaction(async (client) => {
      await client.query("UPDATE budgets");
      throw new Error("business operation failed");
    }),
    /business operation failed/
  );
  assert.deepEqual(h.calls, ["BEGIN", "UPDATE budgets", "ROLLBACK"]);
  assert.equal(h.released, 1);
});

test("transaction runner attempts rollback when commit fails", async () => {
  const h = makePool({ failAt: "COMMIT" });
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(
    withTransaction(async () => "done"),
    /failed at COMMIT/
  );
  assert.deepEqual(h.calls, ["BEGIN", "COMMIT", "ROLLBACK"]);
  assert.equal(h.released, 1);
});

test("transaction runner validates its pool and callback", async () => {
  assert.throws(() => createNodePostgresTransactionRunner({}), /pool.connect/);
  const h = makePool();
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(withTransaction(null), /transaction work/);
  assert.equal(h.released, 0);
});
