# Auditoría de cobertura de controles de modelos — ORVIA 0.6

Fecha: 22 de noviembre de 2026  
Rama revisada: `feat/orvia-cost-guardrails-0.6`  
Alcance: inspección estática de rutas que pueden llamar al AI Gateway. No se ejecutaron llamadas a modelos ni cambios en infraestructura.

## Hallazgo prioritario: ruta individual sin los nuevos guardrails

La ruta `api/agents.js` ejecuta `generateAgentReply()` directamente contra Vercel AI Gateway. En la versión inspeccionada:

- No importa ni utiliza `createModelBudget`.
- No registra llamadas con `createModelUsageLedger` ni `normalizeModelUsage`.
- Mantiene un límite propio de cinco tareas por usuario/restaurante en diez minutos, pero realiza primero un `SELECT count(*)` y después un `INSERT` independiente; no es una reserva atómica frente a solicitudes concurrentes.
- Permite hasta 650 tokens de salida por llamada, distinto del techo de 520 usado por la coordinación.
- Para consultas dirigidas a Lucy puede ejecutar investigación web antes de llamar al modelo.

Por tanto, los límites de `api/orchestrate.js` no cubren todas las entradas al proveedor. La existencia del estimador monetario tampoco equivale a una barrera de gasto: `evaluateRestaurantCostLimit` todavía no está conectado al flujo de ninguna de las dos rutas.

## Avance de implementación en la rama de trabajo

En commits posteriores, `api/agents.js` utiliza el límite local de una llamada por solicitud, el máximo de 520 tokens de salida y el registro normalizado de uso por agente. Guarda el resumen de presupuesto y consumo en `agent_tasks.result`, sin almacenar prompts dentro del ledger. La reserva de caracteres usa ahora exactamente el mismo mensaje de sistema que se envía al Gateway (commit `fda3f96cf047f389f15c39eeeb0875f4760ab89f`).

La validación GitHub Actions run #92 aprobó 18 pruebas en un commit anterior. El commit `fda3f96` y el posterior esquema SQL propuesto aún no tienen una ejecución de CI confirmada en el registro consultado.

Esto solo cierra la brecha de límites por solicitud y trazabilidad de uso. No conecta el presupuesto mensual monetario a `api/agents.js` ni a `api/orchestrate.js`, no realiza reservas de saldo compartido y no evita por sí solo que varias solicitudes simultáneas excedan un presupuesto mensual. El ledger en `agent_tasks.result` sigue siendo telemetría, no un libro contable autoritativo.

## Corrección requerida antes de integrar

1. Inventariar todas las rutas y funciones que llaman al AI Gateway o a proveedores externos facturables.
2. Centralizar la autorización de llamadas para que ninguna ruta pueda omitir presupuesto, límites y registro.
3. Aplicar reservas atómicas compartidas por restaurante y periodo antes de cada llamada, con idempotencia y liquidación posterior.
4. Aplicar el mismo presupuesto de tokens y política de privacidad a llamadas individuales y coordinadas.
5. Registrar uso de forma consistente y conservar estado desconocido cuando el proveedor no confirme el consumo.
6. Añadir pruebas que verifiquen que ambas rutas respetan el límite, incluyendo concurrencia y errores.
7. Mantener bloqueo por defecto si faltan tarifas, presupuesto, contadores o estado de reserva.

## Estado de Vercel Preview

La configuración leída del proyecto muestra Node.js 26.x y `framework: null`. Node.js 26 fue anunciado como disponible de forma general para builds y Vercel Functions el 29 de octubre de 2026. Por tanto, la versión 26 por sí sola no explica el error `Resource provisioning failed`. Los eventos de build consultados para el último deployment no devolvieron registros, así que la causa raíz sigue sin determinarse. No se cambió la configuración ni se reintentó el despliegue.

## Límites de esta auditoría

Este documento no implementa cambios de código, no modifica el esquema ni los datos de Neon, no toca secretos ni variables de entorno, no cambia facturación, no activa modelos, no ejecuta llamadas de IA y no despliega a producción.


## Propuesta de esquema económico preparada

Se añadió `docs/sql/proposed_restaurant_model_cost_reservations_0.6.sql` en el commit `47402fb4906bdc424d28ac328ae6461b62214caf`. Define tablas separadas para presupuestos por restaurante/periodo y reservas de coste, con importes enteros micro-USD, límites de rango, estados, idempotencia, claves foráneas restrictivas e índices de reconciliación.

Es únicamente una propuesta versionada en Git: **no se ejecutó** contra Neon. Todavía no implementa la lógica transaccional de reserva/liquidación ni el catálogo de tarifas. El presupuesto mensual sigue desconectado de las rutas. No debe integrarse ni aplicarse sin revisión de seguridad, aprobación del titular adulto de las cuentas facturables y pruebas en una base aislada.
