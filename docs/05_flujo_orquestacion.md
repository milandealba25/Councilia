# COUNCILia · Flujo Conversacional y Orquestación

> Cómo se siente la conversación desde el lado del usuario, qué hace el orquestador detrás, qué reglas duras siguen los agentes y cómo se cierra una sesión con tradeoffs explícitos. Documento 5 de 9 de la serie del MVP v1.1.

---

## 1. Forma del flujo

El flujo del MVP tiene **4 fases visibles + 1 invisible**. No hay interrupción durante streaming (eso va a v1.2). No hay tres botones de decisión por turno (eso genera parálisis). Hay una conversación que avanza con orden claro.

### Fase 0 — Setup invisible (~1 segundo)

El usuario describe su situación y la envía. El orquestador hace tres cosas en silencio:

1. Lee `userContext` y el mensaje del usuario.
2. Decide **el orden visual** de intervención (no aleatorio).
3. Lanza las tres llamadas a Claude **en paralelo**.

UI: aparecen los 3 avatares con un texto sobrio: *"Reuniendo a Marco, Elena y Rafael…"*. Esa micro-transición ya genera anticipación.

### Fase 1 — Posturas iniciales en paralelo

Los 3 agentes responden **al mismo tiempo, con streaming visible**, en 3 cards adyacentes (escritorio) o apiladas (móvil). Cada postura tiene un límite de ~150–200 tokens. Cada agente da su postura cruda, sin haber leído a los otros.

Por qué paralelo y no secuencial:

- Se siente como una **mesa real** donde 3 personas piensan al mismo tiempo, no como una fila.
- Refuerza la idea de **3 lentes simultáneas** sobre el mismo problema.
- Es **3× más rápido** que esperar uno tras otro.
- Evita que el último agente "gane" por tener más contexto que los demás.

### Fase 2 — Réplica selectiva automática

Cuando los 3 terminan, el **Tension Detector** elige el par con mayor contradicción semántica y el orquestador dispara **una sola réplica**: *"X responde a Y"*. La réplica vuelve a aparecer en card, etiquetada como tal.

> Regla dura del MVP: **una réplica, no dos.** Si el Tension Detector no encuentra contradicción interesante (raro), se omite y se va directo a Fase 3.

### Fase 3 — Punto de decisión del usuario

La UI muestra **dos opciones únicamente**:

| Acción | Qué pasa |
|---|---|
| Escribir un nuevo mensaje | El orquestador re-evalúa con la info nueva + lo dicho hasta ahora, y vuelve a Fase 1 con un mini-turno (postura corta de cada agente, sin réplica). |
| Pulsar **"Pedir síntesis"** | Salta a Fase 4. |

No hay un botón "que deliberen entre ellos" porque la réplica ya se ejecuta sola en Fase 2.

### Fase 4 — Síntesis

El **Synthesis Generator** cierra. Nombra 2–3 caminos visibles y 1–2 tradeoffs irreductibles. **Nunca recomienda.** Nunca se dispara automáticamente: siempre la pide el usuario.

---

## 2. Reglas duras de orquestación

Reglas que son defaults del sistema. Solo se incumplen con justificación explícita en código.

1. **Posturas iniciales: siempre los 3 en paralelo**, con `max_tokens` por agente de 250.
2. **Réplica: máximo 1 por turno**, elegida por el Tension Detector entre el par con mayor contradicción semántica.
3. **Síntesis: solo a petición del usuario**, nunca automática.
4. Si `userContext.decisionType` es **emocional pura** (relación personal + `feared_loss = arrepentirme`), Marco se atenúa: solo interviene en la síntesis. La fase 1 corre con Elena y Rafael.
5. Cada agente lee **su propio prompt + userContext + mensaje del usuario**. En la réplica, además, lee **solo la postura del agente al que responde** (no la de los tres). Esto evita convergencia.
6. **Streaming siempre activado** desde el primer token. La percepción de velocidad es parte del producto.
7. Ningún agente menciona a otro por nombre fuera de la fase de réplica.
8. La síntesis **no menciona a los agentes**, habla del problema.

---

## 3. Síntesis con tradeoffs explícitos

La síntesis es el cierre del producto. Es la única parte que el usuario va a recordar literalmente. Su redacción importa más que cualquier otro turno.

### 3.1 Lo que la síntesis SÍ debe hacer

- Listar **2 o 3 caminos visibles** identificados durante la deliberación.
- Hacer explícitos los **tradeoffs irreductibles** entre esos caminos (qué ganas vs. qué pierdes en cada uno, en términos comparables).
- Devolver **el poder de decisión al usuario** con una frase final tipo: *"Esto no se resuelve con lógica. Se decide con lo que tú estás dispuesto/a a aceptar de aquí en adelante."*

### 3.2 Lo que la síntesis NO debe hacer

- **No** dar una recomendación final ("yo en tu lugar haría X").
- **No** balancear artificialmente las posturas para sonar "neutral".
- **No** resolver la tensión: nombrarla, dejarla visible.
- **No** inventar un cuarto camino "intermedio" para complacer.
- **No** mencionar a los agentes por nombre.

### 3.3 Estructura fija de salida

La síntesis se renderiza con un template determinístico, no como prosa libre:

```
Caminos visibles
  • [camino 1, 1 línea]
  • [camino 2, 1 línea]
  • [camino 3, 1 línea]   ← opcional

Tradeoffs irreductibles
  • [tensión 1 entre dos caminos]
  • [tensión 2 si aplica]

Lo que esto te pide decidir
  [1–2 líneas, devolución del poder al usuario]
```

Razón de la estructura fija: las síntesis tienen que ser **exportables a PDF/markdown** desde el día 1 (es un feature del tier pro). Una estructura fija hace que la exportación se vea bien sin diseño adicional.

---

## 4. Comportamientos especiales

### 4.1 Mensaje vago del usuario

Si el primer mensaje del usuario tiene menos de ~20 palabras o no contiene un dilema identificable, los 3 agentes **devuelven solo una pregunta cada uno**, no una postura. Es la única excepción a la regla de "postura cruda en fase 1".

### 4.2 Usuario pide síntesis demasiado pronto

Si el usuario pulsa "Pedir síntesis" antes de que la fase 1 haya terminado para los 3 agentes, el botón espera y se desbloquea cuando los 3 acaben. No se permite síntesis sin postura completa.

### 4.3 Detección de crisis

Si el mensaje del usuario contiene señales de crisis emocional aguda, ideación suicida o autolesión, el orquestador **suspende el flujo deliberativo** y entra en modo Soporte (ver documento 7 — Operaciones).

---

## 5. Métricas de salud del flujo

El flujo se monitorea con tres métricas técnicas en producción:

| Métrica | Umbral saludable |
|---|---|
| Tiempo hasta primer token visible (fase 1) | < 1.5 s |
| Tiempo total de fase 1 (los 3 terminan) | < 6 s |
| Tasa de réplicas omitidas (no hubo contradicción) | < 15% |

Si la tasa de réplicas omitidas crece por encima del 15%, el problema está en el Tension Detector, no en los agentes: el detector está siendo demasiado estricto al medir contradicción.
