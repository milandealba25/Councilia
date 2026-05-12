# COUNCILia · Roadmap

> Las 8 semanas del MVP, los entregables de cierre y la visión post-MVP (v1.2 → v1.4+). Documento 8 de 9 de la serie del MVP v1.1.

---

## 1. Roadmap MVP — 8 semanas

Cuatro fases de dos semanas. La prioridad es **validar la dinámica deliberativa antes de escalar features**.

| Semanas | Fase | Entregables principales | Foco |
|---|---|---|---|
| 1 – 2 | Core deliberativo | Orquestador funcional, 3 agentes con system prompts versionados, llamadas paralelas a Claude con streaming, Tension Detector básico, una réplica selectiva, Synthesis Generator. Sin auth, sin persistencia. | Crítico técnico |
| 3 – 4 | Onboarding + UX | Encuesta de 4 preguntas, presentación del council, UI de 3 cards en paralelo (responsive escritorio/móvil), botón "Pedir síntesis", síntesis renderizada con estructura fija, política de contenido sensible activa. | UX |
| 5 – 6 | Auth + persistencia | Supabase Auth, modelo de datos, historial de conversaciones, retomar sesión anterior, ajustes (borrar conversación / cuenta). | Fundación |
| 7 – 8 | Pulido + validación | Pruebas con 20–30 usuarios reales, instrumentación de métricas cuantitativas, iteración sobre síntesis y prompts, preparación de demo. | Validación |

---

## 2. Entregables de cierre del MVP

Al final de las 8 semanas, el producto debe tener:

- **App desplegada en Vercel** con dominio propio (no `*.vercel.app`).
- **3 agentes estables en producción** con system prompts versionados en repo.
- **Métricas cuantitativas instrumentadas** y un dashboard básico (vista sencilla sobre Supabase).
- **20+ síntesis reales** generadas por usuarios externos al equipo.
- **Decisión documentada** sobre el siguiente paso: *"v1.2 sí"* / *"pivote"* / *"iterar el MVP otra vuelta"*.

La decisión final no es opinión: se basa en la hipótesis numérica ya fijada (tasa de finalización ≥ 60% y retorno a 7 días ≥ 25%).

---

## 3. Riesgos del cronograma

Los tres riesgos que más probablemente desplazan la entrega:

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Tension Detector heurístico no encuentra contradicciones útiles en >15% de las sesiones | Media | Tener un fallback con LLM-as-judge listo para activar como flag, no construido en paralelo. |
| Calibración de prompts de los agentes toma más turnos de los previstos (típicamente sobrepasa por ~40%) | Alta | Reservar 30% del tiempo de las fases 1–2 a iteración de prompts, no a features nuevos. |
| Costo por sesión > $0.25 en pruebas reales | Baja | Activar las palancas de reducción de output documentadas en el documento de operaciones. |

---

## 4. Roadmap post-MVP

Una vez validada la dinámica deliberativa con usuarios reales, la evolución prioritaria es la siguiente. Cada release tiene un foco claro y se valida antes de pasar al siguiente.

### 4.1 v1.2 — Pieles, encuesta extendida e interrupción (1–2 meses post-MVP)

| Feature | Descripción |
|---|---|
| **Cuarto agente: SOFÍA (la Creativa)** | Reframing, upside no convencional, pensamiento lateral. Solo se incorpora si las métricas muestran que falta una función objetivo que los 3 actuales no cubren. Si los datos dicen que no hace falta, no entra. |
| **Encuesta extendida (6 preguntas)** | Se añaden edad/etapa de vida y nivel de experiencia, que sí mueven el dial cuando hay pieles dinámicas. |
| **Pieles dinámicas (arquetipo + piel)** | Marco/Elena/Rafael mantienen su función objetivo pero cambian de nombre, avatar y referencias según `userContext`. Branding interno + intimidad externa. |
| **Interrupción durante streaming** | Pausar el council, dirigir pregunta a un agente específico, caja de texto siempre activa. Requiere refactor del Agent Runner para soportar cancelación coordinada. |

### 4.2 v1.3 — Memoria, móvil y councils custom (3–6 meses post-MVP)

| Feature | Descripción |
|---|---|
| **Memoria persistente entre sesiones** | Cada agente recuerda contexto previo del mismo usuario con resúmenes acotados, no historial crudo. |
| **App móvil nativa (React Native / Expo)** | Reutiliza la orquestación. UX optimizada para móvil (cards apiladas, gesto de "siguiente postura"). |
| **Councils custom** | El usuario diseña y guarda sus propios agentes con especialidad, pesos y restricciones (post-MVP de "councils guardados" en la encuesta). |
| **Tier equipo** | Councils compartidos en organizaciones, comentarios sobre síntesis, integración Slack / Notion. |

### 4.3 v1.4+ — Voz y herramientas externas (6–12 meses post-MVP)

| Feature | Descripción |
|---|---|
| **Voice-first** | Conversación natural alrededor de la mesa redonda, con voces distintas por agente. Requiere experimentar con latencia E2E y modelos de voz. |
| **Multimodal con herramientas externas** | Búsqueda web, datos financieros, documentos del usuario, calendario. Cuidado: cada herramienta es una nueva superficie de seguridad y de calidad. Se añaden de a una. |

---

## 5. Reglas de admisión al roadmap

Cada feature post-MVP necesita pasar tres filtros antes de entrar al backlog real:

1. **¿Tiene una métrica que valide su existencia?** Si el feature no mueve ningún KPI definido, no entra. *"Se ve bonito"* no cuenta.
2. **¿Hay una hipótesis falsable de impacto?** Por ejemplo: *"esta feature aumenta el retorno a 7 días en ≥ 5 puntos porcentuales"*. Si no se puede medir, va a "más adelante", no al roadmap.
3. **¿Bloquea o habilita otra cosa del roadmap?** Las features que solo se justifican entre sí son síntoma de roadmap inflado.

Tres "sí" significan: entra al roadmap con prioridad. Tres "no" significan: no se discute más esta vuelta.
