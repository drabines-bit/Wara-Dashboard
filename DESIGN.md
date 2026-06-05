---
name: Wara GPS Dashboard
description: Business intelligence financiero interno — cada número tiene un rol, cada pantalla tiene un protagonista.
colors:
  brand-50: "#f0f9ff"
  brand-100: "#e0f2fe"
  azul-wara: "#0284c7"
  azul-wara-deep: "#0369a1"
  azul-wara-darker: "#075985"
  azul-wara-darkest: "#0c4a6e"
  accent-indigo: "#4f46e5"
  accent-purple: "#a855f7"
  status-success: "#10b981"
  status-warning: "#f59e0b"
  status-danger: "#f43f5e"
  bg-page: "#f8fafc"
  bg-surface: "#ffffff"
  bg-surface-elevated: "#1e293b"
  ink-primary: "#0f172a"
  ink-secondary: "#475569"
  ink-muted: "#94a3b8"
  border-subtle: "#f1f5f9"
  border-strong: "#e2e8f0"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "#4338ca"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  status-badge-success:
    backgroundColor: "#ecfdf5"
    textColor: "#065f46"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  status-badge-warning:
    backgroundColor: "#fffbeb"
    textColor: "#92400e"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  status-badge-danger:
    backgroundColor: "#fff1f2"
    textColor: "#9f1239"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Wara GPS Dashboard

## 1. Overview

**Creative North Star: "El Centro de Control"**

Este sistema es una herramienta de misión crítica, no una pieza de diseño de vitrina. La metáfora es el cockpit o la sala de operaciones de un negocio: todo dato visible cumple una función, la jerarquía visual es inmediata, y quien llega a la pantalla sabe en tres segundos cuáles son los números que importan. El diseño transmite que la empresa tiene control total sobre su información financiera.

La densidad es intencional: múltiples KPIs conviven en la misma pantalla sin pelear por atención. Esto se logra con peso tipográfico contrastante (bold en los números protagonistas, regular en el contexto), separación clara entre secciones, y un sistema de color semántico que codifica significado en lugar de decorar. La "impresión" viene del control, no de los efectos.

El sistema rechaza explícitamente la estética del software contable argentino (Tango, AFIP, formularios de gobierno): bordes duros, grises sin jerarquía, tipografía plana. También rechaza el widget-farm corporativo donde todo compite con igual peso. La herramienta se proyecta en reuniones de directorio; debe tener autoridad visual sin sacrificar legibilidad.

**Key Characteristics:**
- Único font family (Plus Jakarta Sans): la jerarquía se logra con peso y tamaño, no con múltiples tipografías
- Paleta semántica fija: Emerald/Amber/Rose son exclusivos para estados (éxito/advertencia/peligro); no se usan como acento decorativo
- Dark mode de primera clase: no una inversión de colores, sino una variante calibrada para presentaciones con proyector
- Cards como contenedores de datos con hover-lift sutil: la interactividad se siente sin exagerarse
- Máximo de tres capas de elevación: página → card → modal/drawer

## 2. Colors: The Control Palette

Paleta de mando: un azul técnico como eje, índigo para acciones, y semáforos precisos para el estado del negocio. Los neutros tienen chroma tendiendo al cool (slate, no warm-gray).

### Primary

- **Azul Wara** (`#0284c7`): El azul de identidad. Usado en la barra de progreso principal, el header brand mark, y elementos interactivos de primera jerarquía. Sky-600 en la escala Tailwind. OKLCH equivalente: `oklch(56% 0.18 231)`.
- **Azul Wara Deep** (`#0369a1`): Hover y estado activo del primario. Links, botones brand al hacer hover.
- **Azul Wara Darker** (`#075985`): Estado pressed/focus visible en elementos primarios.
- **Azul Wara Darkest** (`#0c4a6e`): Texto sobre fondos claros cuando se necesita el color brand en tipografía.
- **Brand Tint 100** (`#e0f2fe`): Fondos de destacado suave, hover backgrounds de filas con marca.
- **Brand Tint 50** (`#f0f9ff`): Fondos casi-blancos con tono brand (alert backgrounds, highlight sutil).

### Secondary

