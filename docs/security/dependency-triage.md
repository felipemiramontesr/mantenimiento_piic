# Procedimiento de atención de avisos de seguridad en dependencias

FC220 F2 · Decisiones de GrayMan D36 (sin parches ni excepciones de atajo) y D37 (Dependabot).
Convalidación: asiento R (Bravo).

## 1. De dónde llega un aviso

| Fuente                                                           | Cuándo                                                                                                                | Qué hace                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditoría diaria (`.github/workflows/dependency-audit-cron.yml`) | 06:00 UTC todos los días, o a mano (`workflow_dispatch`)                                                              | Corre `bun scripts/dependencyAuditGate.ts`. Si hay avisos critical o high, falla y abre o comenta el Issue «Aviso de seguridad en dependencias (auditoría diaria)» con la etiqueta `security`. GitHub avisa por correo a GrayMan. |
| CI de producto (`deploy.yml`, paso «Security Audit»)             | En cada push o PR a `main`                                                                                            | Mismo gate. Bloquea el despliegue mientras haya avisos critical o high.                                                                                                                                                           |
| Dependabot (`.github/dependabot.yml`)                            | Lunes 06:00 (hora de la Ciudad de México), y al publicarse un aviso si las actualizaciones de seguridad están activas | Abre PR agrupados con las versiones nuevas. Ningún PR se integra sin pasar el CI completo.                                                                                                                                        |

## 2. Reloj de atención

El reloj corre desde que se abre o se comenta el Issue `security`.

| Severidad       | Triage y plan de remediación | Cierre esperado                                          |
| --------------- | ---------------------------- | -------------------------------------------------------- |
| Crítica         | ≤ 24 horas                   | En el siguiente despliegue posible                       |
| Alta            | ≤ 72 horas                   | Antes de que bloquee una entrega de producto             |
| Moderada o baja | ≤ 7 días naturales           | En la siguiente ventana de mantenimiento de dependencias |

## 3. Pasos

1. **Transcribir.** Charlie (driver) copia el aviso al canal H en su siguiente acuse: paquete, versión, identificador GHSA, severidad y rango afectado.
2. **Analizar la explotabilidad real** según el Libro II y OWASP: ¿el paquete corre en producción o solo en desarrollo? ¿Se alcanza el código vulnerable desde una entrada externa? ¿Hay una mitigación existente? Se reporta con etiquetas `[FACT]` / `[INFER]`.
3. **Elegir la corrección de fondo.** El orden de preferencia es:

   1. versión corregida dentro de la misma versión mayor (override o subida directa, sin saltos mayores);
   2. migración de versión mayor cuando no hay parche en la línea actual, como la de zod 3 → 4 en FC220 F1;
   3. reemplazo del paquete.

   Una excepción en `dependencyAuditGate.ts` no es una corrección. Solo procede con FC firmado, dictamen R, justificación de no explotabilidad y fecha de revisión, y nunca como atajo para destrabar una entrega (D36).

4. **Contrato.** Alfa redacta el FC (o la adenda) con la corrección; Bravo dictamina; GrayMan firma. Sin firma no hay código.
5. **Cierre.** Despliegue con el CI en verde, el gate en `critical = 0 ∧ high = 0` y Sonar sin hallazgos. Se cierra el Issue con el commit y el run que lo resolvieron, y se registra en H y F.

## 4. Verificación automática

`scripts/checkSupplyChainGovernance.ts` corre como gate bloqueante del CI de producto (`deploy.yml`) y tiene su prueba `scripts/checkSupplyChainGovernance.test.ts`. Comprueba:

- que las versiones resueltas en `bun.lock` respeten los pisos de seguridad vigentes;
- que `dependabot.yml` exista con el ecosistema `bun` y los grupos `dev-dependencies` y `production-patches`;
- que la auditoría diaria tenga el horario, el disparo manual, el permiso `issues: write` acotado al job y el paso del Issue `security` condicionado a `if: failure()`;
- que toda directiva `uses:` de los workflows esté fijada por un SHA de 40 caracteres.
