(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OrviaOrdersApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const STATUSES = new Set(["Nuevo", "Preparando", "Listo", "Entregado"]);

  class OrdersApiError extends Error {
    constructor(message, status) {
      super(message);
      this.name = "OrdersApiError";
      this.status = status;
    }
  }

  function createOrdersApi(options) {
    const config = options || {};
    const fetchImpl = config.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    const getToken = config.getToken;
    const getRestaurantId = config.getRestaurantId;
    if (typeof fetchImpl !== "function") throw new Error("Se requiere una implementación de fetch.");
    if (typeof getToken !== "function") throw new Error("Se requiere un proveedor de sesión.");
    if (typeof getRestaurantId !== "function") throw new Error("Se requiere el restaurante activo.");

    async function request(method, body) {
      const restaurantId = await getRestaurantId();
      if (typeof restaurantId !== "string" || !UUID.test(restaurantId)) {
        throw new OrdersApiError("No hay un restaurante activo válido.", 0);
      }
      const token = await getToken();
      if (typeof token !== "string" || !token.trim()) {
        throw new OrdersApiError("Tu sesión no está disponible. Inicia sesión nuevamente.", 401);
      }
      const headers = { Authorization: "Bearer " + token, Accept: "application/json" };
      const init = { method, headers, cache: "no-store" };
      if (body) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(Object.assign({ restaurantId }, body));
      }
      let response;
      try {
        const url = "/api/orders" + (method === "GET" ? "?restaurantId=" + encodeURIComponent(restaurantId) : "");
        response = await fetchImpl(url, init);
      } catch {
        throw new OrdersApiError("No se pudo conectar con ORVIA. Revisa tu conexión e inténtalo nuevamente.", 0);
      }
      let data;
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        const messages = {
          400: "Los datos del pedido no son válidos.",
          401: "Tu sesión expiró. Inicia sesión nuevamente.",
          403: "Tu cuenta no tiene acceso a este restaurante.",
          404: "El pedido ya no existe o no pertenece a este restaurante.",
          503: "El entorno de pruebas no tiene una base de datos configurada."
        };
        throw new OrdersApiError(messages[response.status] || "ORVIA no pudo completar la operación.", response.status);
      }
      return data;
    }

    return Object.freeze({
      list: async function () {
        const data = await request("GET");
        if (!data || !Array.isArray(data.orders)) throw new OrdersApiError("La respuesta de pedidos no tiene el formato esperado.", 502);
        return data.orders;
      },
      create: async function (order) {
        const value = order || {};
        if (typeof value.customer !== "string" || !value.customer.trim() ||
            typeof value.items !== "string" || !value.items.trim() ||
            !Number.isSafeInteger(value.amount) || value.amount < 1 ||
            (value.status !== undefined && !STATUSES.has(value.status))) {
          throw new OrdersApiError("Revisa el cliente, los productos, el valor y el estado del pedido.", 400);
        }
        const data = await request("POST", {
          customer: value.customer.trim(),
          items: value.items.trim(),
          amount: value.amount,
          status: value.status || "Nuevo"
        });
        if (!data || !data.order || !UUID.test(data.order.id || "")) {
          throw new OrdersApiError("El servidor no confirmó un pedido válido.", 502);
        }
        return data.order;
      },
      updateStatus: async function (orderId, status) {
        if (typeof orderId !== "string" || !UUID.test(orderId) || !STATUSES.has(status)) {
          throw new OrdersApiError("El pedido o el estado no son válidos.", 400);
        }
        const data = await request("PATCH", { orderId, status });
        if (!data || !data.order || data.order.id !== orderId) {
          throw new OrdersApiError("El servidor no confirmó la actualización del pedido.", 502);
        }
        return data.order;
      }
    });
  }

  return { createOrdersApi, OrdersApiError };
});
