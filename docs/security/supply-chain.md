# Cadena de suministro: Dependabot en el tablero, vista previa de Hostinger y repositorio público

FC222 F2 · Decisiones de GrayMan D39 (Dependabot inmaculado, igual que Sonar) y D40 (todo se mantiene como está hasta que el repositorio pase a privado).
Convalidación: asiento R (Bravo). Procedimiento de atención de avisos: [dependency-triage.md](dependency-triage.md).

## 1. Fila «Dependabot Security & Supply Chain» del tablero de certificación

El job `global-certification` de `deploy.yml` corre `scripts/generateCertificationDashboard.ts`, que lee por la API de GitHub:

- las alertas de Dependabot abiertas del repositorio (`GET /repos/{repo}/dependabot/alerts?state=open`);
- los PR abiertos de `dependabot[bot]`, su estado de fusión (`mergeable_state`) y las conclusiones de sus checks.

El job declara solo permisos de lectura: `contents`, `actions`, `pull-requests`, `checks` y `vulnerability-alerts`. Las alertas de Dependabot se leen con `vulnerability-alerts: read`; `security-events` solo cubre code scanning.

| Situación                                                           | Estado de la fila | Efecto                                 |
| ------------------------------------------------------------------- | ----------------- | -------------------------------------- |
| Cero alertas abiertas y ningún PR de Dependabot vencido             | ✅ PASSED         | Certifica                              |
| Al menos una alerta abierta, de cualquier severidad                 | ❌ FAILED         | Bloquea el despliegue el mismo día     |
| PR de Dependabot en fallo o en conflicto con 7 días o menos de edad | ✅ PASSED         | Solo si además no hay alertas abiertas |
| PR de Dependabot en fallo o en conflicto con más de 7 días de edad  | ❌ FAILED         | Bloquea por vencimiento del plazo      |
| La API no se pudo leer (token, permiso o red)                       | ⚠️ NO VERIFICADO  | Bloquea (fail-closed)                  |

Un PR «en fallo» es el que GitHub marca en conflicto (`dirty`) o el que tiene algún check terminado en `failure`, `timed_out`, `action_required` o `startup_failure`. La edad cuenta días completos desde que se abrió el PR.

El gate `scripts/dependencyAuditGate.ts` no cambia: sigue bloqueando por `critical = 0 ∧ high = 0`. El cero de moderate y low lo exige la prueba de `scripts/dependencyAuditGate.test.ts` sobre el `bun audit` real del repositorio (FC222 F1), y la fila de Dependabot lo vigila en el CI.

## 2. Vista previa de Hostinger (R-PREVIEW-OUT-OF-GATE)

- La vista previa en `*.hostingersite.com` que aparece en los PR la publica la app de Hostinger instalada en la cuenta de GitHub (`hostinger[bot]`). No sale de `deploy.yml`.
- El despliegue a producción es el job `hostinger-deployment` de `deploy.yml`: corre solo en push a `main` y publica por SSH/rsync.
- La vista previa queda fuera de todo predicado de pase del CI. Este documento no afirma nada sobre las credenciales ni la configuración con que corre: eso lo administra la app externa y no está auditado.

## 3. Repositorio público y runner self-hosted (D40)

- El repositorio es público por costo: SonarCloud es gratuito solo para proyectos públicos y GitHub Actions limita los minutos en repositorios privados. Pasará a privado cuando GrayMan lo decida.
- La app de Hostinger se mantiene instalada a nivel de cuenta. No interviene en el despliegue de producción.
- `db-migrations.yml` es el único workflow con runner self-hosted (la PC de GrayMan). Se protege así:
  - su único disparador es `workflow_dispatch`, sin `push` ni `pull_request`;
  - el job corre bajo el environment `production-db`, que exige revisión de GrayMan;
  - el runner está apagado por omisión y solo se enciende por orden de GrayMan.
- Toda mitigación se hace dentro del repositorio; no se cambian la visibilidad ni las integraciones de la cuenta sin decisión de GrayMan.
