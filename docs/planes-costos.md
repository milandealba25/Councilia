# Análisis de costos · COUNCILia

> Estimaciones basadas en la arquitectura real del código (3 agentes paralelos, réplica, síntesis).  
> Tipo de cambio referencia: $17.50 MXN/USD · Mayo 2026

**Nota clave:** al mover voz de ElevenLabs a TTS nativo (Google / OpenAI), el COGS baja de forma drástica. Con esta configuración, el costo de voz deja de dominar por completo y el margen bruto de Plus/Pro mejora de forma sustancial.

---

## 1. Anatomía de costo por turno (1 mensaje del usuario)

> Cada "turno" = 3 agentes en paralelo + réplica (60% prob.) · Síntesis: 1 llamada por chat al final

### GPT-4o-mini (Plus / Pro) — Por turno: $0.00073

| Fase | Input tok | Output tok | Costo |
|------|-----------|------------|-------|
| 3 agentes (paralelo) | 3 300 | 165 | $0.00059 |
| Réplica ×60% | 720 | 42 | $0.00013 |
| Síntesis (1×chat) | 1 500 | 200 | $0.00035 |

### Gemini 2.0 Flash (Free) — Por turno: $0.00048

| Fase | Input tok | Output tok | Costo |
|------|-----------|------------|-------|
| 3 agentes (paralelo) | 3 300 | 165 | $0.00040 |
| Réplica ×60% | 720 | 42 | $0.00009 |
| Síntesis (1×chat) | 1 500 | 200 | $0.00023 |

### TTS nativo (Google / OpenAI) — referencia $0.000015 por carácter

| Agente | Palabras | Chars | Costo/click |
|--------|----------|-------|-------------|
| Marco | ~70 | ~385 | $0.0058 |
| Elena | ~60 | ~330 | $0.0050 |
| Rafael | ~25 | ~137 | $0.0021 |
| Promedio | ~52 | ~284 | $0.0043 |

> Solo se genera audio si el usuario presiona "Escuchar".

---

## 2. Costo promedio por usuario / mes (COGS)

> Supuestos: Free = 2 chats × 4 msg; Plus = 8 chats × 8 msg, 12% voz; Pro = 20 chats × 12 msg, 18% voz

### Free — Gemini Flash · 2 chats/mes · 4 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (Gemini Flash) | $0.0043 |
| TTS (Google / OpenAI) | $0.0000 |
| Supabase + Infra | $0.0250 |
| **TOTAL** | **$0.0293** |

### Plus — GPT-4o-mini · 8 chats/mes · 8 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (GPT-4o-mini) | $0.0493 |
| TTS (Google / OpenAI) | $0.0605 |
| Supabase + Infra | $0.0800 |
| **TOTAL** | **$0.1898** |

### Pro — GPT-4o-mini · 20 chats/mes · 12 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (GPT-4o-mini) | $0.1814 |
| TTS (Google / OpenAI) | $0.3402 |
| Supabase + Infra | $0.1600 |
| **TOTAL** | **$0.6816** |

---

## 3. Planes y precios (precios en MXN)

> Margen bruto sobre COGS directo. No incluye salarios ni amortización de desarrollo.

| Plan | Precio MXN/mes | Equiv. USD/mes | COGS/usuario (USD) | Margen bruto |
|------|---------------|---------------|-------------------|-------------|
| Free | Gratis | Gratis | $0.0293 | Mktg |
| Plus | **$79 MXN** | ~$4.51 USD | $0.1898 | **96%** |
| Pro  | **$199 MXN** | ~$11.37 USD | $0.6816 | **94%** |

> **Nota:** aun con precios más agresivos ($79/$199), los márgenes quedan muy altos porque el cambio de stack de voz reduce de forma fuerte el COGS por usuario.

---

## 4. Detalle de planes

### Free — Gratis para siempre

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | 1 activo |
| Mensajes por chat | 5 |
| Historial guardado | Solo el último |
| Modelo LLM | Gemini Flash |
| Voz | No |
| Síntesis al cierre | Sí |

> COGS: $0.0293/usuario·mes. Riesgo: usuarios que abren y cierran chats repetidamente — considera límite de 10 chats nuevos/mes.

---

### Plus — $79 MXN/mes (~$4.51 USD)

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | 10 |
| Mensajes por chat | 20 |
| Historial guardado | Últimos 10 chats |
| Modelo LLM | GPT-4o-mini |
| Voz (TTS nativo) | Sí — Google / OpenAI |
| Síntesis al cierre | Sí |
| Exportar chat | No |

> COGS: $0.1898/usuario·mes · Margen bruto: **96%**. TTS = $0.0605 (~32% del COGS).

---

