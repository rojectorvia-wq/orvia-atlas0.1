import test from "node:test";
import assert from "node:assert/strict";
import { ORVIA_AGENTS, ORVIA_CORE_VERSION, buildCorePolicy, getAgent, selectSpecialists } from "../api/_lib/orvia-core.mjs";

test("el núcleo registra exactamente once agentes y mantiene sus identidades", () => {
  assert.equal(Object.keys(ORVIA_AGENTS).length, 11);
  assert.equal(ORVIA_CORE_VERSION, "0.7.0");
  assert.equal(getAgent("jhoa").name, "ORVIA JHOA");
  assert.equal(getAgent("vera").role, "Seguridad y prevención de errores");
  assert.equal(getAgent("max").role, "Calidad y pruebas");
  assert.equal(getAgent("lex"), null);
});

test("el enrutador selecciona especialistas relevantes y nunca más de tres", () => {
  assert.deepEqual(selectSpecialists("Necesito revisar el inventario y las existencias"), ["jote"]);
  assert.deepEqual(selectSpecialists("Hay un error técnico en el sistema"), ["jhoa"]);
  assert.ok(selectSpecialists("Analiza finanzas, inventario, marketing, atención y pedidos").length <= 3);
});

test("el núcleo mantiene a VERA y MAX como revisores fuera de la selección ordinaria", () => {
  const ids = Object.keys(ORVIA_AGENTS);
  assert.ok(ids.includes("vera"));
  assert.ok(ids.includes("max"));
  assert.ok(!selectSpecialists("Necesito una promoción para redes").includes("vera"));
  assert.ok(!selectSpecialists("Necesito una promoción para redes").includes("max"));
});

test("la política prohíbe acciones sensibles sin autorización", () => {
  const policy = buildCorePolicy();
  assert.match(policy, /Toda acción sensible requiere autorización explícita/);
  assert.match(policy, /VERA revisa seguridad/);
  assert.match(policy, /MAX revisa calidad/);
});
