# Product

## Register

product

## Users

Toda la empresa de Wara GPS con distintos roles: directivos que revisan KPIs y tendencias a vuelo de pájaro, el equipo de administración/finanzas que hace análisis detallado (facturación, cobranza, balance), y personal operativo con acceso a vistas específicas. El contexto de uso es mayormente desktop/laptop en horario laboral, con algún uso ocasional en tablet o TV (modo presentación).

## Product Purpose

Dashboard interno de Business Intelligence para Wara GPS (empresa argentina de seguimiento GPS). Consolida datos financieros importados de Google Sheets (facturación, cobranza, activo/pasivo corriente), análisis comercial de Odoo (facturación por provincia, deudores), contexto macroeconómico (cotizaciones), y configuración de sincronización automática. El éxito es que cualquier persona de la empresa pueda entender el estado del negocio en menos de un minuto.

## Brand Personality

Moderno, dinámico, impactante. El dashboard debe sentirse impresionante en sí mismo — no solo un contenedor de datos, sino una herramienta que transmite que la empresa tiene control total sobre sus números. Confianza a través de la claridad visual.

## Anti-references

- Software contable argentino (Tango, AFIP, Bejerman): interfaces grises, tablas densas, jerarquía visual plana, tipografía sin carácter
- Generic corporate BI clutter: widget-farms sin jerarquía, todo igual de importante, nada resalta
- Formularios de gobierno: bordes duros, colores institucionales, sin ritmo visual

## Design Principles

1. **Datos primero, UI después** — la interfaz amplifica los números; nunca compite con ellos. Los datos importantes se leen en 3 segundos.
2. **Jerarquía implacable** — no todo puede ser urgente. Cada pantalla tiene un dato protagonista, luego contexto, luego detalle.
3. **Paleta al servicio del significado** — el color debe codificar información (rojo = alerta, verde = cumplido, ámbar = atención), no decorar.
4. **Impresión sin ruido** — "impactante" no significa recargado. Lograrlo con espacio, peso tipográfico y contraste; no con gradientes en todo.
5. **Dark-mode nativo** — la empresa usa el dashboard durante el día y en presentaciones con proyectores; ambos modos deben ser de primera clase.

## Accessibility & Inclusion

WCAG AA como mínimo (contraste 4.5:1 cuerpo, 3:1 textos grandes). Soporte de `prefers-reduced-motion` para animaciones. Uso de `prefers-color-scheme` como señal inicial del modo oscuro aunque el toggle manual lo puede sobreescribir.