- **Índigo Acción** (`#4f46e5`): Botones de acción primaria (admin, confirmaciones). Se diferencia del Azul Wara para que las acciones se distingan de los datos de identidad. OKLCH: `oklch(52% 0.27 274)`.
- **Índigo Hover** (`#4338ca`): Estado hover/pressed del índigo.

### Tertiary

- **Púrpura Odoo** (`#a855f7`): Exclusivo para el panel de análisis comercial (Odoo). Diferencia visualmente los datos de facturación/cobranza (brand blue) de los datos de clientes/deudores (purple).

### Neutral

- **Ink Primary** (`#0f172a`): Texto de mayor jerarquía, números protagonistas, headings. Slate-950.
- **Ink Secondary** (`#475569`): Texto de contexto, labels de categoría, valores secundarios. Slate-600.
- **Ink Muted** (`#94a3b8`): Metadatos, timestamps, placeholders. Slate-400. No usar para texto informativo; solo para contexto de apoyo.
- **Surface Page** (`#f8fafc`): Fondo de página. Slate-50 con tendencia cool — no cream, no warm-neutral. Slate-50.
- **Surface Card** (`#ffffff`): Fondo de cards y panels en modo claro.
- **Surface Elevated Dark** (`#1e293b`): Fondo de cards en dark mode. Slate-800.
- **Border Subtle** (`#f1f5f9`): Bordes de cards en modo claro. Slate-100.
- **Border Strong** (`#e2e8f0`): Divisores dentro de cards, líneas de tabla. Slate-200.

### Semantic

- **Success** (`#10b981`): Cumplimiento ≥95%, variación positiva, liquidez solvente. Emerald-500.
- **Warning** (`#f59e0b`): Cumplimiento 80-95%, variación estable (-5% a +5%), liquidez ajustada. Amber-500.
- **Danger** (`#f43f5e`): Cumplimiento <80%, caída >5%, liquidez crítica. Rose-500.

### Named Rules

**The Semaphore Rule.** Emerald, Amber y Rose son exclusivos para estados del negocio (semáforos). No se usan como acento decorativo ni para diferenciar secciones. Quien vea verde sabe que es éxito; quien vea rojo sabe que es crítico. La ambigüedad destruye el sistema.

**The One-Blue Rule.** El Azul Wara identifica la marca y los datos de negocio primarios (facturación, cobranza). El Índigo identifica acciones del usuario (botones). El Púrpura identifica el origen Odoo. Tres blues distintos con roles distintos — nunca intercambiables.

## 3. Typography

**Font Family:** Plus Jakarta Sans (Google Fonts, subset latin)
**Fallback:** system-ui, sans-serif

**Character:** Una sans-serif geométrica con calidez humanista — no es tan fría como Inter, no es tan decorativa como Circular. Funciona bien a pesos extremos (300 a 800) lo que permite una jerarquía de datos amplia con un solo typeface.

### Hierarchy

- **Display** (700, clamp 1.875rem–3rem, line-height 1.1, tracking -0.02em): KPIs protagonistas, números de resumen en cards principales. Un número de esta escala por card máximo.
- **Headline** (600, 1.25rem/20px, line-height 1.3, tracking -0.01em): Títulos de sección principales y tab headers.
- **Title** (600, 0.875rem/14px, line-height 1.4): Cabeceras de card, etiquetas de gráficos, nombres de panel.
- **Body** (400, 0.875rem/14px, line-height 1.6): Datos en tabla, texto descriptivo, valores de celdas. El tamaño universal de datos.
- **Label** (500, 0.75rem/12px, line-height 1.4): Metadatos, timestamps, leyendas de gráfico, fuentes de datos. El mínimo legible con peso suficiente para distinguirse de `ink-muted`.

### Named Rules

**The Single-Family Rule.** Cero font families adicionales. La jerarquía se construye con escala y peso, no con mezcla tipográfica. Agregar una segunda familia no añade riqueza; añade ruido.

**The Numbers-First Rule.** Los números financieros siempre en `font-feature-settings: "tnum" 1` (tabular numerals) para que las columnas alineen correctamente. Usar la clase Tailwind `tabular-nums` en cualquier valor numérico en tabla.

## 4. Elevation

