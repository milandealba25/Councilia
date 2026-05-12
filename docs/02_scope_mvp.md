# COUNCILia · Scope del MVP

> Qué se construye en el MVP v1.1, qué se pospone a v1.2+ y por qué. Documento 2 de 9 de la serie.

---

## 1. Punto de partida

El MVP v1.1 resuelve una tensión real entre dos documentos previos:

- Un **MVP técnico original** conservador: 4 agentes 100% fijos, sin encuesta, flujo automático.
- Una **visión expandida (README)** ambiciosa: encuesta de 6 preguntas, pieles dinámicas por contexto, interrupción durante streaming, 3 botones de decisión por turno.

Este documento define el **scope honesto** del primer release: toma del MVP original lo que ya está bien dimensionado, conserva del README solo lo que es construible y validable en 8 semanas, y pospone el resto al roadmap post-MVP.

> Regla operativa: **si está marcado como MVP en este documento, va al sprint. Si no, va al roadmap post-MVP, sin excepciones.**

---

## 2. Lo que se conserva del MVP original

Cinco decisiones del MVP original se mantienen **sin modificación**, porque son las que sostienen el producto:

- **El insight central:** "el desacuerdo emerge de funciones objetivo incompatibles, no de prompts de personalidad". Es el diferenciador defendible y no es trivial. Cualquier competidor que lo replique como "4 chatbots con personalidades distintas" pierde.
- **Decir NO a LangChain / CrewAI desde el día 1.** Esos frameworks asumen agentes colaborativos. Aquí los queremos contradiciéndose. Forzar un framework genérico ahorra dos semanas de inicio y cuesta seis meses de deuda técnica.
- **Síntesis que nombra tradeoffs en lugar de recomendar.** Es lo más difícil de defender comercialmente y a la vez lo más valioso. Aguantar la presión por "dar la respuesta" es el producto.
- **Stack escogido con criterio de velocidad:** Next.js + Tailwind + Supabase + Claude API + Vercel. Es exactamente lo que recomendaríamos a alguien que quiere validar en 8 semanas sin sobre-ingeniería.
- **El orquestador propio (no genérico).** Intent Classifier, Agent Runner, Debate Router, Tension Detector y Synthesis Generator como componentes internos están bien identificados.

> Estas cinco decisiones no se tocan. Todo lo demás se puede revisar.

---

## 3. Lo que se recorta del README expandido

El README añadía cuatro capacidades que el MVP original no incluía. Cada una se evalúa por separado:

| # | Capacidad del README | Decisión en MVP v1.1 | Por qué |
|---|---|---|---|
| 1 | Encuesta de onboarding (4–6 preguntas) que genera `userContext` | **Versión recortada (4 preguntas)** | La encuesta es necesaria para calibrar el council, pero 6 preguntas con edad/experiencia añaden fricción que no mueve el dial sin pieles dinámicas. |
| 2 | Arquetipo + piel dinámica (nombre, avatar y tono según contexto) | **Pospuesto a v1.2** | Destruye el branding entre sesiones. Marco/Elena/Rafael recurrentes generan "tu council". |
| 3 | Sistema de interrupción durante el streaming | **Pospuesto a v1.2** | Cancelar 3 streams en paralelo, re-orquestar contexto y mantener la UI sin race conditions toma 1–2 semanas adicionales que no pagan en validación. |
| 4 | Punto de decisión con 3 botones explícitos por turno | **Versión recortada (1 botón: "Pedir síntesis")** | Tres botones generan parálisis. La réplica deliberativa se dispara automáticamente, no se le pide permiso al usuario. |

---

## 4. Tabla maestra de decisiones de producto

Resumen ejecutivo de qué entra al MVP v1.1 y qué no:

| Capacidad | MVP v1.1 | v1.2+ |
|---|---|---|
| 3 agentes con funciones objetivo incompatibles | Sí (Marco, Elena, Rafael) | — |
| Cuarto agente (Sofía, creativa) | No | Sí |
| Posturas iniciales en paralelo con streaming | Sí | — |
| 1 réplica deliberativa selectiva (Tension Detector) | Sí, automática | — |
| Síntesis con tradeoffs explícitos | Sí, siempre manual | — |
| Encuesta de onboarding | Sí, 4 preguntas | 6 preguntas + perfil |
| Pieles dinámicas (nombre/avatar/tono por contexto) | No | Sí |
| Interrupción del usuario durante el streaming | No | Sí |
| Auth + persistencia (Supabase) | Sí, básica | Memoria entre sesiones |
| Historial de conversaciones | Sí | Búsqueda y tags |
| Councils custom (el usuario diseña los suyos) | No | Sí (v1.3+) |
| App móvil nativa | No (PWA básica) | React Native (v1.3+) |
| Voice-first | No | Sí (v1.4+) |

---

## 5. Cómo se aplica esta tabla a un dilema concreto

Cuando aparezca la tentación de meter un feature al MVP que no está en la tabla, la pregunta no es *"¿es buena idea?"* — casi todas lo son. La pregunta es:

1. **¿Bloquea la validación del núcleo deliberativo?** Si no, va al roadmap.
2. **¿Tiene una métrica que justifique su existencia?** Si no, va al roadmap.
3. **¿Cuántas horas-persona del sprint se gastan en él?** Si la respuesta es "no sé", va al roadmap.

Tres "no" significan: roadmap. Tres "sí" significan: traer la propuesta a una decisión explícita de producto, no agregarla por inercia.
