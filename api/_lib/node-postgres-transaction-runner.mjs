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
    let beginAttempted = false;
    let commitAttempted = false;
    let discardError;

    try {
      beginAttempted = true;
      await client.query("BEGIN");
      began = true;
      const result = await work(client);
      commitAttempted = true;
      await client.query("COMMIT");
      began = false;
      return result;
    } catch (error) {
      // A failed BEGIN or COMMIT can leave the connection's transaction state
      // uncertain. Discard it rather than returning it to the reusable pool.
      if ((beginAttempted && !began) || commitAttempted) discardError = error;

      if (began) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          // Preserve the original error while telling pg.Pool to discard this
          // connection because its transaction state could not be recovered.
          discardError = rollbackError;
        }
      }
      throw error;
    } finally {
      client.release(discardError);
    }
  };
}
