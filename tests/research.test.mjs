import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeResearchQuery } from "../api/_lib/research.js";

test("removes common personal contact details and URLs", () => {
  const result = sanitizeResearchQuery(
    "Investiga restaurantes en Santa Marta. Contacto: ana@example.com, +57 300 123 4567 https://example.com/perfil"
  );
  assert.match(result, /restaurantes en Santa Marta/i);
  assert.doesNotMatch(result, /ana@example\.com|300 123 4567|https?:\/\//i);
});

test("removes credentials and token-shaped values", () => {
  const result = sanitizeResearchQuery(
    "Compara proveedores api_key=supersecretvalue Bearer abcdefghijklmnop sk-abcdefghijklmnop eyJabcdefghijk.abcdefghijk.abcdefghijk"
  );
  assert.doesNotMatch(result, /supersecretvalue|abcdefghijklmnop|sk-|eyJ/i);
});

test("bounds the outgoing query and preserves ordinary Spanish research terms", () => {
  const result = sanitizeResearchQuery("Precios actuales de proveedores de alimentos para restaurantes en Colombia " + "x".repeat(500));
  assert.ok(result.length <= 300);
  assert.match(result, /Precios actuales de proveedores/i);
});

test("returns an empty query for empty input", () => {
  assert.equal(sanitizeResearchQuery(""), "");
});
