# Guía Técnica: Replicación del Hero Section (PIIC Standards)

Esta guía detalla los componentes visuales y técnicos necesarios para replicar exactamente el diseño del Hero de `piic.com.mx` en otros proyectos o subdominios.

## 1. Tipografía (Google Fonts: Inter)

El proyecto utiliza **Inter** para todo el sistema. Asegúrate de incluirla en tu `<head>` o via `@import`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Tamaños y Pesos:

| Elemento        | Desktop | Mobile | Peso (Weight) | Color     |
| :-------------- | :------ | :----- | :------------ | :-------- |
| **Título (H1)** | 48px    | 34px   | 700           | `#ffffff` |
| **Subtítulo**   | 20px    | 16px   | 400           | `#ffffff` |
| **Botones**     | 15px    | 15px   | 500           | Variable  |

---

## 2. Paleta de Colores (CSS Variables)

Define estas variables en tu archivo de estilos global (`:root`):

```css
:root {
  --color-primary: #0f2a44; /* Azul Corporativo */
  --color-accent: #f2b705; /* Amarillo PIIC */
  --color-white: #ffffff;
  --color-subtitle: #ffffff;
}
```

---

## 3. El Filtro de Imagen (Background Overlay)

El secreto del diseño "premium" de PIIC es la combinación de dos degradados sobre la imagen de fondo.

### La lógica técnica:

1. **Degradado Lineal:** Crea profundidad de arriba hacia abajo.
2. **Degradado Radial:** Crea un punto de luz sutil en la zona del texto (izquierda).

### Código CSS:

```css
.hero-section {
  position: relative;
  /* El orden es importante: degradados primero, imagen después */
  background-image: linear-gradient(rgba(15, 42, 68, 0.9), rgba(15, 42, 68, 0.75)),
    url('/assets/TU-NUEVA-IMAGEN.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed; /* Efecto Parallax sutil */
  min-height: 100vh;
  display: flex;
  align-items: center;
}

/* Efecto de luz radial adicional */
.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 50%, rgba(242, 183, 5, 0.05), transparent 40%);
  pointer-events: none;
}
```

---

## 4. Estructura de Botones

Los botones deben seguir este estilo exacto para mantener la consistencia.

### CSS de Botones:

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.3s ease;
  min-width: 200px; /* Tamaño estándar en Hero */
  text-decoration: none;
}

.btn-primary {
  background-color: var(--color-accent);
  color: var(--color-primary);
}

.btn-primary:hover {
  background-color: #d9a404; /* Oscurecimiento sutil */
}

.btn-outline {
  border: 1px solid var(--color-white);
  color: var(--color-white);
}

.btn-outline:hover {
  background-color: var(--color-white);
  color: var(--color-primary);
}
```

---

## 5. Textos Exactos y Estructura (Copywriting)

Para el proyecto principal (PIIC), los textos son:

- **H1 (Título):** `Suministro industrial, tecnológico y comercial para operaciones que no pueden detenerse`
- **P (Subtítulo):** `Respuesta rápida y suministro confiable para el sector minero e industrial.`
- **Botón 1 (Primary):** `Solicitar cotización`
- **Botón 2 (Outline):** `Ver servicios`

### Estructura HTML recomendada:

```html
<section class="hero-section">
  <div class="container">
    <div class="hero-content">
      <h1>[TITULO]</h1>
      <p class="hero-subtitle">[SUBTITULO]</p>
      <div class="hero-actions">
        <a href="#contacto" class="btn btn-primary">Solicitar cotización</a>
        <a href="#servicios" class="btn btn-outline">Ver servicios</a>
      </div>
    </div>
  </div>
