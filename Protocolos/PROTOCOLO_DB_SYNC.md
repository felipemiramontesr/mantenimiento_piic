# 🔱 PROTOCOLO DE SINCRONIZACIÓN DE BASE DE DATOS (LOCAL -> REMOTO)

**Nivel de Autorización:** Arquitecto de Infraestructura (GrayMan)
**Objetivo:** Erradicar discrepancias estructurales entre el entorno Local (`archon`) y Producción (`u701509674_Mant_piic`) estableciendo el esquema local como la "Fuente de la Verdad" (Ground Truth).

---

## 🛑 ADVERTENCIA DE SEGURIDAD (DATA LOSS)

La ejecución de este protocolo asume que **NO EXISTEN DATOS CRÍTICOS O DE PRODUCCIÓN** en la base de datos remota que deban ser preservados. Al ejecutar la purga (Drop), todos los datos del servidor remoto serán destruidos irreversiblemente antes de la inyección.

---

## 🛠️ FASE 1: EXTRACCIÓN (Exportación Local)

1. Abre tu administrador de base de datos local (phpMyAdmin, DBeaver o Workbench).
2. Selecciona la base de datos local (`archon`).
3. Ve a la pestaña de **Exportar**.
4. Selecciona el método **"Personalizado"** (Custom).
5. **[CRÍTICO]** En la sección de "Opciones de creación de objetos", asegúrate de **DESMARCAR** la opción que dice _"Agregar declaración CREATE DATABASE / USE"_.
   - _Razón Técnica:_ Hostinger no permite comandos globales de creación de base de datos dentro del usuario asignado. El archivo `.sql` resultante solo debe contener sentencias `CREATE TABLE` e `INSERT INTO`.
6. Exporta y guarda el archivo `.sql`.

---

## 💥 FASE 2: PURGA QUIRÚRGICA (Entorno Remoto)

1. Ingresa al panel de **Hostinger** y abre **phpMyAdmin**.
2. Selecciona tu base de datos de producción: `u701509674_Mant_piic`.
3. Desplázate hasta el final de la lista de tablas.
4. Haz clic en **"Marcar todos"** (Check all).
5. En el menú desplegable junto a la selección ("Con los seleccionados..."), elige **"Eliminar" (Drop)**.
6. Confirma la eliminación de todas las tablas.

> **🛡️ PROTOCOLO DE BLOQUEO DE LLAVES FORÁNEAS (Si aplica):**
> Si el sistema rechaza la eliminación de las tablas por dependencias cruzadas (Foreign Key Constraints), ejecuta la siguiente consulta SQL antes de intentar borrarlas:
>
> ```sql
> SET FOREIGN_KEY_CHECKS = 0;
> ```
>
> Posteriormente, intenta borrar las tablas nuevamente.

---

## 🧬 FASE 3: INYECCIÓN ESTRUCTURAL (Importación Remota)

1. Asegúrate de que la base de datos remota `u701509674_Mant_piic` esté seleccionada y muestre **0 tablas**.
2. Ve a la pestaña **"Importar"** dentro del phpMyAdmin de Hostinger.
3. Sube el archivo `.sql` que generaste en la FASE 1.
4. Ejecuta la importación.
5. Verifica que las tablas se hayan reconstruido correctamente y que no existan errores de sintaxis en el log de phpMyAdmin.

---

## ✅ VERIFICACIÓN FINAL (Zero-Noise)

Una vez importada la base de datos, el pipeline CI/CD en Hostinger conectará la API V2 (Node.js 24) con el nuevo esquema normalizado. Cualquier discrepancia de lectura/escritura habrá sido erradicada.