### Pro — $199 MXN/mes (~$11.37 USD)

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | Sin límite |
| Mensajes por chat | Sin límite |
| Historial guardado | Todo el historial |
| Modelo LLM | GPT-4o-mini (+ síntesis GPT-4o opcional) |
| Voz (TTS nativo) | Sí — Google / OpenAI |
| Síntesis al cierre | Sí (modelo más potente) |
| Exportar chat | Sí (PDF / markdown) |

> COGS: $0.6816/usuario·mes · Margen bruto: **94%**. TTS = $0.3402 (~50% del COGS).

---

## 5. Proyecciones por número de usuarios

**Mix asumido: 70% Free · 22% Plus ($79 MXN/mes) · 8% Pro ($199 MXN/mes)**  
Solo COGS variables — sin salarios ni hosting base.

---

### 1,000 usuarios → 700 Free · 220 Plus · 80 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$33,300** | **$1,903** |
| COGS total | $2,044 | $117 |
| **Utilidad bruta** | **$31,256** | **$1,786** |
| **Margen bruto** | **94%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $28 | $497 | 24% |
| TTS (Google / OpenAI) | $41 | $709 | 35% |
| Supabase + Infra | $48 | $838 | 41% |
| **COGS TOTAL** | **$117** | **$2,044** | **100%** |

---

### 5,000 usuarios → 3,500 Free · 1,100 Plus · 400 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$166,500** | **$9,514** |
| COGS total | $10,222 | $584 |
| **Utilidad bruta** | **$156,278** | **$8,930** |
| **Margen bruto** | **94%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $142 | $2,485 | 24% |
| TTS (Google / OpenAI) | $203 | $3,546 | 35% |
| Supabase + Infra | $240 | $4,191 | 41% |
| **COGS TOTAL** | **$584** | **$10,222** | **100%** |

---

### 10,000 usuarios → 7,000 Free · 2,200 Plus · 800 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$333,000** | **$19,029** |
| COGS total | $20,443 | $1,168 |
| **Utilidad bruta** | **$312,557** | **$17,860** |
| **Margen bruto** | **94%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $284 | $4,970 | 24% |
| TTS (Google / OpenAI) | $405 | $7,091 | 35% |
| Supabase + Infra | $479 | $8,383 | 41% |
| **COGS TOTAL** | **$1,168** | **$20,443** | **100%** |

> **Supabase:** el plan Free soporta hasta 50,000 MAU sin costo adicional. A 10,000 usuarios estamos dentro del tier gratuito. El costo de DB se vuelve real por encima de 50k MAU (~$25 USD/mes por Supabase Pro).

> **Costos NO incluidos:** Hosting/servidor (Vercel/Railway ~$20-50 USD/mes), dominio (~$15 USD/año), soporte al cliente, salarios del equipo. El COGS aquí refleja solo APIs de IA e infraestructura de datos.

---

## 6. ¿GPT-4o para Pro vale la pena?

> GPT-4o cuesta ~16× más que gpt-4o-mini. Con Pro en $199 MXN/mes (~$11.37 USD), sigue siendo rentable, pero hay que controlar alcance.

| Escenario Pro | LLM / usuario·mes | COGS total | Margen a $11.37 USD/mes |
|---------------|-------------------|------------|--------------------------|
| Solo GPT-4o-mini ✅ | $0.181 | $0.682 | 94% |
| Síntesis con GPT-4o (1 llamada/chat) ⚠️ | $0.285 | $0.785 | 93% |
| Todo GPT-4o (posturas + réplica + síntesis) ❌ | $2.903 | $3.403 | 70% |

> **Recomendación:** mantener GPT-4o-mini para posturas y réplica; usar GPT-4o solo en síntesis para Pro si buscas mayor calidad de cierre.

---

## 7. Supuestos y variables críticas

### Lo que puede encarecer el costo

| Variable | Impacto |
|----------|---------|
| Usuarios Free que generan muchos chats nuevos | Alto |
| Uso masivo de voz en Plus/Pro | Medio-Alto (~50% del COGS Pro) |
| Chats con historial largo (>15 mensajes) | Medio |
| Síntesis larga / reintentos | Bajo |
| Supabase por encima de 50k MAU | Medio |

### Lo que puede abaratar

| Táctica | Ahorro estimado |
|---------|----------------|
| Caché de system prompts (OpenAI Prompt Caching) | ~50% en input tokens |
| Limitar historial en contexto a últimos N turnos | 20–40% en input |
| TTS nativo (Google/OpenAI) vs ElevenLabs | ~92% menos costo de voz por carácter |
| Rate-limiting conservador en Free | Protege contra abuso |
| Gemini para Free (ya en código) | ~33% vs GPT-4o-mini |

---

*Cálculos: gpt-4o-mini $0.15/1M in · $0.60/1M out · Gemini 2.0 Flash $0.10/1M in · $0.40/1M out · TTS Google/OpenAI (supuesto blended) ~$0.000015/char · Supabase Free hasta 50k MAU · $17.50 MXN/USD · Mayo 2026*
