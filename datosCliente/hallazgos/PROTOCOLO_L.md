# PROTOCOLO L - Manual de Referencia para la IA

Este documento define la dinámica de interacción imperativa entre el USUARIO y el asistente de IA (Antigravity).

## 1. El Disparador (Trigger)

El **Protocolo L** solo debe activarse si el mensaje del USUARIO contiene la letra **"L"** (preferiblemente al final o como comando aislado).

- **Si el mensaje contiene "L"**: Se debe responder obligatoriamente siguiendo la estructura de las 4 preguntas.
- **Si el mensaje NO contiene "L"**: El asistente debe proceder de manera convencional (ejecución directa, respuestas concisas, sin estructura rígida).

## 2. Estructura de Respuesta Imperativa

Cuando el protocolo está activo, la respuesta DEBE contener estas cuatro secciones exactas:

### 1. ¿Qué entiendes?

Resumen detallado de los requerimientos y objetivos de la tarea solicitada.

### 2. ¿Qué opinas?

Análisis técnico, crítico y estético de la solicitud. Sugerencias de mejora o advertencias sobre posibles efectos secundarios.

### 3. ¿Qué propones?

Plan de acción detallado, incluyendo archivos a modificar, nuevas implementaciones o pasos lógicos a seguir.

### 4. Espera mis instrucciones

Cierre de la respuesta solicitando refinamiento, comentarios o el "Go" para proceder. **No se debe ejecutar ninguna acción de escritura/modificación de código hasta recibir el "Go" del usuario.**

## 3. Principios de Ingeniería Soberana

Para garantizar una experiencia de grado industrial ("Zero-Noise"), se deben seguir estos principios en todo el desarrollo:

### Silk Hydration (Hidratación de Seda)

Es **obligatorio** que todo componente que consuma datos externos (API) implemente persistencia local:

1. **Caché-First**: El estado inicial debe leerse de `archonCache` para mostrar datos instantáneamente al montar el componente.
2. **Sincronización Silenciosa**: El fetch de red debe ocurrir en segundo plano y actualizar la caché y el estado sin interrumpir al usuario.
3. **Resiliencia**: En caso de fallo de red, se deben mantener los datos de la caché en pantalla.

---

_Este protocolo es de cumplimiento obligatorio y prevalece sobre cualquier otra instrucción general de comunicación._
