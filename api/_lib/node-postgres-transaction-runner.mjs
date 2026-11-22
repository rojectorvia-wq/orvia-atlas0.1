/**
 * Transaction runner for a node-postgres Pool.
 *
 * Pass a configured pg.Pool from the Vercel function module. This module does
 * not construct a pool, read environment variables, or attach platform hooks.
 * The caller is responsible for pool lifecycle (e.g. attachDatabasePool on
 * Vercel Fluid Compute) and for supplying a pooled DATABASE_URL.
 */
export function createNodePostgresTransactionRunner({ pool }) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("pool.connect must be implemented");
  }

  return async function withTransaction(work) {
    if (typeof work !== "function") throw new TypeError("transaction work must be a function");
    const client = await pool.connect();
    let began = false;
    try {
      await client.query("BEGIN");
      began = true;
      const result = await work(client);
      await client.query("COMMIT");
      began = false;
      return result;
    } catch (error) {
      if (began) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Preserve the original operation/commit error. The pool should
          // discard a broken connection according to node-postgres behavior.
        }
      }
      throw error;
    } finally {
      client.release();
    }
  };
}