</section>
```

---

---

## 6. Construcción del Logotipo (Círculo + PIIC)

El logotipo de PIIC no es una imagen, es un **SVG dinámico** con capas animadas. Es crítico respetar los valores de `viewBox` y `clipPath` para que la animación no se desfase.

### Estructura SVG (HTML):

```html
<div class="logo">
  <svg class="logo-icon animated-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <clipPath id="logoMask">
        <circle cx="50" cy="50" r="45" />
      </clipPath>
    </defs>
    <!-- Capa 1: Base Amarilla -->
    <rect x="0" y="0" width="100" height="100" fill="#F2B705" clipPath="url(#logoMask)" />
    <!-- Capa 1.1: Base Azul (Lado Izquierdo) -->
    <rect x="0" y="0" width="50" height="100" fill="#0F2A44" clipPath="url(#logoMask)" />

    <!-- Capa 2: Animación Sol Crece -->
    <rect
      class="sun-grow-left-v5"
      x="50"
      y="0"
      width="0"
      height="100"
      fill="#F2B705"
      clipPath="url(#logoMask)"
    />

    <!-- Capa 3: Animación Luna Llena -->
    <rect
      class="luna-full-rl-v5"
      x="100"
      y="0"
      width="100"
      height="100"
      fill="#0F2A44"
      clipPath="url(#logoMask)"
    />

    <!-- Capa 4: Animación Sol Restauración -->
    <rect
      class="sol-half-rl-v5"
      x="100"
      y="0"
      width="50"
      height="100"
      fill="#F2B705"
      clipPath="url(#logoMask)"
    />

    <!-- Borde Estático -->
    <circle cx="50" cy="50" r="45" fill="none" stroke="#F2B705" strokeWidth="10" />
  </svg>
  <span class="logo-text">PIIC</span>
</div>
```

### Estilos del Texto y Contenedor (CSS):

```css
.logo {
  display: flex;
  align-items: center;
}

.logo-icon {
  width: 36px; /* Desktop */
  height: 36px;
  overflow: visible;
}

.logo-text {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-white);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'Inter', sans-serif;
  margin-left: 12px;
}

@media (max-width: 768px) {
  .logo-icon {
    width: 28px;
    height: 28px;
  }
  .logo-text {
    font-size: 24px;
    margin-left: 8px;
  }
}
```

---

## 7. Animación Exacta del Logo (Versión V5)

La animación dura **30 segundos** en un loop infinito y lineal. Si la animación "hace cosas raras", asegúrate de que los valores de `x` y `width` coincidan exactamente con estos Keyframes:

```css
.sun-grow-left-v5 {
  animation: sunGrowLeftV5 30s infinite linear;
}
.luna-full-rl-v5 {
  animation: lunaFullRLV5 30s infinite linear;
}
.sol-half-rl-v5 {
  animation: solHalfRLV5 30s infinite linear;
}

@keyframes sunGrowLeftV5 {
  /* 0-3s: Reposo, invisible */
  0%,
  10% {
    x: 50px;
    width: 0;
  }
  /* 3-4.5s: Crece a la izquierda */
  15% {
    x: 0px;
    width: 50px;
  }
  /* Se mantiene cubriendo la base */
  15.01%,
  100% {
    x: 0px;
    width: 50px;
  }
}

@keyframes lunaFullRLV5 {
  /* 0-4.5s: Fuera a la derecha */
  0%,
  15% {
    x: 100px;
  }
  /* 4.5-7.5s: Desliza y cubre todo el círculo */
  25% {
    x: 0px;
  }
  /* Se mantiene */
  25.01%,
  100% {
    x: 0px;
  }
}

@keyframes solHalfRLV5 {
  /* 0-7.5s: Fuera a la derecha */
  0%,
  25% {
    x: 100px;
  }
  /* 7.5-9s: Entra para restaurar el lado derecho */
  30% {
    x: 50px;
  }
  /* Reposo largo antes de reiniciar el ciclo de 30s */
  30.01%,
  100% {
    x: 50px;
  }
}
```

---

## 8. Pro-Tip para Subdominios

Si estás construyendo un subdominio (ej: `it.piic.com.mx`), **mantén todo igual** y solo cambia:

1.  La imagen de fondo en el `background-image`.
2.  El texto del H1 si es necesario para el nicho, pero manteniendo el H1 con el mismo tamaño y peso.
