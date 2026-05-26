# Análisis de costos · COUNCILia

> Estimaciones basadas en la arquitectura real del código (3 agentes paralelos, réplica, síntesis).  
> Tipo de cambio referencia: $17.50 MXN/USD · Mayo 2026

**Nota clave:** El costo más grande no es el LLM — es ElevenLabs. A escala, la voz sintética puede representar el 60–75% del COGS de un usuario Plus/Pro activo. El modelo GPT-4o-mini es sorprendentemente barato: ~$0.00073 por turno completo de 3 agentes + réplica.

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

### ElevenLabs eleven_v3 — $0.0002 por carácter (~escala Creator+)

| Agente | Palabras | Chars | Costo/click |
|--------|----------|-------|-------------|
| Marco | ~70 | ~385 | $0.0770 |
| Elena | ~60 | ~330 | $0.0660 |
| Rafael | ~25 | ~137 | $0.0274 |
| Promedio | ~52 | ~284 | $0.0568 |

> Solo se genera audio si el usuario presiona "Escuchar". Modelo: `eleven_v3`.

---

## 2. Costo promedio por usuario / mes (COGS)

> Supuestos: Free = 2 chats × 4 msg; Plus = 8 chats × 8 msg, 12% voz; Pro = 20 chats × 12 msg, 18% voz

### Free — Gemini Flash · 2 chats/mes · 4 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (Gemini Flash) | $0.0043 |
| ElevenLabs | $0.0000 |
| Supabase + Infra | $0.0250 |
| **TOTAL** | **$0.029** |

### Plus — GPT-4o-mini · 8 chats/mes · 8 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (GPT-4o-mini) | $0.0493 |
| ElevenLabs | $0.8064 |
| Supabase + Infra | $0.0800 |
| **TOTAL** | **$0.936** |

### Pro — GPT-4o-mini · 20 chats/mes · 12 msg/chat

| Componente | Costo/mes |
|------------|-----------|
| LLM (GPT-4o-mini) | $0.1814 |
| ElevenLabs | $4.5360 |
| Supabase + Infra | $0.1600 |
| **TOTAL** | **$4.877** |

---

## 3. Planes y precios (precios en MXN)

> Margen bruto sobre COGS directo. No incluye salarios ni amortización de desarrollo.

| Plan | Precio MXN/mes | Equiv. USD/mes | COGS/usuario (USD) | Margen bruto |
|------|---------------|---------------|-------------------|-------------|
| Free | Gratis | Gratis | $0.029 | Mktg |
| Plus | **$85 MXN** | ~$4.86 USD | $0.936 | **81%** |
| Pro  | **$210 MXN** | ~$12.00 USD | $4.877 | **59%** |

> **Nota:** El precio Pro más accesible (de $420 a $210 MXN) reduce el margen de 80% a 59%, pero hace el plan mucho más competitivo para el mercado mexicano. El margen sigue siendo positivo incluso para usuarios Pro activos con voz.

---

## 4. Detalle de planes

### Free — Gratis para siempre

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | 1 activo |
| Mensajes por chat | 5 |
| Historial guardado | Solo el último |
| Modelo LLM | Gemini Flash |
| Voz (ElevenLabs) | No |
| Síntesis al cierre | Sí |

> COGS: $0.029/usuario·mes. Riesgo: usuarios que abren y cierran chats repetidamente — considera límite de 10 chats nuevos/mes.

---

### Plus — $85 MXN/mes (~$4.86 USD)

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | 10 |
| Mensajes por chat | 20 |
| Historial guardado | Últimos 10 chats |
| Modelo LLM | GPT-4o-mini |
| Voz (ElevenLabs) | Sí — 3 voces por agente |
| Síntesis al cierre | Sí |
| Exportar chat | No |

> COGS: $0.936/usuario·mes · Margen bruto: **81%**. ElevenLabs = $0.806 (86% del COGS).

---

### Pro — $210 MXN/mes (~$12.00 USD)

| Parámetro | Límite |
|-----------|--------|
| Chats simultáneos | Sin límite |
| Mensajes por chat | Sin límite |
| Historial guardado | Todo el historial |
| Modelo LLM | GPT-4o-mini (+ síntesis GPT-4o) |
| Voz (ElevenLabs) | Sí — autoplay secuencial |
| Síntesis al cierre | Sí (modelo más potente) |
| Exportar chat | Sí (PDF / markdown) |

> COGS: $4.877/usuario·mes · Margen bruto: **59%**. ElevenLabs = $4.536 (93% del COGS). Monitorear uso de voz en Pro.

---

## 5. Proyecciones por número de usuarios

