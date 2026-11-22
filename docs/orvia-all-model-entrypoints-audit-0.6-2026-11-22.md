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