El sistema usa **sombras ambientales suaves** como estrategia base. Las superficies no son completamente planas, pero tampoco tienen profundidad estructural pronunciada. La regla: las sombras responden al estado, no a la jerarquía en reposo.

En dark mode, la profundidad se expresa con diferencia tonal (slate-900 → slate-800 → slate-700) antes que con sombras, ya que las sombras sobre fondos oscuros requieren valores más altos para ser visibles y rápidamente se vuelven pesadas.

### Shadow Vocabulary

- **Ambient Resting** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): Estado por defecto de todos los cards. Equivalente a `shadow-sm` de Tailwind. Casi imperceptible — solo define el borde del plano.
- **Ambient Hover** (`box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`): Estado hover en cards interactivos, combinado con `transform: translateY(-1px)`. La elevación y el lift son simultáneos.
- **Elevated** (`box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)`): Dropdowns, popovers, tooltips. Diferencia un layer flotante del contenido base.
- **Modal** (`box-shadow: 0 20px 60px rgba(0,0,0,0.15)`): Modales y drawers. El límite superior del sistema.

### Named Rules

**The Hover Lift Rule.** Los cards interactivos (clickables, expandibles) añaden `transform: translateY(-1px)` junto con el aumento de sombra en hover. Los cards puramente informativos (no clickables) no tienen hover state visual. La animación comunica "esto es interactivo" antes del cursor.

**The Dark Tonal Rule.** En dark mode, la diferencia entre layers se logra con tonal steps (bg-slate-900 / bg-slate-800 / bg-slate-700), no con sombras adicionales. Las sombras en dark mode se usan solo en modales y drawers.

## 5. Components

### Buttons

El sistema tiene tres tipos de botón. La forma es consistente (rounded-md, 8px); la diferencia está en el relleno.

- **Shape:** Gently rounded (8px / `rounded-md`)
- **Primary** (`bg-indigo-600 text-white px-3 py-1.5 text-xs font-medium`): Para acciones de admin y confirmaciones. Índigo, no Azul Wara — las acciones se distinguen visualmente de los datos.
- **Hover:** `bg-indigo-700`, `transform: translateY(-1px)`
- **Focus:** `outline-2 outline-indigo-500 outline-offset-2`
- **Ghost / Secondary** (`text-slate-500 hover:text-[accent] text-xs`): Botones de contexto dentro de panels (Actualizar, Reintentar). Sin background en reposo, color semántico del panel en hover.
- **Danger** (`text-xs font-medium text-red-600 underline`): Solo en contextos de error (Reintentar en estado de fallo de Odoo). Sin background, text-link style.

### Cards / Containers

La unidad compositiva central del dashboard.

- **Corner Style:** Softly rounded (16px / `rounded-2xl`)
- **Background:** White en modo claro (`#ffffff`), Slate-800 en dark (`#1e293b`)
- **Shadow:** Ambient Resting por defecto; Ambient Hover en cards interactivos
- **Border:** 1px Subtle (`#f1f5f9` claro / slate-700 oscuro)
- **Internal Padding:** 20px (`p-5`) estándar; reducir a 12px (`p-3`) solo en subcomponentes internos
- **Nested cards:** Prohibido. Si el contenido requiere separación interna, usar dividers (`border-b`) o background tints, nunca un card dentro de un card.

### Status Badges

Chips de estado semántico. Usados en celdas de KPI para indicar el semáforo del negocio.

- **Shape:** Minimally rounded (4px / `rounded`)
- **Structure:** `inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border`
- **Success:** `bg-emerald-50 text-emerald-700 border-emerald-200` (dark: `bg-emerald-950/20 text-emerald-400 border-emerald-800`)
- **Warning:** `bg-amber-50 text-amber-700 border-amber-200` (dark: same pattern en amber)
- **Danger:** `bg-rose-50 text-rose-700 border-rose-200` (dark: same pattern en rose)
- **Neutral:** `bg-slate-50 text-slate-700 border-slate-200`

### Macro Pills

Componente de contexto macroeconómico. Rectángulos compactos con ícono + valor + sublabel.

- **Shape:** `rounded-xl` (12px), `border border-slate-100 dark:border-slate-700`
- **Layout:** `flex items-center gap-3 px-4 py-3`
- **Icon:** Tabler Icons, `text-2xl`, color semántico según el dato
- **Background:** Blanco en reposo; tinted (`bg-emerald-50`/`bg-amber-50`/`bg-red-50`) cuando el dato tiene estado semántico

