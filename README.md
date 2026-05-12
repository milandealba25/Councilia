# COUNCILia

> Plataforma conversacional multiagente donde un consejo de inteligencias especializadas delibera, confronta perspectivas y sintetiza tradeoffs reales para ayudar al usuario a tomar mejores decisiones personales y profesionales.

COUNCILia no es un chatbot más. Es una **mesa redonda de IA** donde cada agente tiene una función objetivo distinta — y a veces incompatible con la de los demás — para que el usuario reciba **deliberación real**, no validación.

---

## Tabla de contenidos

1. [Visión del producto](#1-visión-del-producto)
2. [Problema que resuelve](#2-problema-que-resuelve)
3. [Propuesta de valor central](#3-propuesta-de-valor-central)
4. [Onboarding diagnóstico (la encuesta de entrada)](#4-onboarding-diagnóstico-la-encuesta-de-entrada)
5. [Generación dinámica de agentes (arquetipo + piel)](#5-generación-dinámica-de-agentes-arquetipo--piel)
6. [Flujo conversacional ideal](#6-flujo-conversacional-ideal)
7. [Sistema de interrupción del usuario](#7-sistema-de-interrupción-del-usuario)
8. [Síntesis final con tradeoffs explícitos](#8-síntesis-final-con-tradeoffs-explícitos)
9. [Resumen visual del flujo completo](#9-resumen-visual-del-flujo-completo)
10. [Tabla de ejemplos por contexto del usuario](#10-tabla-de-ejemplos-por-contexto-del-usuario)
11. [Principios de diseño irrenunciables](#11-principios-de-diseño-irrenunciables)

---

## 1. Visión del producto

COUNCILia simula la dinámica de una **mesa redonda de inteligencias especializadas**. A diferencia de los asistentes de IA tradicionales, el usuario interactúa con **múltiples agentes en un mismo espacio conversacional**, cada uno con personalidad, objetivos y forma de razonamiento distintos.

El objetivo no es únicamente conversar con IA, sino transformar esa interacción en una **experiencia social, colaborativa e inteligente** basada en perspectivas dinámicas y deliberación genuina.

---

## 2. Problema que resuelve

Los asistentes de IA actuales tienen tres limitaciones críticas:

- **Perspectiva única**: una conversación adopta un solo enfoque desde el inicio, creando una cámara de eco intelectual.
- **Tendencia al consenso**: los LLMs convergen naturalmente a la validación y evitan el desacuerdo útil.
- **Ausencia de deliberación**: no existe un mecanismo para confrontar perspectivas incompatibles ni hacer visibles los tradeoffs reales.

---

## 3. Propuesta de valor central

> **COUNCILia no promete "mejores respuestas". Promete una conversación que te hace pensar mejor.**

El valor está en:

- Reducir puntos ciegos en decisiones complejas.
- Aumentar la exploración de escenarios alternativos.
- Mejorar el framing del problema **antes** de buscar soluciones.
- Forzar al usuario a confrontar tradeoffs reales en lugar de recibir síntesis artificialmente equilibradas.

---

## 4. Onboarding diagnóstico (la encuesta de entrada)

COUNCILia **no empieza** preguntando "¿en qué te ayudo?" como un chatbot común. Empieza diciendo:

> "Antes de reunir tu council, necesito entender tu contexto."

Esa frase sola ya posiciona el producto como algo distinto: **íntimo, profesional y deliberado**.

### 4.1 Preguntas sugeridas de la encuesta

La encuesta debe ser **corta, elegante y conversacional** (no un formulario burocrático). 4 a 6 preguntas máximo:

1. **¿Qué tipo de decisión quieres analizar?**  
   Negocio · Finanzas · Carrera · Relación personal · Producto · Inversión · Vida en general.

2. **¿Qué tan urgente es esta decisión?**  
   Hoy · Esta semana · Este mes · Largo plazo.

3. **¿Qué nivel de experiencia tienes en este tema?**  
   Principiante · Intermedio · Avanzado.

4. **¿Qué estilo de respuesta prefieres?**  
   Directa · Profunda · Crítica · Creativa · Paso a paso.

5. **¿Qué edad o etapa de vida describe mejor tu contexto?**  
   Adolescente · Universitario · Profesional joven · Fundador · Ejecutivo · Padre/Madre · Adulto mayor.

6. **¿Qué te preocupa más al tomar esta decisión?**  
   Perder dinero · Equivocarme · Arrepentirme · Perder tiempo · No ver oportunidades · Decepcionar a otros.

### 4.2 Por qué la encuesta importa tanto

La encuesta hace dos cosas simultáneamente:

1. **Calibrar al council**: las respuestas alimentan al Orquestador para decidir **qué agentes activar**, **con qué tono** y **con qué nivel de complejidad**.
2. **Construir intimidad**: el usuario siente que sus respuestas tuvieron consecuencia real. No es burocracia, es **personalización con propósito**.

### 4.3 El objeto `userContext`

Las respuestas de la encuesta se condensan en un objeto que el Orquestador pasa a cada agente como parte de su system prompt:

```ts
userContext = {
  ageRange: "15-18",
  experienceLevel: "principiante",
  decisionType: "carrera",
  urgency: "este mes",
  preferredTone: "claro y empático",
  mainFear: "equivocarme"
}
```

Este objeto es el que permite que **ELENA no le hable de "unit economics" a una persona de 16 años decidiendo qué estudiar**, y que **RAFAEL sea más suave con alguien inseguro y más directo con un founder que pidió crítica fuerte**.

---

## 5. Generación dinámica de agentes (arquetipo + piel)

Esta es probablemente la **decisión de producto más importante** del MVP. Hay dos extremos malos y un punto medio bueno:

| Enfoque | Pro | Contra |
|---|---|---|
| **100% fijo** (siempre Marco/Elena/Rafael/Sofía iguales) | Branding fuerte, consistencia | Se siente impersonal, no aprovecha la encuesta |
| **100% dinámico** (LLM inventa 4 agentes desde cero por sesión) | Máxima personalización | Pierdes branding, pierdes incompatibilidad estructural, inconsistencia entre sesiones |
| **Híbrido (recomendado)** | Intimidad **+** branding **+** rigor deliberativo | Requiere diseño cuidadoso de las "personas" |

### 5.1 La solución: 3 capas

#### Capa 1 — Arquetipos fijos (esqueleto inmutable)

Internamente **siempre** existen los 4 arquetipos con sus funciones objetivo incompatibles. Estos **nunca cambian**, son el motor deliberativo y aseguran el desacuerdo estructural:

- **El Estratega** → maximiza posicionamiento y visión a largo plazo.
- **La Analista** → minimiza riesgo, protege recursos.
- **El Crítico** → identifica puntos ciegos, cuestiona supuestos.
- **La Creativa** → reformula el problema, desbloquea upside no convencional.

#### Capa 2 — Nombre y "piel" dinámicos (lo que ve el usuario)

El **nombre**, el **avatar**, el **tono** y el **lenguaje** sí se adaptan al contexto del usuario:

| Contexto del usuario | El Estratega se llama… | El Crítico se llama… |
|---|---|---|
| 16 años, decide carrera | **Diego**, mentor de carreras | **Lucas**, tu hermano mayor honesto |
| 35 años, founder SaaS | **Marco**, estratega de negocios | **Rafael**, tu inversionista escéptico |
| 40 años, decisión de pareja | **Andrés**, terapeuta sistémico | **Mariana**, tu amiga sin filtro |
| 22 años, primer trabajo | **Sebastián**, coach laboral | **Pablo**, tu jefe exigente |

El **rol esencial es el mismo** (estratega/crítico/etc.), pero **el personaje, lenguaje y referencias se ajustan al contexto**.

#### Capa 3 — System prompt por capas

El prompt de cada agente se construye sumando capas:

```
[Función objetivo del arquetipo]            ← FIJO
+
[Personaje y nombre asignado por el orquestador]   ← DINÁMICO
+
[Tono y nivel de complejidad según userContext]    ← DINÁMICO
+
[Lo que NO debe hacer este agente]          ← FIJO
```

#### Ejemplos concretos del mismo arquetipo "El Crítico"

**Para un usuario de 16 años decidiendo qué estudiar:**

> Eres **LUCAS**, el hermano mayor honesto del usuario. Tu función es identificar puntos ciegos y supuestos ocultos sin ser cruel. Hablas con cariño pero sin endulzar. **No usas jerga corporativa**. No mencionas "unit economics" ni "downside risk". El usuario tiene 16 años y está decidiendo qué estudiar. Tu objetivo es que confronte lo que está evitando ver.

**Para un founder de 35 años con un SaaS:**

> Eres **RAFAEL**, un inversionista escéptico. Tu función es identificar puntos ciegos y supuestos ocultos. Hablas como si fueras la voz que el founder no quiere escuchar pero necesita. Usas lenguaje de negocio sin paternalismo. El usuario es founder de un SaaS en early stage.

**La función objetivo es idéntica. La piel cambia.**

### 5.2 Lo que NO se debe hacer

- **No** dejar que un LLM genere los agentes 100% libre ("crea 4 agentes para este caso"). Vas a perder la incompatibilidad estructural, los nombres serán inconsistentes y los agentes se llevarán demasiado bien.
- **No** dejar que el usuario nombre a sus agentes en el MVP. Eso es feature post-MVP de "councils custom".

---

## 6. Flujo conversacional ideal

Este es el corazón de la experiencia. **No es secuencial puro** (lento, el último gana), **no es aleatorio** (se siente arbitrario). Es **paralelo en posturas iniciales + secuencial selectivo en deliberación + interrupción siempre activa**.

### Fase 0 — Setup invisible (~1s)

El usuario escribe su situación y la envía. El **Orquestador** hace 3 cosas en silencio:

1. **Clasifica el tipo de problema** (emocional, estratégico, financiero, etc.).
2. **Decide qué agentes activar** (no siempre los 4: para "mi novio me hizo esto" puede que no entre el Estratega de negocio, pero sí el Crítico y la Creativa).
3. **Decide el orden visual de intervención** según relevancia, no aleatorio.

**UI**: aparecen los avatares de los agentes elegidos con un texto tipo:

> *"Reuniendo tu council: Rafael, Sofía y Elena…"*

Esa transición ya genera anticipación.

### Fase 1 — Posturas iniciales (en PARALELO)

> Los 3 agentes responden **al mismo tiempo, con streaming visible**.

Esto es lo más importante de entender: **no se hace en fila india**. En la UI ves 3 burbujas/cards apareciendo en paralelo, cada una con su avatar y nombre. Cada agente da su **postura cruda**, sin haber escuchado a los otros todavía.

#### Ejemplo concreto

Situación del usuario: *"No sé qué hacer con mi novio que me hizo esto."*

- **RAFAEL (crítico):** *"Antes de pensar qué hacer, párate. ¿Qué exactamente te hizo? Porque tu mensaje suena a que ya estás buscando justificarlo o justificar irte. ¿Cuál es?"*
- **SOFÍA (creativa):** *"Hay 3 versiones de ti que pueden tomar esta decisión: la que perdona, la que pone un límite, y la que se va. ¿Con cuál te identificas hoy y con cuál te quieres identificar en 1 año?"*
- **ELENA (riesgo/costo):** *"No estoy aquí para hablar de dinero, sino del costo emocional. ¿Cuánto tiempo llevas sintiéndote así? Porque hay un punto donde quedarte cuesta más que irte."*

#### Por qué paralelo

- Se siente como una **mesa real** donde 3 personas piensan al mismo tiempo, no como una fila.
- Refuerza la idea de **3 lentes simultáneas**.
- Es **3x más rápido** que esperar uno tras otro.
- Evita que el último agente "gane" por tener más contexto que los demás.

### Fase 2 — Punto de decisión del usuario

Después de las posturas iniciales, la UI muestra **3 opciones claras**:

| Botón | Qué pasa |
|---|---|
| **"Quiero responder antes de que sigan"** | El usuario aporta info nueva. El orquestador re-evalúa. |
| **"Que deliberen entre ellos"** | El orquestador identifica la mayor tensión y manda 1-2 réplicas selectivas. |
| **"Dame la síntesis ya"** | Salta al cierre con tradeoffs explícitos. |

Esto le da al usuario **agencia real**, que es lo que diferencia COUNCILia de un chat normal donde tú solo escribes y esperas.

### Fase 3 — Deliberación (aquí SÍ secuencial y selectiva)

Si el usuario eligió "que deliberen":

1. El **Tension Detector** identifica la contradicción más interesante. Ejemplo: SOFÍA dijo "hay 3 versiones de ti", pero RAFAEL dice "estás justificando".
2. El orquestador decide: **"RAFAEL responde a SOFÍA"**.
3. RAFAEL escribe **con contexto de SOFÍA**:

> *"No estoy de acuerdo con ofrecerle 3 puertas de salida. Eso evita la pregunta real: ¿esto es un patrón o un evento aislado? Sin esa respuesta, las 3 versiones son fantasía."*

4. Opcional: SOFÍA contrareplica una vez, o el orquestador cierra la ronda.

> **Regla de oro del MVP:** máximo **2 réplicas selectivas**, no más. *"Menos interacción entre agentes es más."* Una contradicción útil vale más que 20 mensajes teatrales.

---

## 7. Sistema de interrupción del usuario

Esto es **crítico** para que la experiencia se sienta íntima. El usuario debería poder interrumpir **mientras los agentes están escribiendo**.

### 7.1 Tres formas de interrumpir

1. **Botón flotante "Pausar council"** mientras hay streaming. Detiene todas las llamadas pendientes.
2. **Caja de texto siempre activa** abajo. Si el usuario empieza a escribir, automáticamente pausa el streaming y espera.
3. **Click sobre un agente específico** para dirigirle directamente la pregunta.

### 7.2 Qué pasa cuando el usuario interrumpe

Cuando manda su mensaje, el **orquestador re-evalúa todo**: lee lo nuevo + lo dicho hasta ahora, y decide quién debería responder a esa interrupción.

#### Ejemplo de interrupción

En medio de la respuesta de RAFAEL, el usuario escribe:

> *"Espera, no es que me engañó, es que me dejó de hablar 3 días sin razón."*

El orquestador:

1. **Pausa** todo el streaming en curso.
2. **Lee** la nueva información.
3. **Re-decide** quién toma el siguiente turno.
4. **Reasigna**: *"Esto cambia el problema. ELENA, tú tomas el siguiente turno porque ahora hablamos de patrones de evitación."*

Esto es lo que diferencia COUNCILia de un chatbot: **el usuario está moderando una mesa, no esperando una respuesta**.

---

## 8. Síntesis final con tradeoffs explícitos

Cuando el usuario lo pide (no automático), el **Synthesis Generator** cierra la conversación. **No le da una respuesta. Le nombra el tradeoff.**

#### Ejemplo de síntesis

> *"Hay 3 caminos visibles: confrontar y exigir explicación, observar 1 semana más sin contactar, o dar por cerrado el ciclo. Las **tensiones sin resolver** son: el costo de quedarte sin saber vs. el costo de irte sin haberlo intentado. Esto **no se resuelve con lógica**. Se decide con lo que tú estás dispuesta a aceptar de aquí en adelante."*

### 8.1 Lo que la síntesis NO debe hacer

- **No** dar una recomendación final ("yo en tu lugar haría X").
- **No** balancear artificialmente las posturas para que parezca "neutral".
- **No** resolver la tensión: nombrarla, dejarla visible.

### 8.2 Lo que la síntesis SÍ debe hacer

- Listar los **caminos visibles** identificados durante la deliberación.
- Hacer explícitos los **tradeoffs reales** entre esos caminos.
- Devolver **el poder de decisión al usuario**.

---

## 9. Resumen visual del flujo completo

```
┌─────────────────────────────────────────────────┐
│ 0. ENCUESTA DE ENTRADA (4-6 preguntas)          │
│    → genera userContext                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 1. PRESENTACIÓN DEL COUNCIL                      │
│    "Reuniendo tu council personalizado…"         │
│    Avatares + 1 línea de presentación cada uno   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. USUARIO ESCRIBE SU SITUACIÓN                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. ORQUESTADOR (invisible, ~1s)                  │
│    - Clasifica intención                         │
│    - Elige council activo (3-4 agentes)          │
│    - Decide orden visual                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. POSTURAS INICIALES (en PARALELO)              │
│                                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐              │
│  │ RAFAEL │  │ SOFÍA  │  │ ELENA  │              │
│  │ stream │  │ stream │  │ stream │              │
│  └────────┘  └────────┘  └────────┘              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. PUNTO DE DECISIÓN DEL USUARIO                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ Quiero       │ │ Que deliberen│ │ Dame la  │  │
│  │ responder    │ │ entre ellos  │ │ síntesis │  │
│  └──────────────┘ └──────────────┘ └──────────┘  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. DELIBERACIÓN SELECTIVA (1-2 réplicas máx.)    │
│    Tension Detector → "X responde a Y"           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 7. SÍNTESIS CON TRADEOFFS EXPLÍCITOS             │
│    No decide. Nombra la tensión.                 │
└─────────────────────────────────────────────────┘

⚠️ INTERRUPCIÓN POSIBLE EN CUALQUIER FASE 4-6
```

---

## 10. Tabla de ejemplos por contexto del usuario

Cómo se vería **el mismo arquetipo** ajustando su piel según el `userContext`:

### El Crítico (mismo arquetipo, distintas pieles)

| `userContext` | Nombre | Cómo habla | Ejemplo de intervención |
|---|---|---|---|
| 16 años, carrera, miedo a equivocarse | **Lucas** (hermano mayor honesto) | Cálido pero directo, sin jerga | *"¿Estás eligiendo esa carrera porque te gusta o porque tus papás se quedan tranquilos?"* |
| 22 años, primer trabajo | **Pablo** (jefe exigente) | Profesional, sin paternalismo | *"Tu CV dice que eres organizado. ¿Tienes algún ejemplo concreto que no sea genérico?"* |
| 35 años, founder SaaS | **Rafael** (inversionista escéptico) | Lenguaje de negocio, brutal | *"Tu retención a 30 días es 18%. Eso no es un problema de marketing, es un problema de producto."* |
| 40 años, relación de pareja | **Mariana** (amiga sin filtro) | Cálido, frontal, con humor | *"Llevas 6 mensajes contándome la versión amable. ¿Cuál es la fea?"* |
| 50 años, decisión de inversión | **Don Esteban** (asesor veterano) | Sereno, experiencia | *"Yo he visto este patrón antes. ¿Qué te dijo tu instinto el primer día?"* |

### La Analista (mismo arquetipo, distintas pieles)

| `userContext` | Nombre | Cómo habla | Ejemplo de intervención |
|---|---|---|---|
| 16 años, carrera | **Sofía**, orientadora vocacional | Pregunta más que afirma | *"Si en 5 años no estás trabajando de eso, ¿qué habrás aprendido igual?"* |
| 35 años, founder | **Elena**, analista financiera | Datos, riesgo, runway | *"Con 8 meses de runway y crecimiento de 4%, no estás en posición de contratar. Estás en posición de cortar."* |
| 40 años, decisión de pareja | **Carolina**, terapeuta de costo emocional | Cálida pero numérica | *"¿Cuánto tiempo, energía y oportunidades has dedicado a esta relación en 1 año?"* |

---

## 11. Principios de diseño irrenunciables

Estos principios **no se negocian**. Si se rompe alguno, COUNCILia deja de ser COUNCILia y se convierte en "4 chatbots en paralelo":

1. **El desacuerdo emerge de funciones objetivo incompatibles**, no de prompts de personalidad.
2. **La síntesis nombra tensiones, no las neutraliza.**
3. **Menos interacción entre agentes es más.** Una contradicción útil vale más que 20 mensajes teatrales.
4. **El orquestador decide quién responde a quién.** No todos los agentes responden a todo.
5. **El usuario decide al final.** El council **no decide por él**.
6. **Los arquetipos son fijos, las pieles son dinámicas.** Branding interno + intimidad externa.
7. **La encuesta tiene consecuencias reales.** Si el usuario contesta y nada cambia, perdimos la promesa.
8. **El usuario puede interrumpir en cualquier momento.** No es una cinta transportadora.
9. **El streaming es desde el inicio.** La percepción de velocidad es parte del producto.
10. **No hablamos de "saber más". Hablamos de "pensar mejor".**

---

> **El verdadero benchmark de COUNCILia no es si supera a un solo prompt bien hecho. Es si se siente cognitivamente diferente.**