**Mix asumido: 70% Free · 22% Plus ($85 MXN/mes) · 8% Pro ($210 MXN/mes)**  
Solo COGS variables — sin salarios ni hosting base.

---

### 1,000 usuarios → 700 Free · 220 Plus · 80 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$35,500** | **$2,029** |
| COGS total | $10,790 | $617 |
| **Utilidad bruta** | **$24,710** | **$1,412** |
| **Margen bruto** | **70%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $28 | $490 | 5% |
| ElevenLabs (voz) | $540 | $9,450 | 88% |
| Supabase + Infra | $48 | $840 | 8% |
| **COGS TOTAL** | **$617** | **$10,790** | **100%** |

---

### 5,000 usuarios → 3,500 Free · 1,100 Plus · 400 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$177,500** | **$10,143** |
| COGS total | $53,949 | $3,083 |
| **Utilidad bruta** | **$123,551** | **$7,060** |
| **Margen bruto** | **70%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $142 | $2,485 | 5% |
| ElevenLabs (voz) | $2,701 | $47,268 | 88% |
| Supabase + Infra | $240 | $4,200 | 8% |
| **COGS TOTAL** | **$3,083** | **$53,949** | **100%** |

---

### 10,000 usuarios → 7,000 Free · 2,200 Plus · 800 Pro

| Métrica | MXN/mes | USD/mes |
|---------|---------|---------|
| **Ingresos brutos** | **$355,000** | **$20,286** |
| COGS total | $107,897 | $6,166 |
| **Utilidad bruta** | **$247,103** | **$14,120** |
| **Margen bruto** | **70%** | — |

| Componente de costo | USD/mes | MXN/mes | % del COGS |
|--------------------|---------|---------|-----------|
| LLM (Gemini + GPT-4o-mini) | $284 | $4,970 | 5% |
| ElevenLabs (voz) | $5,403 | $94,553 | 88% |
| Supabase + Infra | $479 | $8,383 | 8% |
| **COGS TOTAL** | **$6,166** | **$107,897** | **100%** |

> **Supabase:** El plan Free soporta hasta 50,000 MAU sin costo adicional. A 10,000 usuarios estamos dentro del tier gratuito. El costo de DB se vuelve real por encima de 50k MAU (~$25 USD/mes por Supabase Pro).

> **Costos NO incluidos:** Hosting/servidor (Vercel/Railway ~$20-50 USD/mes), dominio (~$15 USD/año), soporte al cliente, salarios del equipo. El COGS aquí refleja solo APIs de IA e infraestructura de datos.

---

## 6. ¿GPT-4o para Pro vale la pena?

> GPT-4o cuesta ~16× más que gpt-4o-mini. Con el margen Pro más ajustado (59%), esto se vuelve más crítico.

| Escenario Pro | LLM / usuario·mes | COGS total | Margen a $12 USD/mes |
|---------------|-------------------|------------|---------------------|
| Solo GPT-4o-mini ✅ | $0.181 | $4.877 | 59% |
| Síntesis con GPT-4o (1 llamada/chat) ⚠️ | $0.285 | $4.981 | 58% |
| Todo GPT-4o (posturas + réplica + síntesis) ❌ | $2.903 | $7.599 | 37% |

> **Recomendación:** usar GPT-4o solo en síntesis para Pro (1 llamada/chat). Con el precio de $210 MXN, usar GPT-4o en todo bajaría el margen a 37% — no viable.

---

## 7. Supuestos y variables críticas

### Lo que puede encarecer el costo

| Variable | Impacto |
|----------|---------|
| Usuarios Free que generan muchos chats nuevos | Alto |
| Uso masivo de voz en Plus/Pro | Alto (93% COGS Pro) |
| Chats con historial largo (>15 mensajes) | Medio |
| Síntesis larga / reintentos | Bajo |
| Supabase por encima de 50k MAU | Medio |

### Lo que puede abaratar

| Táctica | Ahorro estimado |
|---------|----------------|
| Caché de system prompts (OpenAI Prompt Caching) | ~50% en input tokens |
| Limitar historial en contexto a últimos N turnos | 20–40% en input |
| Voz solo en Plus+ (sin fallback ElevenLabs en Free) | Elimina mayor COGS variable |
| Rate-limiting conservador en Free | Protege contra abuso |
| Gemini para Free (ya en código) | ~33% vs GPT-4o-mini |

---

*Cálculos: gpt-4o-mini $0.15/1M in · $0.60/1M out · Gemini 2.0 Flash $0.10/1M in · $0.40/1M out · ElevenLabs eleven_v3 ~$0.0002/char · Supabase Free hasta 50k MAU · $17.50 MXN/USD · Mayo 2026*
