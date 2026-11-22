# Registro de uso de modelos por agente — ORVIA LUCY 0.6

## Propósito
Dar visibilidad técnica al consumo de modelos en cada coordinación, identificando qué etapa y agente originaron cada llamada.

## Datos registrados
- Identificador interno del agente y etapa (por ejemplo, especialista, auditoría LEX o respuesta final LUCY).
- Estado de la llamada y duración en milisegundos.
- Límite de tokens de salida reservado para esa llamada.
- Contadores numéricos devueltos por el proveedor: `prompt_tokens`, `completion_tokens` y `total_tokens`, cuando existan.
- Código técnico acotado cuando una llamada falla.

## Datos excluidos
No se registran prompts, respuestas, texto libre de pedidos, datos de clientes, claves, cabeceras ni tokens de autenticación. La normalización descarta cualquier campo de uso que no sea uno de los tres contadores numéricos admitidos.

## Persistencia y límites
El detalle se conserva dentro del resultado de la tarea de coordinación en `agent_tasks.result`, que ya es un campo JSONB existente; no se agrega ni altera ninguna columna. El resumen es observabilidad técnica y no una factura, un presupuesto monetario ni un límite global de gasto. La ausencia de contadores del proveedor se representa como uso desconocido, no como consumo cero.

## Pruebas
Las pruebas unitarias verifican normalización, agregación, ausencia de datos de prompts y comportamiento cuando el proveedor no devuelve contadores.

## Pendiente antes de habilitar
1. Confirmar en un entorno aislado qué campos de uso devuelve la configuración real del Gateway/modelo.
2. Comparar los contadores con el panel de consumo del proveedor.
3. Definir un presupuesto monetario y límites del lado del proveedor con aprobación del titular adulto.
4. No activar llamadas facturables ni producción hasta completar esas verificaciones.
