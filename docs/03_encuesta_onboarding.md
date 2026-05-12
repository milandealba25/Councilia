# COUNCILia · Encuesta de Onboarding

> Cómo entra el usuario al producto, qué se le pregunta y cómo cada respuesta cambia la dinámica del council. Documento 3 de 9 de la serie del MVP v1.1.

---

## 1. Por qué hay encuesta

COUNCILia **no empieza** preguntando *"¿en qué te ayudo?"* como un chatbot común. Empieza diciendo:

> *"Antes de reunir tu council, necesito entender tu contexto."*

Esa frase posiciona el producto como algo distinto: **íntimo, profesional y deliberado**. Y la encuesta hace dos cosas a la vez:

- **Calibrar al council.** Las respuestas alimentan al orquestador para decidir qué peso tiene cada agente, con qué tono habla y qué pregunta dominante ataca primero.
- **Construir intimidad.** El usuario siente que sus respuestas tuvieron consecuencia real. No es burocracia, es **personalización con propósito**.

> Si el usuario contesta y nada cambia, perdimos la promesa. Cada respuesta tiene que producir un efecto observable.

---

## 2. Las 4 preguntas

La encuesta del MVP tiene **exactamente 4 preguntas**. Las que el README original tenía sobre edad y experiencia se posponen a v1.2, cuando se incorporen las pieles dinámicas: hoy no mueven el dial lo suficiente para justificar la fricción.

### Pregunta 1 — ¿Qué tipo de decisión vas a poner sobre la mesa?

Opciones:

- Negocio / estrategia
- Dinero / finanzas
- Carrera / trabajo
- Relación personal
- Producto / creativa
- Vida en general

### Pregunta 2 — ¿Cuánta presión de tiempo tienes?

Opciones:

- Hoy / esta semana
- Este mes
- Estoy explorando, sin prisa

### Pregunta 3 — ¿Qué necesitas que el council haga contigo?

Opciones:

- Que me confronten lo que estoy evitando ver
- Que me ayuden a estructurar el problema
- Que me muestren caminos que no veo
- Que me ayuden a decidir entre opciones que ya tengo

### Pregunta 4 — ¿Qué riesgo te molestaría más equivocarte?

Opciones:

- Perder dinero o recursos
- Perder tiempo
- Arrepentirme emocionalmente
- Decepcionar a alguien

---

## 3. Por qué cada pregunta importa

Cada pregunta se traduce a una decisión del orquestador. Si una respuesta no cambia el comportamiento del sistema, la pregunta sobra.

| Pregunta | Para qué se usa en el orquestador |
|---|---|
| 1 — Tipo de decisión | Decide **qué peso relativo** tiene cada agente. Una decisión de negocio prioriza a Marco; una decisión emocional pura atenúa a Marco y prioriza a Rafael. |
| 2 — Presión de tiempo | Calibra **el tono**: urgente → más directo, menos exploratorio; sin prisa → más estructurador, más preguntas abiertas. |
| 3 — Qué necesita el council | Ajusta **la mezcla** de tipos de intervención. *"Confróntenme"* enfatiza al Crítico; *"ayúdenme a estructurar"* enfatiza al Estratega. |
| 4 — Qué riesgo duele | Define **la pregunta dominante** que cada agente debe atacar primero (downside material vs. emocional vs. social). |

---

## 4. El objeto `userContext`

Las 4 respuestas se condensan en un objeto pequeño que el orquestador inyecta como bloque de contexto en el system prompt de cada agente:

```ts
userContext = {
  decisionType: "carrera",
  urgency: "este mes",
  needFromCouncil: "confrontar",
  feared_loss: "arrepentirme"
}
```

El objeto es **el contrato** entre la encuesta y el resto del sistema. Mientras `userContext` se mantenga estable como interfaz, la encuesta puede evolucionar (más preguntas, formulario reescrito, A/B test del copy) sin romper nada aguas abajo.

---

## 5. Notas de diseño

Reglas duras para que la encuesta no se convierta en fricción ni en deuda técnica:

- La encuesta tarda **menos de 30 segundos** en total. Si una opción requiere más de una línea de explicación, está mal redactada.
- Las 4 respuestas son **siempre obligatorias** en el MVP. Sin "prefiero no decir" — eso obligaría a manejar ramas vacías en el orquestador antes de validar nada.
- Las preguntas y opciones se **versionan en código** (`survey.v1.ts`, `survey.v2.ts`) para poder iterar el copy sin romper el historial guardado de conversaciones previas.
- La pantalla de la encuesta es **una sola** vista con las 4 preguntas a la vez, no un wizard de 4 pasos. Reduce el costo psicológico de empezar.
- `userContext` se guarda **por council**, no por sesión: si el usuario abre una segunda sesión con el mismo council, no tiene que volver a contestar.

---

## 6. Lo que NO entra al MVP

Para mantener el alcance honesto:

- **Sin perfil de usuario.** No se pregunta edad, género, ocupación, ni nivel de experiencia. Eso entra en v1.2 con pieles dinámicas.
- **Sin onboarding tutorial.** Después de la encuesta, el usuario va directo a su primera situación. La explicación del producto se da implícitamente al ver al council operar.
- **Sin guardado intermedio.** Si abandona la encuesta a la mitad, empieza de nuevo. Manejar resúmenes parciales no aporta en el MVP.
- **Sin opciones libres.** Todas las preguntas son de selección, no campos de texto. Texto libre llega solo al primer mensaje propio del usuario al council.
