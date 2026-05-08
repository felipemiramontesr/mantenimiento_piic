# PROTOCOLO DE COMMITS Y PUSH

Este documento establece el estándar obligatorio para el registro de cambios y la sincronización con el repositorio remoto (GitHub).

## 1. Formato del Título del Commit

Todos los mensajes de commit deben seguir estrictamente el siguiente patrón:

**`V.x.x.x_Technical_Description_With_Underscores`**

### Desglose del formato:

- **`V.x.x.x`**: Versión incremental (Última detectada: `V.75.0.0`).
- **`_`**: Separador obligatorio.
- **`Technical_Description`**: En inglés, con la primera letra de cada palabra preferiblemente en mayúscula.

### Ejemplo de referencia (Imagen):

`V.50.2.4_Updated_Audit_Report_With_Forensic_Certification`

## 2. Instrucciones de Sincronización (Push)

Siempre preguntar al usuario si debo hacer Push.

Cuando el USUARIO indique las palabras clave **"Hacer Push"** o **"push"**, la IA deberá:

1.  Confirmar la versión actual a utilizar.
2.  Preparar todos los cambios (`git add .`).
3.  Realizar el commit local con el formato descrito arriba.
4.  Ejecutar el push al repositorio remoto en GitHub.

---

_Este protocolo asegura un historial de Git profesional, técnico y perfectamente trazable._
