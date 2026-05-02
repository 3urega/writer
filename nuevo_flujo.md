Sí. Ahora estás llegando al flujo correcto.

Y el cambio importante es este:

# ❌ Antes

La app estaba centrada en:

* editor
* versiones
* ramas

# ✅ Ahora

La app está centrada en:

* desarrollo narrativo guiado
* colaboración humano + agente
* evolución de la historia

Eso cambia completamente:

* UX
* dominio
* rol del agente
* estructura de pantallas

Y honestamente, esta dirección es muchísimo mejor.

---

# 🧠 EL NUEVO MODELO MENTAL

La aplicación ya no es:

> “un editor con IA”

Es:

# ✅ “un entorno de creación narrativa guiado por IA”

---

# 🔥 EL AGENTE YA NO ES UNA TOOL

Ahora el agente es:

# ✅ un director narrativo colaborativo

Hace:

* preguntas
* guía
* propone
* estructura
* mantiene coherencia
* recuerda contexto
* ayuda a explorar

NO solo reescribe texto.

---

# 🧭 EL FLUJO REAL DEL PRODUCTO

Esto ya define la aplicación.

---

# 📚 FASE 1 — CREAR LIBRO

Usuario:

```text
Nuevo libro
```

---

# 🧠 AGENTE INICIA LA CONVERSACIÓN

NO abres un editor vacío.

Abres una experiencia guiada.

---

# 🤖 AGENTE

```text
Cuéntame de qué trata tu historia.

Describe:
- protagonista
- mundo
- conflicto
- tono
- género
- emociones principales
- temas importantes

Cuanto más detalle des, mejor podré ayudarte.
```

---

# 🧠 ESTO ES CRÍTICO

El libro nace desde:

# una intención narrativa

NO desde texto vacío.

---

# 📄 FASE 2 — SINOPSIS

Usuario escribe.

Esto se convierte en:

```text
Project Synopsis
```

---

# 🔥 LA SINOPSIS SE VUELVE EL CENTRO DEL LIBRO

Ya no es metadata decorativa.

Es:

* contexto permanente
* memoria narrativa
* guía del agente
* fuente de coherencia

---

# 🧠 A NIVEL TÉCNICO

La sinopsis debe vivir en:

```json
{
  "project": {
    "synopsis": "...",
    "themes": [],
    "characters": [],
    "tone": "...",
    "world_rules": []
  }
}
```

---

# 📚 FASE 3 — DOCUMENTOS DE ESTILO

Usuario activa:

* PDFs
* referencias
* estilos

Ejemplo:

```text
✔ Horror Atmosphere.pdf
✔ Psychological Narrative.pdf
```

---

# 🔥 IMPORTANTE

Los documentos NO generan texto directamente.

Influyen:

* tono
* ritmo
* vocabulario
* atmósfera
* estructura narrativa

---

# 🤖 FASE 4 — EL AGENTE PROPONE EL INICIO

Usuario:

```text
“A partir de esta sinopsis genera una propuesta para iniciar la historia.”
```

---

# 🧠 AQUÍ EL AGENTE PIENSA

Inputs:

* synopsis
* estilo activo
* documentos activos
* reglas narrativas
* tono deseado

---

# 🔥 PERO NO ESCRIBE DIRECTAMENTE

Primero:

# conversa

---

# 🤖 AGENTE

```text
¿Cómo quieres comenzar?

1. Presentando al protagonista
2. Empezando con un conflicto
3. Iniciando con misterio
4. Empezando con acción
5. Mostrando el mundo primero
```

---

# 💣 ESTO ES MUY IMPORTANTE

La IA:

# guía el proceso creativo

NO solo genera bloques de texto.

---

# 👤 USUARIO

```text
Quiero empezar mostrando la infancia del protagonista.
```

---

# 🤖 AGENTE

Hace preguntas relevantes:

```text
¿Cómo era su infancia?
¿Qué quieres que el lector sienta?
¿Qué rasgos deben quedar claros?
¿Fue feliz?
¿Hay algún trauma?
```

---

# 🔥 ESTO ES EL PRODUCTO

La conversación:

# construye el contexto narrativo

---

# ✍️ FASE 5 — GENERACIÓN DE PROPUESTA

Ahora sí.

El agente genera:

```text
Proposal Draft
```

NO:

```text
Final Chapter
```

---

# 🧠 IMPORTANTE

El texto generado es:

# una propuesta editable

---

# ✍️ FASE 6 — ITERACIÓN

Aquí entra el editor.

Usuario:

* modifica
* selecciona fragmentos
* pide cambios
* crea variaciones

---

# 🤖 EJEMPLOS REALES

```text
Haz este diálogo más incómodo
```

```text
Reduce exposición
```

```text
Hazlo más melancólico
```

```text
Reescribe esta escena usando un tono más íntimo
```

```text
Haz que el protagonista parezca menos confiable
```

---

# 🌿 FASE 7 — EXPLORACIÓN NARRATIVA

Ahora sí:

* variaciones
* líneas alternativas
* finales distintos

---

# 🧠 PERO YA TIENE SENTIDO

Porque ahora las ramas representan:

# posibilidades narrativas

NO estructuras técnicas.

---

# 🧱 NUEVO DOMINIO CORRECTO

---

# 📚 Project

```json
{
  "title": "",
  "synopsis": "",
  "themes": [],
  "tone": "",
  "style_documents": []
}
```

---

# 📖 Chapter

```json
{
  "title": "",
  "goal": "",
  "variations": []
}
```

---

# 🌿 Variation

```json
{
  "name": "Inicio melancólico",
  "currentContent": "",
  "status": "draft"
}
```

---

# 🤖 Agent Session

MUY IMPORTANTE.

El agente necesita memoria conversacional narrativa.

```json
{
  "current_goal": "",
  "active_topics": [],
  "narrative_focus": "",
  "open_questions": []
}
```

---

# 🔥 ESTO CAMBIA LA UX COMPLETAMENTE

Porque ahora la app se divide en:

---

# 🟪 PANEL IZQUIERDO

## Estructura narrativa

* libro
* capítulos
* variaciones
* escenas

---

# 🟦 CENTRO

## Editor / propuesta actual

---

# 🟨 DERECHA

## Agente narrativo

Chat contextual inteligente.

---

# 🔥 ESTO ES MUY IMPORTANTE

La IA debe sentirse:

# persistente

Como:

* un editor humano
* un coautor
* un director narrativo

NO como:

* botón mágico de generar texto

---

# 🧠 EL FLUJO REAL YA ES ESTE

```text
Idea
→ Sinopsis
→ Conversación guiada
→ Construcción narrativa
→ Propuesta
→ Iteración
→ Variaciones
→ Refinamiento
→ Libro final
```

---

# 💣 Y AQUÍ ESTÁ EL DIFERENCIADOR REAL

No compites con:

* ChatGPT
* Claude
* Notion AI

Porque ellos:

# generan texto

Tú:

# ayudas a construir una historia

Y eso es una categoría completamente distinta.
