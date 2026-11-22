"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createOrdersApi, OrdersApiError } = require("../orders-api.js");

const RESTAURANT = "123e4567-e89b-42d3-a456-426614174000";
const ORDER = "123e4567-e89b-42d3-b456-426614174001";

function setup(responseFactory, overrides) {
  const calls = [];
  const options = Object.assign({
    getToken: async () => "test-session-token",
    getRestaurantId: async () => RESTAURANT,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return responseFactory(url, init);
    }
  }, overrides || {});
  return { api: createOrdersApi(options), calls };
}
function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("list sends Clerk token and active restaurant UUID", async () => {
  const { api, calls } = setup(() => response(200, { orders: [] }));
  assert.deepEqual(await api.list(), []);
  assert.equal(calls[0].url, "/api/orders?restaurantId=" + RESTAURANT);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-session-token");
});

test("create posts normalized order and returns server record", async () => {
  const record = { id: ORDER, customer: "Ana", items: "Café", amount: 12000, status: "Nuevo" };
  const { api, calls } = setup(() => response(201, { order: record }));
  assert.deepEqual(await api.create({ customer: " Ana ", items: " Café ", amount: 12000 }), record);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    restaurantId: RESTAURANT, customer: "Ana", items: "Café", amount: 12000, status: "Nuevo"
  });
});

test("updateStatus sends PATCH and validates server confirmation", async () => {
  const { api, calls } = setup(() => response(200, { order: { id: ORDER, status: "Listo" } }));
  const result = await api.updateStatus(ORDER, "Listo");
  assert.equal(result.status, "Listo");
  assert.equal(calls[0].init.method, "PATCH");
});

test("invalid restaurant ID blocks network request", async () => {
  const { api, calls } = setup(() => response(200, { orders: [] }), { getRestaurantId: async () => "DEMO-001" });
  await assert.rejects(api.list(), OrdersApiError);
  assert.equal(calls.length, 0);
});

test("missing token blocks network request", async () => {
  const { api, calls } = setup(() => response(200, { orders: [] }), { getToken: async () => null });
  await assert.rejects(api.list(), error => error.status === 401);
  assert.equal(calls.length, 0);
});

test("API 403 is surfaced without local fallback", async () => {
  const { api } = setup(() => response(403, { error: "forbidden" }));
  await assert.rejects(api.list(), error => error.status === 403 && /acceso/.test(error.message));
});

test("API 503 is surfaced without local fallback", async () => {
  const { api } = setup(() => response(503, { error: "not configured" }));
  await assert.rejects(api.list(), error => error.status === 503 && /pruebas/.test(error.message));
});

test("invalid order amount is rejected before network request", async () => {
  const { api, calls } = setup(() => response(201, { order: { id: ORDER } }));
  await assert.rejects(api.create({ customer: "Ana", items: "Café", amount: 0 }), OrdersApiError);
  assert.equal(calls.length, 0);
});

test("network failure is reported as a connection error", async () => {
  const { api } = setup(() => { throw new Error("offline"); });
  await assert.rejects(api.list(), error => error.status === 0 && /conectar/.test(error.message));
});

test("malformed server response is rejected", async () => {
  const { api } = setup(() => response(200, { orders: "not-an-array" }));
  await assert.rejects(api.list(), error => error.status === 502);
});