### KPI Section Headers

Encabezados de sección dentro de cards y panels. Patrón: dot de color + heading + badge de estado.

- **Structure:** `flex items-center gap-2` con un `w-1 h-5 rounded-full bg-[accent]` como identificador visual de la sección, seguido de `h3 text-sm font-semibold`
- **El dot no es una side-stripe.** Es un elemento independiente de 4px de ancho, no un `border-left`. No aplicar el patrón invertido (border-left > 1px).

### Navigation / Tabs

Tabs horizontales para alternar vistas del dashboard.

- **Default:** Texto `text-slate-500` + icon + padding `px-3 py-4`
- **Active:** `text-indigo-600 border-b-2 border-indigo-600 font-medium`
- **Hover:** `text-slate-700`
- **Mobile:** Scroll horizontal con `overflow-x-auto`

### Chart.js Integration

Los gráficos usan la paleta del sistema, no la paleta por defecto de Chart.js.

- **Primary dataset:** `rgba(2, 132, 199, 0.8)` (Azul Wara con alpha)
- **Secondary dataset:** `rgba(79, 70, 229, 0.6)` (Índigo con alpha)
- **Grid lines:** `rgba(148, 163, 184, 0.2)` (ink-muted con alpha bajo)
- **Tick labels:** `#64748b` (ink-secondary)
- **Dark mode:** Las mismas reglas con alpha ajustado a 0.9 para mantener legibilidad

## 6. Do's and Don'ts

### Do:

- **Do** usar `tabular-nums` en todos los valores financieros en tabla para alinear columnas correctamente.
- **Do** reservar el semáforo (Emerald/Amber/Rose) exclusivamente para estados del negocio. Si un color semántico aparece en un contexto decorativo, rompe el sistema.
- **Do** usar `text-wrap: balance` en headings de sección (h2, h3) para evitar orphans en pantallas medianas.
- **Do** incluir `prefers-reduced-motion` en todas las animaciones: stagger de carga, hover lifts y skeleton pulses deben colapsar a instant o crossfade.
- **Do** mantener el contraste de cuerpo ≥4.5:1 en ambos modos. `ink-secondary (#475569)` sobre `bg-surface (#ffffff)` da 5.9:1 — el mínimo aceptable para texto de datos.
- **Do** usar `overflow-y-auto` con `maxHeight` en listas largas dentro de cards (top deudores, provincias) para preservar el layout del panel sin scroll de página.

### Don't:

- **Don't** usar `background-clip: text` con gradientes (`gradient text`). El header actual tiene esta clase — no propagarla a nuevos componentes. Si se quiere énfasis en un heading, usar `font-weight: 800` o un color sólido del sistema.
- **Don't** usar `border-left > 1px` como stripe de acento en cards o list items. El patrón activo usa un dot independiente (`w-1 h-5 rounded-full`), no un border-left. Si se necesita separación visual, usar un divider completo o un background tint.
- **Don't** hacer que el diseño parezca software contable argentino (Tango, AFIP): sin bordes hard de 2px en gris, sin tablas sin jerarquía, sin tipografía plana con Arial/Verdana.
- **Don't** añadir una segunda familia tipográfica. La jerarquía es 100% peso y tamaño dentro de Plus Jakarta Sans.
- **Don't** usar glassmorphism (`backdrop-filter: blur` + `bg-white/10`) en el sistema principal. Puede aparecer en overlays de presentación o TV mode, pero no en la UI de datos.
- **Don't** usar el widget-farm corporativo: todos los cards del mismo tamaño, mismo ícono, mismo padding, misma importancia visual. Variar el tamaño de grid por importancia del dato.
- **Don't** usar colores warm-neutral como fondo de página (cream, sand, `#fffdf7`). El fondo es `#f8fafc` (slate-50 con chroma cool). La calidez de la marca viene del Azul Wara, no del fondo.
- **Don't** aplicar sombras elevadas (`shadow-lg` o `shadow-xl`) a cards en reposo. Las sombras fuertes en reposo agotan la jerarquía disponible y no dejan espacio para estados hover/focus.
