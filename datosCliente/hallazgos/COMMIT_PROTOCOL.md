# PROTOCOLO DE COMMITS Y PUSH

Este documento establece el estándar obligatorio para el registro de cambios y la sincronización con el repositorio remoto (GitHub).

## 1. Formato del Título del Commit

Todos los mensajes de commit deben seguir estrictamente el siguiente patrón:

**`V.x.x.x_technical_description_in_english`**

### Desglose del formato:

- **`V.x.x.x`**: Representa la versión actual del cambio (Major.Minor.Patch.Build).
- **`_`**: Guion bajo como separador entre la versión y la descripción.
- **`technical_description_in_english`**: Descripción técnica clara y concisa de lo realizado, escrita en inglés y utilizando guiones bajos en lugar de espacios si es necesario para mantener la consistencia visual.

### Ejemplo:

`V.1.0.5.12_remove_table_row_hover_borders_in_global_css`

## 2. Instrucciones de Sincronización (Push)

Cuando el USUARIO indique las palabras clave **"Hacer Push"** o **"push"**, la IA deberá:

1.  Confirmar la versión actual a utilizar.
2.  Preparar todos los cambios (`git add .`).
3.  Realizar el commit local con el formato descrito arriba.
4.  Ejecutar el push al repositorio remoto en GitHub.

---

_Este protocolo asegura un historial de Git profesional, técnico y perfectamente trazable._
