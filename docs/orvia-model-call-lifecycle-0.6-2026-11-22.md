# Ciclo seguro de llamada a modelos — ORVIA 0.6

Fecha: 22 de noviembre de 2026  
Estado: diseño ejecutable con dependencias inyectadas; **no conectado a rutas ni a proveedores**.

## Objetivo

Garantizar que una llamada facturable no se inicia sin una reserva autorizada y que los resultados ambiguos no generan reintentos automáticos ni liberaciones incorrectas.

## Secuencia

1. Validar las dependencias locales.
2. Solicitar una reserva al servicio económico.
3. Si la reserva se deniega, detenerse sin invocar al proveedor.
4. Si la clave idempotente ya existe, detenerse sin invocar al proveedor.
5. Exigir un identificador de reserva válido.
6. Invocar al proveedor una sola vez.
7. Calcular el coste real usando contadores de uso y una tarifa versionada confiable.
8. Liquidar la reserva con el coste real.
9. Si la invocación, medición o liquidación queda incierta, marcar la reserva como `unknown` cuando sea posible y exigir conciliación.

## Regla crítica de reintentos

El módulo `api/_lib/model-call-lifecycle.mjs` nunca vuelve a ejecutar `invoke`. Un timeout no demuestra que el proveedor no recibió la petición. Por ello, una excepción de red se considera ambigua y la reserva no se libera.

Una reserva existente con la misma clave idempotente tampoco autoriza un segundo envío. La recuperación debe consultar el estado de la tarea/reserva original y reconciliarlo; no repetir la llamada a ciegas.

## Estados que devuelve el módulo

- `budget_blocked`: reserva denegada; no se llamó al proveedor.
- `duplicate_blocked`: clave idempotente existente; no se llamó al proveedor.
- `reservation_invalid`: respuesta de reserva incompleta; no se llamó al proveedor.
- `completed`: proveedor respondió y la liquidación quedó confirmada.
- `outcome_unknown`: la invocación falló o su resultado es ambiguo.
- `reconciliation_required`: no fue posible medir o confirmar la liquidación.

Los estados inciertos deben permanecer reservados hasta una conciliación autorizada. Nunca se debe interpretar un error local como prueba automática de que no hubo consumo.

## Pruebas añadidas

Las pruebas cubren bloqueo antes del proveedor, duplicados idempotentes, invocación única, error ambiguo, coste ausente, liquidación no confirmada, reserva incompleta y fallo al marcar estado desconocido. Todas usan dobles simulados; no llaman a servicios externos ni prueban PostgreSQL real.

## Integración pendiente

Antes de conectar el módulo:

- Definir una fuente confiable y versionada de tarifas por proveedor/modelo.
- Asegurar que el proveedor devuelve contadores de uso verificables.
- Integrar todas las rutas de modelos a través de una única puerta de autorización.
- Confirmar que el repositorio transaccional y la reserva comparten el mismo restaurante, presupuesto y clave idempotente.
- Probar fallos de red, commit ambiguo y concurrencia con PostgreSQL real en una base aislada.
- Verificar configuración de conexiones y runtime de Vercel.

## Límites

Este módulo no contiene SDK de proveedor, credenciales, conexión de base de datos, tarifas predeterminadas ni lectura de variables de entorno. No está importado por `api/agents.js` ni `api/orchestrate.js`. No se ejecutó SQL, no se modificó Neon, no se activó facturación/IA y no se desplegó.
