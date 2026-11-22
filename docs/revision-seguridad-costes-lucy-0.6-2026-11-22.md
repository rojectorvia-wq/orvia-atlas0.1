# Revisión técnica complementaria: seguridad y control de costes de ORVIA LUCY

**Proyecto:** ORVIA 0.6 — IMPULSO  
**Fecha:** 22 de noviembre de 2026  
**Alcance:** revisión estática de `api/agents.js`, `api/orchestrate.js` y `api/_lib/research.js` en `orvia-0.6-impulso`.  
**Estado:** hallazgos documentados; no se modificó código, configuración, datos ni producción.

## Resumen ejecutivo

La integración actual tiene controles útiles: autenticación Clerk, comprobación de membresía por restaurante, consultas SQL parametrizadas, límites de longitud, límites temporales de solicitudes, timeouts, mensajes de error saneados y una regla explícita de que los agentes no ejecutan acciones sensibles.

Antes de habilitar un modelo real en Preview, conviene cerrar los siguientes puntos. Esta revisión es estática y no sustituye pruebas dinámicas, revisión de privacidad ni pruebas de penetración.

## Hallazgos y recomendaciones

### 1. Minimización y tratamiento del contenido de pedidos

En `api/orchestrate.js`, el snapshot agregado incluye `orders.items` como descripciones frecuentes y las envía al modelo. Aunque el comentario indica que no se incluyen nombres ni teléfonos, el campo `items` es texto y el código no demuestra que su contenido esté limitado a nombres de productos. Si alguien introduce información personal o instrucciones dentro de ese campo, podría salir del entorno de ORVIA hacia el proveedor del modelo.

**Recomendación:** validar y normalizar `items` en el backend, limitarlo a descripciones de productos, filtrar datos personales y excluir cualquier texto libre que no sea necesario. Tratarlo como contenido no confiable en el prompt. Añadir pruebas con cadenas que simulen datos personales e instrucciones incrustadas.

### 2. Presupuesto y límites de consumo del modelo

Los límites actuales de aplicación reducen la frecuencia por usuario/restaurante, pero no equivalen a un presupuesto monetario. Una coordinación puede realizar varias llamadas al modelo: decisión de investigación, especialistas, revisión LEX, validación de conocimiento y respuesta final de Lucy. El número de llamadas y tokens puede variar según la selección del equipo y la disponibilidad de investigación.

**Recomendación:** antes de habilitar el modelo, definir límites de gasto en el proveedor o Gateway, registrar tokens por solicitud, establecer un máximo de llamadas por coordinación y disponer de un interruptor de desactivación. El rate limit actual usa un patrón de contar y luego insertar; para alta concurrencia conviene hacerlo atómico en base de datos o mediante un mecanismo dedicado.

### 3. Persistencia y trazabilidad de fallos

En la orquestación, algunas llamadas externas y la investigación pueden ocurrir antes de insertar la tarea principal. Si fallan en esa fase, el intento puede no quedar representado como una tarea fallida en `agent_tasks`.

**Recomendación:** crear un registro de ejecución después de validar identidad, membresía y límites, antes de iniciar llamadas facturables. Actualizarlo a completado o fallido y registrar códigos de error seguros, duración y consumo cuando el proveedor lo devuelva. Nunca registrar claves ni contenido personal innecesario.

### 4. Investigación externa y conocimiento aprobado

La búsqueda externa entrega contenido de páginas a modelos y LEX puede aprobar un resumen para guardarlo como conocimiento. El control actual es una revisión generativa; no constituye verificación independiente de la verdad ni garantiza autoridad, actualidad o ausencia de manipulación en la fuente.

**Recomendación:** guardar URL, título, fecha y fecha de revisión; aplicar reglas de vigencia por tipo de información; exigir fuentes oficiales para normas y obligaciones; mantener el estado pendiente de aprobación humana para temas de alto impacto. El texto de páginas debe seguir tratándose como dato no confiable.

### 5. Catálogo de agentes y nombres

El código usa once identificadores en el catálogo. La clave `jhoa` aparece con el nombre visible `ORVIA LETI` tanto en el endpoint individual como en la orquestación. El catálogo debe contrastarse con la definición funcional aprobada para evitar que el identificador y el nombre mostrado diverjan.

**Recomendación:** mantener una única fuente de verdad para identificadores, nombres, roles y permisos; validar que el registro de base de datos coincida con ese catálogo antes de habilitar agentes.

## Orden sugerido de trabajo

1. Confirmar el catálogo oficial de agentes y corregir discrepancias solo después de esa confirmación.
2. Diseñar sanitización y pruebas del campo `orders.items`.
3. Añadir límites de llamadas/tokens y control presupuestario fuera del código.
4. Hacer atómico el rate limit y registrar ejecuciones antes de llamadas externas.
5. Endurecer el flujo de aprobación de conocimiento externo.
6. Ejecutar pruebas en Preview con datos ficticios y base de datos aislada.
7. Solo después de superar las pruebas, solicitar autorización separada para activar el modelo.

## Límites de esta revisión

No se ejecutaron solicitudes al modelo, no se consumieron créditos de IA, no se consultaron ni cambiaron secretos, no se modificaron variables de entorno, no se aplicaron migraciones, no se modificó producción y no se integró ningún Pull Request.
