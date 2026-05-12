# COUNCILia · Principios Irrenunciables

> Los diez principios que sostienen el producto. Si se rompe alguno, COUNCILia deja de ser COUNCILia y se convierte en *"3 chatbots en paralelo"*. Documento 9 de 9 de la serie del MVP v1.1.

---

## 1. Para qué sirve este documento

A lo largo de los próximos meses van a aparecer decisiones difíciles: presión por dar recomendaciones finales, tentación de añadir un cuarto agente para "completar simetría", peticiones de hacer la síntesis más "amable", urgencia por meter features sin métrica.

Cuando esas decisiones aparezcan, este documento es la prueba ácida. **Cualquier decisión que rompa uno de estos principios necesita una conversación explícita y registrada antes de aplicarse.** No se cambian por inercia, no se cambian "solo esta vez", y nunca se rompen en silencio.

---

## 2. Los diez principios

### 1. El desacuerdo emerge de funciones objetivo incompatibles, no de prompts de personalidad

El diferenciador defendible del producto está en la arquitectura, no en la redacción. Cualquier sistema que solo cambie el tono de los agentes converge al consenso. El motor es la incompatibilidad estructural.

### 2. La síntesis nombra tensiones, no las neutraliza

La síntesis del council nunca da una recomendación final, nunca balancea artificialmente las posturas y nunca inventa un cuarto camino intermedio para complacer. Nombra el tradeoff y se lo devuelve al usuario.

### 3. Menos interacción entre agentes es más

Una contradicción útil vale más que veinte mensajes teatrales. El MVP usa una sola réplica por turno. Más rondas no profundizan la deliberación: la diluyen.

### 4. El orquestador decide quién responde a quién

No todos los agentes responden a todo. El orquestador elige las intervenciones para maximizar tensión informativa, no para repartir "tiempo en cámara" entre los agentes.

### 5. El usuario decide al final

El council nunca decide por el usuario. Cualquier feature que reduzca esa autonomía — botones tipo *"el council recomienda…"*, scores de recomendación, ranking de caminos — está prohibida.

### 6. La encuesta tiene consecuencias reales

Si el usuario contesta y nada cambia en cómo se comportan los agentes, perdimos la promesa. Cada respuesta tiene que producir un efecto observable en la conversación.

### 7. El streaming es desde el inicio

La percepción de velocidad es parte del producto. Los 3 agentes muestran tokens en cuanto los emiten, sin esperar a tener la postura completa. No hay "spinner mientras pensamos".

### 8. No hablamos de "saber más". Hablamos de "pensar mejor"

El marketing, los copys de producto y las métricas se alinean con esta promesa. No competimos en "respuestas correctas". Competimos en "experiencia cognitivamente diferente".

### 9. Crisis emocional gana siempre

Cuando se detecta una situación de crisis emocional aguda, ideación suicida o autolesión, el producto **se calla** y entrega recursos profesionales verificados. No se delibera sobre la crisis. La salud del usuario está por encima del flujo del producto.

### 10. Cada feature post-MVP necesita una métrica que valide su existencia

No se añade nada al roadmap por gusto, por simetría, ni por "completar la visión". Si un feature no mueve ningún KPI medible, no entra. Los catálogos largos de features sin métrica son el camino más rápido a un producto sin alma.

---

## 3. Cómo se aplica este documento

En tres situaciones concretas, dos de las cuales son las más comunes en la práctica:

### 3.1 Antes de aprobar una feature nueva

Pregunta: *"¿Esta feature respeta los 10 principios, o necesitamos modificar alguno?"* Si la respuesta es la segunda, pasa por revisión explícita. No se aprueba antes.

### 3.2 Cuando un usuario pide algo que rompe un principio

Ejemplo: *"¿Pueden hacer que el council al final me dé la recomendación?"*. La respuesta no es "déjame ver", es: *"Eso rompe el principio 5. No lo vamos a hacer. Y aquí está por qué te conviene que no lo hagamos."*

### 3.3 Cuando hay presión interna por crecimiento

Si en algún momento aparece la tentación de *"abrir un poco"* alguno de estos principios para ganar un caso de uso, esa conversación se tiene **fuera de un sprint** y con tiempo suficiente para no decidir en caliente. Cambiar un principio es cambiar el producto.

---

> **El verdadero benchmark de COUNCILia no es si supera a un solo prompt bien hecho. Es si se siente cognitivamente diferente.**
