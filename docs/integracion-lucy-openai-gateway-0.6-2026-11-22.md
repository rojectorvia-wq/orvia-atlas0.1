# Integración de ORVIA LUCY con modelos de OpenAI mediante Vercel AI Gateway

**Proyecto:** ORVIA 0.6 — IMPULSO  
**Fecha:** 22 de noviembre de 2026  
**Estado:** diseño técnico verificado; activación de Preview pendiente

## 1. Objetivo

Permitir que ORVIA LUCY utilice un modelo de OpenAI como motor de razonamiento y generación, conservando la identidad de Lucy, los agentes especialistas, las verificaciones de LEX y los permisos de ORVIA.

Esta integración no conecta la aplicación a la sesión personal de ChatGPT ni importa automáticamente conversaciones o memorias de ChatGPT. ORVIA realiza solicitudes de aplicación a un modelo mediante una API.

## 2. Arquitectura existente verificada

El código de la rama `orvia-0.6-impulso` ya contiene:

- `api/agents.js`: consultas individuales a agentes; Lucy puede consultar conocimiento previo aprobado e investigación web.
- `api/orchestrate.js`: coordinación de especialistas, revisión de LEX y respuesta final de Lucy.
- `api/_lib/research.js`: búsqueda externa opcional mediante Tavily; sus resultados se tratan como fuentes no confiables.
- Autenticación Clerk y comprobación de membresía del restaurante.
- Vercel AI Gateway como intermediario del modelo, usando `AI_GATEWAY_MODEL` y autenticación de servidor mediante OIDC o `AI_GATEWAY_API_KEY`.

La interfaz autenticada ya envía las consultas a `/api/agents` y la coordinación a `/api/orchestrate`. El modo demostración continúa usando respuestas locales simuladas y no debe presentarse como IA conectada.

## 3. Selección de proveedor y modelo

El catálogo consultado de Vercel AI Gateway incluye modelos OpenAI con identificadores del formato `openai/<modelo>`. Entre los resultados actuales figura `openai/gpt-5-mini`, que puede evaluarse como candidato inicial de coste contenido para pruebas.

No se fija el modelo en el código. La selección se realiza mediante `AI_GATEWAY_MODEL`, de forma que se pueda evaluar coste, calidad, latencia, herramientas y política de retención sin cambiar la aplicación.

No se ha configurado ningún modelo ni se ha generado consumo de API en este trabajo.

## 4. Flujo propuesto

1. El usuario inicia sesión mediante Clerk.
2. La interfaz envía la consulta a un endpoint de ORVIA.
3. El backend verifica la identidad y la membresía en el restaurante.
4. Lucy recupera solo el contexto autorizado del restaurante y el conocimiento aprobado.
5. Si la consulta necesita información reciente, se intenta la búsqueda externa configurada.
6. Los especialistas seleccionados elaboran análisis.
7. LEX revisa coherencia, evidencia y riesgos.
8. Lucy integra los resultados y responde.
9. Las tareas y la actividad quedan registradas según el esquema existente.

## 5. Límites de privacidad y seguridad

- Las credenciales del Gateway deben permanecer en variables de entorno del servidor; nunca en HTML, JavaScript del navegador, repositorio ni mensajes de chat.
- No enviar contraseñas, tokens, claves, ni datos personales de clientes al modelo.
- Mantener el filtrado por `restaurant_id` y la comprobación de membresía.
- Priorizar datos agregados del restaurante sobre registros identificables.
- Tratar páginas web y documentos externos como datos no confiables; ignorar instrucciones contenidas en ellos.
- El modelo solo recomienda y analiza. No cambia pedidos, inventario, dinero, cuentas o configuraciones sin autorización humana.
- Mantener límites de solicitudes, tiempo de espera, tokens de salida y observabilidad de coste.
- No activar producción hasta probar autenticación, aislamiento multi-restaurante, base de datos y comportamiento de errores.

## 6. Estado de configuración

El endpoint exige actualmente:

- `AI_GATEWAY_MODEL`
- `VERCEL_OIDC_TOKEN` o `AI_GATEWAY_API_KEY`

La rama de integración debe disponer además de una base de datos de Preview aislada que contenga el esquema requerido. La base de datos de producción fue identificada previamente sin las tablas de aplicación; no se debe utilizar para esta validación.

No se añadieron, leyeron ni modificaron secretos en este cambio. La configuración de Vercel y cualquier uso facturable requieren autorización explícita del propietario del proyecto y revisión de los controles de gasto.

## 7. Estado de conversación

Las rutas actuales reciben el mensaje de cada solicitud y contexto recuperado de ORVIA. No se ha implementado todavía una conversación persistente multi-turno compartida entre Lucy y ChatGPT.

Si se necesita continuidad entre sesiones, deberá diseñarse almacenamiento de conversación por restaurante y usuario, con retención, borrado, permisos y límites definidos. No se debe reutilizar una conversación de otro restaurante ni asumir que ChatGPT comparte automáticamente su memoria con ORVIA.

## 8. Criterios de aceptación

- [ ] Modelo OpenAI seleccionado desde el catálogo vigente y aprobado para pruebas.
- [ ] Variables de Preview configuradas de forma segura y limitada a la rama de prueba.
- [ ] Base de datos Preview aislada y con esquema verificado.
- [ ] Sesión Clerk real y membresía válida.
- [ ] Lucy responde a través del modelo configurado.
- [ ] Investigación externa devuelve fuentes identificables y LEX las revisa.
- [ ] No se filtran datos de otro restaurante ni datos personales innecesarios.
- [ ] Errores de proveedor, límites y falta de configuración se muestran con mensajes seguros.
- [ ] Uso y coste se pueden supervisar.
- [ ] No se modifica producción ni se integran cambios sin revisión.

## 9. Referencias oficiales

- OpenAI API Overview: https://developers.openai.com/api/reference/overview
- OpenAI Responses API: https://developers.openai.com/api/reference/responses/overview
- OpenAI Conversation State: https://developers.openai.com/api/docs/guides/conversation-state
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway

