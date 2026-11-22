# ORVIA 0.6 — Diagnóstico del Preview de Vercel

Fecha de revisión: 2026-11-22  
Rama: `feat/orvia-cost-guardrails-0.6`  
Commit: `ae59e528e707bdf4aec9c5306176c638eefbcaa4`

## Resultado confirmado

- GitHub Actions run #129: **success**; job `syntax` completado.
- El check `Vercel` del commit figura como **failure**.
- El check `Vercel Deployments` figura como **success**.
- El deployment asociado al commit tiene estado `ERROR`, código `BUILD_FAILED` y mensaje `Resource provisioning failed`.
- La consulta de eventos de build no devolvió eventos (`events: []`).

## Qué significa y qué no demuestra

El mensaje confirma un fallo de provisión de recursos durante el proceso de deployment. No identifica por sí mismo un error de sintaxis, una dependencia defectuosa, una variable ausente ni un límite de cuota. Sin eventos de build o un diagnóstico adicional de Vercel, no es correcto atribuir la causa a una de esas hipótesis.

El éxito de GitHub Actions valida únicamente el job de sintaxis indicado; no demuestra que el deployment de Vercel haya terminado correctamente ni que las rutas funcionen en Preview.

## Próximas comprobaciones seguras

1. Revisar en el panel de Vercel los detalles del deployment y la disponibilidad de recursos del proyecto.
2. Confirmar si el fallo de provisión es transitorio o si afecta a otros deployments del mismo proyecto.
3. No lanzar despliegues repetidos hasta entender el fallo.
4. Si Vercel vuelve a proporcionar eventos o un motivo concreto, registrar esa evidencia antes de cambiar código o configuración.

## Límites

No se modificaron ajustes del proyecto, variables, secretos, recursos, dependencias ni despliegues. No se ejecutaron llamadas al proveedor de IA ni operaciones en Neon.
