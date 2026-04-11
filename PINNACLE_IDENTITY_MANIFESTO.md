# 🌌 PINNACLE IDENTITY MANIFESTO 🌌

> **Propósito**: Este documento es el ADN visual y lógico de PIIC. Debe ser utilizado como la "Guía de Diseño Imperativa" para cualquier nuevo proyecto (como el Sistema de Mantenimiento Vehicular) para garantizar una identidad de marca 100% coherente, premium y de estándar Silicon Valley.

---

## 🎨 1. ADN Cromático (Source of Truth)

Los colores deben aplicarse con precisión matemática. No se permiten variaciones de saturación o brillo sin autorización.

| Token                               | Valor HEX | Uso Principal                                    |
| :---------------------------------- | :-------- | :----------------------------------------------- |
| **Primary (Deep Space Blue)**       | `#0F2A44` | Fondos de Header, Footer, Hero y Brand Identity. |
| **Accent (Industrial Teck Yellow)** | `#F2B705` | CTAs, Iconos críticos, Resaltados y Animaciones. |
| **Background (Pristine Grey)**      | `#F2F4F7` | Fondo general de la aplicación.                  |
| **Secondary (Solid Grey)**          | `#2E2E2E` | Secciones oscuras alternativas y texto fuerte.   |
| **Text Primary**                    | `#1A1A1A` | Cuerpo de lectura y títulos en fondo claro.      |

---

## 📐 2. Geometría y Espaciado (The 8px Grid)

Todo el diseño se rige por la ley de los 8px para una armonía perfecta.

- **Section Padding**: Siempre `80px 0` (espacio para respirar).
- **Container**: Ancho máximo de `1200px` con padding lateral de `24px`.
- **Border Radius**:
  - Tarjetas y Contenedores: `8px`.
  - Botones e Inputs: `4px`.
- **Shadows**: Uso sutil de `box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05)` para elevación.

---

## 💎 3. El Logotipo (Geometría Generativa)

El logo no es una imagen, es **CÓDIGO**. Debe reconstruirse usando este SVG para mantener la nitidez infinita.

### Blueprint del Logo (SVG)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <clipPath id="logoMask">
      <circle cx="50" cy="50" r="45" />
    </clipPath>
  </defs>
  <!-- Base -->
  <rect x="0" y="0" width="100" height="100" fill="#F2B705" clip-path="url(#logoMask)" />
  <rect x="0" y="0" width="50" height="100" fill="#0F2A44" clip-path="url(#logoMask)" />
  <!-- Borde estático -->
  <circle cx="50" cy="50" r="45" fill="none" stroke="#F2B705" stroke-width="10" />
</svg>
```

---

## 🎭 4. Coreografía de Movimiento (Motion Design)

La interfaz no es estática; el diseño PIIC "respira".

### 4.1 Ciclo de Animación del Logo (The Sun/Moon Cycle)

- **Duración Total**: 30s (Loop Infinito).
- **Fases**:
  1. **Sun Growth**: El amarillo crece desde el centro hacia la izquierda (3-4.5s).
  2. **Moon Entry**: La base azul (`#0F2A44`) entra desde la derecha cubriendo todo (4.5-7.5s).
  3. **Sun Restoration**: El amarillo regresa desde la derecha hasta cubrir la mitad (7.5-9s).
- **Easing**: `linear` para el ciclo astronómico, `cubic-bezier(0.4, 0, 0.2, 1)` para interacciones de menú.

### 4.2 Micro-interacciones

- **Hover Transitions**: `all 0.3s ease`. Los elementos (botones, enlaces) deben suavizar su cambio de estado.
- **Elevation**: En hover, las tarjetas deben elevarse sutilmente y cambiar el color del borde a `#F2B705`.

---

## 🖋️ 5. Tipografía (Pinnacle Text Scale)

- **Fuente**: `Inter`, sans-serif (Google Fonts).
- **H1**: 48px / Bold (700).
- **H2**: 32px / Semi-bold (600).
- **Body**: 16px / Regular (400) / Line-height: 1.6.

---

## 📋 6. Prompt Blueprint para el Otro Proyecto

**Copia y pega este prompt al iniciar el desarrollo del sistema de mantenimiento:**

> \*"Actúa como un Senior Frontend Engineer de Silicon Valley. Vamos a construir un Sistema de Administración de Flota Vehicular. **Obligatoriamente**, debes seguir el MANIFIESTO DE IDENTIDAD PINNACLE adjunto.
>
> Instrucciones Críticas:
>
> 1. Usa la paleta `#0F2A44` (Primary) y `#F2B705` (Accent) exclusivamente.
> 2. Implementa el sistema de formularios 'Diamond' (inputs con focus en Teck Yellow y borde sutil).
> 3. Usa la fuente 'Inter' con espaciado de 8px.
> 4. Todas las tarjetas de flota deben usar Glassmorphism sutil y bordes de 8px.
> 5. La UI debe sentirse premium, limpia e industrial, reflejando el ADN de PIIC."\*

---

## 🛡️ 7. El Sistema de Formularios "Diamond"

Para el sistema de mantenimiento, los inputs deben seguir esta lógica:

- **Background**: `#FAFAFA` (reposo), `#FFFFFF` (focus).
- **Borde**: `#D1D5DB` (reposo), `#F2B705` (focus).
- **Sombra de Focus**: `0 0 0 3px rgba(242, 183, 5, 0.1)`.

---

© 2026 **Powered by PIIC TECH System**. _Engineered for visual immortality._
