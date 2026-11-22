import test from "node:test";
import assert from "node:assert/strict";
import { createNodePostgresTransactionRunner } from "../api/_lib/node-postgres-transaction-runner.mjs";

function makePool({ failAt = [] } = {}) {
  const failures = new Set(Array.isArray(failAt) ? failAt : [failAt]);
  const calls = [];
  const releaseArgs = [];
  const client = {
    async query(statement) {
      calls.push(statement);
      if (failures.has(statement)) throw new Error(`failed at ${statement}`);
      return { rows: [] };
    },
    release(error) { releaseArgs.push(error); }
  };
  return {
    pool: { async connect() { return client; } },
    calls,
    releaseArgs
  };
}

test("transaction runner commits successful work and releases a healthy client", async () => {
  const h = makePool();
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  const result = await withTransaction(async (client) => {
    await client.query("SELECT 1");
    return "ok";
  });
  assert.equal(result, "ok");
  assert.deepEqual(h.calls, ["BEGIN", "SELECT 1", "COMMIT"]);
  assert.equal(h.releaseArgs.length, 1);
  assert.equal(h.releaseArgs[0], undefined);
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
  assert.equal(h.releaseArgs.length, 1);
  assert.equal(h.releaseArgs[0], undefined);
});

test("transaction runner discards the client when rollback fails", async () => {
  const h = makePool({ failAt: "ROLLBACK" });
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(
    withTransaction(async () => { throw new Error("business operation failed"); }),
    /business operation failed/
  );
  assert.deepEqual(h.calls, ["BEGIN", "ROLLBACK"]);
  assert.equal(h.releaseArgs.length, 1);
  assert.match(h.releaseArgs[0].message, /failed at ROLLBACK/);
});

test("transaction runner attempts rollback and discards the client when commit fails", async () => {
  const h = makePool({ failAt: "COMMIT" });
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(
    withTransaction(async () => "done"),
    /failed at COMMIT/
  );
  assert.deepEqual(h.calls, ["BEGIN", "COMMIT", "ROLLBACK"]);
  assert.equal(h.releaseArgs.length, 1);
  assert.match(h.releaseArgs[0].message, /failed at COMMIT/);
});

test("transaction runner discards the client when begin fails", async () => {
  const h = makePool({ failAt: "BEGIN" });
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(withTransaction(async () => "unused"), /failed at BEGIN/);
  assert.deepEqual(h.calls, ["BEGIN"]);
  assert.equal(h.releaseArgs.length, 1);
  assert.match(h.releaseArgs[0].message, /failed at BEGIN/);
});

test("transaction runner validates its pool and callback", async () => {
  assert.throws(() => createNodePostgresTransactionRunner({}), /pool.connect/);
  const h = makePool();
  const withTransaction = createNodePostgresTransactionRunner({ pool: h.pool });
  await assert.rejects(withTransaction(null), /transaction work/);
  assert.equal(h.releaseArgs.length, 0);
});
