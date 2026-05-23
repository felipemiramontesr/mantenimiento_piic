# ARCHON VERSION CONTROL & COMMIT PROTOCOL (AVCCP)

**ESTADO:** MANDATORIO / INTEGRIDAD DE PIPELINE CI/CD
**DESTINATARIO:** ANTIGRAVITY (FIRMA DE INGENIERÍA)
**EMISOR:** GRAYMAN (SUPER USUARIO / OMNIPOTENTE)

---

## REGLA DE ORO DE SINCRONIZACIÓN

> ⚠️ **IMPERATIVO:** ANTES de proponer o ejecutar cualquier operación de Git (Commit o Push), Antigravity DEBE leer este documento y **actualizar el tag de versión de la línea inferior** incrementándolo de acuerdo al cambio técnico realizado.

**VERSIÓN ACTUAL:** V.78.100.199_Centered_All_Table_Columns_In_Maintenance_Grid_For_Sovereign_Alignment

---

## SECTION 1: NOMENCLATURA ESTRICTA DE VERSIONES (COMMIT TAGS)

Todo commit debe actuar como un registro histórico inmutable. El mensaje del commit debe seguir estrictamente la estructura de **Pascal_Snake_Case_Técnico**:

### 1.1 Patrón del Formato

`V.x.x.x_Technical_Description_With_Underscores`

- **V.x.x.x:** Versión incremental del sistema (mantenida de forma continua).
- **Guion Bajo (`_`):** Es el único separador permitido. **Queda terminantemente prohibido el uso de espacios o guiones medios (`-`)**.
- **Technical_Description:**

  - **Idioma:** Estrictamente en **Inglés**.
  - **Estilo:** `Pascal_Snake_Case` (Cada palabra debe iniciar con mayúscula y estar unida por un guion bajo).
  - **Contenido:** Debe describir la refactorización o cambio de ingeniería a nivel de código, jamás el beneficio de cara al usuario final.

- **Ejemplo Correcto de Grado Industrial:**
  `V.8.1.0.4_Implemented_Polymorphic_Forensic_Audit_Hook`
- **Ejemplo Incorrecto (Prohibido):**
  `V.8.1.0.4_Fixed select bugs and updated styling`

---

## SECTION 2: PROTOCOLO DE SINCRONIZACIÓN Y DESPLIEGUE (PUSH)

Antigravity tiene **estrictamente prohibido** automatizar u operar un `git push` sin validación y autorización previa del GrayMan. El flujo de ejecución se divide en dos fases obligatorias:

### Fase A: Validación de Versión y Pre-Flight Check

Antes de tocar el CLI de Git, Antigravity presentará al GrayMan un reporte compacto con:

1. La propuesta del número de versión incremental exacto (`V.x.x.x_...`).
2. El resumen analítico de los archivos modificados/afectados.
3. **Linting Mental:** Confirmación de que el código propuesto está libre de errores sintácticos que puedan abortar el build en producción.

### Fase B: Ejecución de Disparador Técnico

Únicamente cuando el GrayMan otorgue la orden explícita (escribiendo _"Hacer Push"_, _"push"_ o _"Go"_), la IA procederá a simular o dictar la secuencia exacta de comandos de consola:

```bash
git add .
git commit -m "[Mensaje_Segun_Protocolo_Estricto]"
git push origin [branch_actual]
```
