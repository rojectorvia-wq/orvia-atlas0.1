const ALLOWED_STATUSES = new Set(["Nuevo", "Preparando", "Listo", "Entregado"]);

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function nonNegativeAmount(value) {
  const text = String(value ?? "0");
  return /^[0-9]{1,18}$/.test(text) ? text : "0";
}

/** Build minimal model context from aggregate order data only. */
export function buildOrderContext(summaryRows = []) {
  const orderStatusSummary = summaryRows
    .filter(row => row && ALLOWED_STATUSES.has(row.status))
    .map(row => ({
      status: row.status,
      orders: nonNegativeInteger(row.total),
      deliveredSalesCOP: row.status === "Entregado" ? nonNegativeAmount(row.delivered_cop) : "0"
    }));
  return {
    orderStatusSummary,
    note: "Resumen agregado de pedidos. No incluye descripciones libres, nombres, teléfonos, direcciones ni datos personales. La maqueta guarda algunos pedidos solo en el navegador, por lo que podrían no aparecer aquí."
  };
}
