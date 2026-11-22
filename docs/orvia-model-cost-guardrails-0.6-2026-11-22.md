# Control económico de modelos — ORVIA 0.6

## Objetivo
Preparar un control de gasto por restaurante que no dependa de estimaciones inventadas ni de límites locales a una sola instancia.

## Cálculo
`api/_lib/model-cost.mjs` estima el coste de una llamada a partir de:
- Contadores de entrada y salida devueltos por el proveedor.
- Tarifas explícitas de entrada y salida, expresadas en USD por millón de tokens.
- Conversión a enteros en micro-USD (1 USD = 1.000.000 micro-USD), con redondeo conservador hacia arriba por categoría de tokens.

No existen tarifas predeterminadas. Si falta el uso real o una tarifa, el coste se declara desconocido. La decisión falla cerrada: no autoriza la llamada. Los presupuestos y gastos que recibe el evaluador también deben ser enteros en micro-USD; no se aceptan importes de punto flotante.

## Política
`evaluateRestaurantCostLimit` compara el coste estimado con el presupuesto mensual y el gasto acumulado del restaurante. Es una función pura y no consulta ni modifica datos. La conversión evita usar operaciones binarias de punto flotante para los saldos monetarios; el valor USD decimal es solo una representación de lectura, no la unidad de contabilidad.

## Lo que todavía no está habilitado
Este cambio no conecta el evaluador al flujo de llamadas. Para hacerlo correctamente hace falta:
1. Confirmar tarifas vigentes del modelo exacto y su tratamiento de caché/razonamiento con documentación del proveedor.
2. Definir moneda, impuestos, créditos, redondeo y periodo de presupuesto.
3. Guardar presupuesto y reservas de gasto en Neon con operaciones atómicas, para evitar que llamadas simultáneas excedan el límite.
4. Registrar el gasto real devuelto por el proveedor y reconciliarlo con su panel de facturación.
5. Definir quién puede cambiar el presupuesto y exigir aprobación del titular de la cuenta antes de activar servicios facturables.

No se modifica el esquema de Neon, secretos, variables, facturación, UI ni producción. No se hacen llamadas a modelos. Las pruebas usan tarifas ficticias solo como datos de prueba, nunca como precios del producto.
