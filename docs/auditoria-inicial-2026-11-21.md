# ORVIA — Auditoría técnica inicial
**Fecha:** 21 de noviembre de 2026  
**Repositorio revisado:** `rojectorvia-wq/orvia-atlas0.1`  
**Alcance:** inspección de solo lectura de GitHub, Vercel y Neon.  
**Estado:** diagnóstico preliminar; no se modificó producción ni se ejecutaron migraciones.

## 1. Inventario de GitHub

Repositorios visibles:
- `orvia-atlas`: privado, tamaño informado 0; README mínimo.
- `orvia-atlas1`: público, repositorio vacío.
- `orvia-atlas0.1`: público, contiene documentación inicial; es el repositorio asociado al despliegue de `orvia-portal-unificado`.

El README de Atlas 0.1 declara que el repositorio aún no contiene una aplicación ejecutable ni backend implementado. La auditoría de despliegue encontrada en ese README describe una versión anterior; debe contrastarse con el estado actual antes de tomar decisiones.

## 2. Inventario de Vercel

Proyectos visibles:
- `orvia-portal-unificado`: último despliegue READY; commit de Git asociado a `orvia-atlas0.1`, rama `orvia-0.6-impulso`, mensaje "Fix Vercel OIDC token retrieval for live ORVIA agent execution".
- `orvia-fast-food`: último despliegue READY; no se encontró metadato Git en el despliegue inspeccionado.
- `orvia-panel`: último despliegue READY; no se encontró metadato Git en el despliegue inspeccionado.

READY confirma que Vercel completó el despliegue, no que el producto funcione de extremo a extremo. No se verificó aún el comportamiento funcional de las páginas, API ni autenticación.

## 3. Inventario de Neon

Proyecto: `Orvia` (`muddy-sunset-19291152`), base `neondb`.

Ramas:
- `production`: rama principal.
- `orvia-dev-nebula`: rama de desarrollo derivada de production.

### Hallazgo crítico de coherencia entre entornos

La rama `production` contiene las tablas del esquema `neon_auth`, pero no tiene tablas de aplicación en `public`.

La rama `orvia-dev-nebula` contiene además estas tablas de aplicación:
- `restaurants`
- `restaurant_members`
- `orders`
- `agent_registry`
- `agent_tasks`
- `activity_log`
- `lucy_research_knowledge`

Conteos agregados consultados en desarrollo: 0 restaurantes, 0 miembros, 0 órdenes, 0 tareas de agentes, 0 eventos de actividad y 0 registros de conocimiento de Lucy. El registro de agentes contiene 11 filas.

**Interpretación:** el esquema de aplicación existe en desarrollo, pero no está presente en production. No se debe publicar código que dependa de esas tablas hasta diseñar, revisar y probar una migración controlada. No se aplicó ninguna migración.

## 4. Hallazgo sobre el equipo de agentes

El registro de Neon en desarrollo incluye 11 agentes:
- DARI — testing
- LETI — testing
- JOTE — testing
- KIKE — testing
- LEX — testing
- LUCY — testing
- LUZ — testing
- MAX — testing
- MEMO — testing
- NANI — testing
- XEL — testing

Los estados registrados son `testing`; esto no prueba que todos estén conectados o ejecutándose de manera funcional. El README del repositorio describe un objetivo de nueve agentes, con siete nombres definidos y dos pendientes. Hay una discrepancia entre la documentación y el registro de datos que debe resolverse antes de fijar la arquitectura.

## 5. Riesgos y prioridades

1. **Alta — separación de entornos:** las tablas funcionales están en desarrollo y no en producción.
2. **Alta — verificación de producto:** un despliegue READY no equivale a autenticación, operaciones o agentes funcionando.
3. **Media — fuente de verdad:** confirmar qué repositorio y commit corresponden a cada proyecto Vercel.
4. **Media — catálogo de agentes:** reconciliar la documentación con los 11 registros existentes.
5. **Media — seguridad:** revisar autenticación, autorización por restaurante, aislamiento multiempresa y secretos sin exponer valores.

## 6. Próximos pasos recomendados

- Inspeccionar el código y las rutas del commit conectado a `orvia-portal-unificado`.
- Confirmar el origen y la finalidad de `orvia-fast-food` y `orvia-panel`.
- Revisar políticas de acceso y esquema de autenticación.
- Preparar un plan de migraciones versionadas desde desarrollo hacia producción; no ejecutar hasta completar pruebas.
- Definir una lista oficial de agentes, sus capacidades, permisos y criterios de aceptación.
- Ejecutar pruebas funcionales de extremo a extremo en un entorno de prueba.

## 7. Límites de esta auditoría

Esta auditoría fue de solo lectura. No se cambiaron proyectos, ramas de base de datos, tablas, credenciales, variables de entorno, dominios ni despliegues. No se copiaron datos personales ni secretos al documento.
