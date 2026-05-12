# COUNCILia · Tokens de diseño (v0)

Base para **A2** y **B1** del MVP: paleta sobria orientada a deliberación (contraste alto, sin “startup neon”). Los valores se exponen como variables CSS en `app/globals.css` y como clases Tailwind en `tailwind.config.ts`.

## Color

| Token | Hex | Uso |
|-------|-----|-----|
| `surface` | `#0c1117` | Fondo principal (modo oscuro por defecto en producto) |
| `surface-elevated` | `#151b24` | Tarjetas, paneles |
| `border` | `#263041` | Bordes discretos |
| `text` | `#e8edf5` | Texto principal |
| `text-muted` | `#8b9cb3` | Secundario, metadatos |
| `accent` | `#5b8def` | CTAs, foco, enlaces (deliberación = claridad, no urgencia comercial) |
| `accent-muted` | `#3d5a80` | Hover secundario |
| `tension` | `#c9a227` | Énfasis suave en tensiones / avisos (no alerta crisis) |
| `error` | `#e85d5d` | Errores recuperables |

## Tipografía

- **Sans (UI):** Geist Sans (`--font-geist-sans`).
- **Mono (diagnósticos / IDs):** Geist Mono (`--font-geist-mono`).

Escala sugerida (rem): `text-xs` 0.75 · `text-sm` 0.875 · `text-base` 1 · `text-lg` 1.125 · `text-xl` 1.25 · `text-2xl` 1.5.

## Espaciado y radios

- Escala Tailwind por defecto; densidad “council” = `p-4`/`p-6` en cards, `gap-4` en grillas de tres columnas.
- Radios: `rounded-lg` (8px) cards · `rounded-md` inputs.

## Motion

- Transiciones UI: 150–200 ms, `ease-out`. Animaciones de producto (Framer) en **B9**.

---

> Aprobación formal de **B1** puede ajustar hex y nombres; hasta entonces, este archivo es la fuente de verdad para implementación.
