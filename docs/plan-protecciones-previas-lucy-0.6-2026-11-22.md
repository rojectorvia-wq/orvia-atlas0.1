# Plan de implementación: protecciones previas a activar ORVIA LUCY

**Proyecto:** ORVIA 0.6 — IMPULSO  
**Rama base:** `orvia-0.6-impulso`  
**Estado:** especificación técnica para revisión; no modifica código ejecutable.

## Objetivo

Preparar una activación controlada de modelos en Preview, con privacidad, límites operativos, trazabilidad y aislamiento por restaurante. Este documento convierte los hallazgos de la revisión estática en tareas verificables.

## A. Protección del contexto enviado al modelo

### Riesgo observado

La orquestación construye un snapshot de pedidos usando `orders.items`. El código no demuestra que ese campo solo contenga nombres de productos; podría contener texto libre introducido por usuarios.

### Diseño requerido

- Definir un contrato para `orders.items` (estructura de producto, cantidad y opciones permitidas).
- Crear una función pura que convierta cada pedido en un resumen de catálogo permitido.
- Rechazar o descartar campos inesperados; no enviar texto libre arbitrario al modelo.
- Aplicar límites de longitud, cantidad de ítems y caracteres.
- No incluir nombres, teléfonos, direcciones, notas privadas ni identificadores de clientes.
- Marcar explícitamente todo contexto recuperado como datos, nunca como instrucciones.
- Si el dato no cumple el contrato, omitirlo del snapshot y registrar una métrica no sensible.

### Pruebas mínimas

1. Producto normal con cantidad válida.
2. Campo con nombre inesperado que contiene un correo o teléfono.
3. Texto que intenta instruir al modelo a ignorar sus reglas.
4. Objeto demasiado grande o con demasiados elementos.
5. JSON mal formado o valor de tipo inesperado.
6. Confirmar que el snapshot final no contiene datos personales ni campos no permitidos.

## B. Control de consumo

### Riesgo observado

Los límites de solicitudes por ventana no equivalen a un presupuesto. Una coordinación puede realizar múltiples llamadas al proveedor, según los agentes elegidos y la investigación.

### Diseño requerido

- Definir máximos por coordinación: número de llamadas, tokens de entrada y tokens de salida.
- Definir un presupuesto mensual y alertas desde el proveedor/Gateway, administrados por el titular de la cuenta.
- Añadir un interruptor de apagado en configuración de servidor que falle de forma cerrada.
- Registrar proveedor, modelo, duración, cantidad de llamadas y tokens devueltos; no guardar prompts completos en métricas.
- Detener la coordinación cuando alcance el límite interno.
- Documentar que el límite interno no sustituye los límites monetarios del proveedor.

### Pruebas mínimas

1. Modelo no configurado: cero llamadas externas.
2. Interruptor apagado: cero llamadas externas.
3. Presupuesto interno agotado: no iniciar llamadas adicionales.
4. Timeout: registrar fallo y finalizar temporizadores.
5. Error 402/429/5xx: respuesta segura y sin reintentos ilimitados.
6. Tokens ausentes o mal formados: contabilización segura sin bloquear el cierre de tarea.

## C. Registro de ejecución y límites atómicos

### Riesgo observado

Parte del trabajo externo puede empezar antes de crear el registro principal. El patrón de contar solicitudes y luego insertar también puede permitir carreras concurrentes.

### Diseño requerido

- Validar sesión, membresía, entrada y configuración no facturable antes de crear la ejecución.
- Crear un registro de ejecución antes de cualquier llamada externa.
- Aplicar una reserva atómica de cuota en base de datos dentro de una transacción o función SQL.
- Usar estados explícitos: `queued`, `running`, `completed`, `failed`, `cancelled`.
- Registrar códigos de error saneados, duración y consumo.
- Garantizar que el cierre de la ejecución se intente incluso si falla investigación, especialista, LEX o Lucy.
- No almacenar tokens, secretos, datos de tarjeta ni contenido privado innecesario en registros.

### Pruebas mínimas

1. Dos solicitudes simultáneas al alcanzar el límite: solo una obtiene reserva.
2. Fallo de búsqueda externa antes de llamar al modelo.
3. Fallo de un especialista en paralelo.
4. Fallo de LEX.
5. Fallo de la respuesta final de Lucy.
6. Verificar que cada ejecución termina en un estado terminal y no queda indefinidamente `running`.

## D. Fuentes y memoria aprobada

- Conservar título, URL, fecha publicada cuando exista y fecha de consulta.
- Exigir fuente oficial para normas, impuestos, seguridad alimentaria y obligaciones legales.
- Definir caducidad según el tipo de información.
- Separar “LEX revisó” de “fuente verificada”: la revisión del modelo no demuestra por sí sola que una afirmación sea verdadera.
- Para conocimiento de alto impacto, exigir aprobación humana antes de guardarlo como conocimiento reutilizable.
- Mantener aislamiento por `restaurant_id` en lectura y escritura.

## E. Catálogo de agentes

El código actual registra once identificadores en el objeto de agentes. Se detectó que el identificador `jhoa` muestra `ORVIA LETI` en más de una ruta. No renombrar ni eliminar agentes hasta recibir el catálogo oficial aprobado.

Criterios:
- Una única fuente de verdad para ID, nombre visible, rol y permisos.
- Comprobación de consistencia con `agent_registry`.
- Rechazar IDs desconocidos.
- Los nombres visibles no conceden permisos.
- Ningún agente puede ejecutar acciones sensibles por el mero hecho de tener un rol especializado.

## F. Secuencia de entrega

1. Aprobar el catálogo oficial de agentes.
2. Definir el esquema real de `orders.items` antes de implementar sanitización.
3. Implementar y probar el filtrado del snapshot.
4. Implementar cuotas atómicas y registro de ejecución.
5. Implementar límites de llamadas/tokens y apagado seguro.
6. Endurecer aprobación/retención de conocimiento externo.
7. Ejecutar pruebas en Preview con base aislada y datos ficticios.
8. Revisar privacidad, seguridad y coste.
9. Solicitar autorización explícita para habilitar el modelo de prueba.

## Condiciones de no avance

No activar modelo ni desplegar a producción si falta cualquiera de estos elementos:
- base de datos Preview aislada con esquema comprobado;
- sesión y membresía reales;
- presupuesto y límites de proveedor configurados por el titular;
- protección de datos validada;
- pruebas de aislamiento entre restaurantes;
- plan de apagado y tratamiento de errores.

## Registro de cambios de esta entrega

- Se creó esta especificación en una rama documental independiente.
- No se modificó código ejecutable.
- No se configuraron variables de entorno ni secretos.
- No se ejecutaron llamadas a modelos ni búsquedas pagadas.
- No se modificaron datos ni migraciones.
- No se desplegó ni se cambió producción.
