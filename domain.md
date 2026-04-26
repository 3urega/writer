Aquí tienes un **`dominio.md` listo para usar en Cursor**. Está pensado para que el agente entienda tu sistema, tome decisiones coherentes y no “invente” arquitectura.

---

# 🧠 Dominio del Proyecto — AI Writing Assistant

## 🎯 Propósito

Este proyecto es una aplicación diseñada para ayudar a escritores a mejorar sus textos mediante el uso de agentes de inteligencia artificial.

El sistema NO genera contenido desde cero como objetivo principal.

El sistema:

> **ayuda a iterar, mejorar y evolucionar texto existente respetando su intención original**

---

## 🧭 Principios Fundamentales

1. **El usuario siempre tiene el control**

   * El agente propone, nunca impone
   * Todas las modificaciones generan nuevas versiones

2. **El sistema trabaja por fragmentos**

   * No se reescriben capítulos completos por defecto
   * Las operaciones son locales pero conscientes del contexto global

3. **El texto es un sistema versionado**

   * Cada cambio crea una nueva versión
   * Nunca se sobrescribe contenido existente

4. **El agente es un editor, no un autor**

   * Mejora estilo, claridad y tono
   * No introduce cambios narrativos fuertes sin indicación explícita

---

## 🧩 Entidades Principales

### 📚 Project

Representa un libro o trabajo completo.

Contiene:

* capítulos
* documentos de referencia (PDFs)
* configuración del agente

---

### 📄 Chapter

Unidad de escritura dentro de un proyecto.

Contiene:

* múltiples versiones
* orden dentro del libro

---

### 🌿 Version

Representa un snapshot completo del capítulo.

Propiedades:

* `content`: texto completo
* `parent_version_id`: versión anterior
* `created_by`: user | agent

Reglas:

* siempre es inmutable
* nunca se modifica, solo se crean nuevas versiones

---

### ✂️ Fragment

Selección de texto dentro de una versión.

Definido por:

* `start_index`
* `end_index`

Reglas:

* siempre pertenece a una versión específica
* nunca se almacena como entidad independiente persistente

---

### 📚 Knowledge (RAG)

Sistema de conocimiento basado en documentos.

Contiene:

* PDFs procesados
* texto dividido en chunks
* embeddings

Propósito:

> permitir al agente entender estilo y contexto externo

---

### 🤖 Agent

Sistema que ejecuta tareas sobre el texto.

Se compone de:

* LLM (razonamiento)
* tools (acciones)
* estado (contexto)

Reglas:

* nunca modifica directamente el texto
* siempre usa tools para producir cambios

---

### 🧠 Agent Task

Unidad de trabajo del agente.

Ejemplos:

* rewrite_fragment
* suggest_improvements

Incluye:

* input
* output
* metadata

---

## 🔧 Tools del Sistema

Las tools representan las capacidades del agente.

### 🔹 search_knowledge

Busca información relevante en documentos (RAG)

---

### 🔹 extract_style

Convierte texto en reglas de estilo estructuradas

---

### 🔹 rewrite_fragment

Reescribe un fragmento respetando:

* contexto
* estilo
* intención original

---

### 🔹 evaluate_text

Evalúa calidad del texto generado

---

### 🔹 create_version

Crea una nueva versión del capítulo

---

### 🔹 compute_diff

Calcula diferencias entre versiones

---

### 🔹 get_context

Obtiene contexto alrededor de un fragmento

---

## 🔁 Flujo Principal

1. Usuario escribe texto
2. Usuario selecciona fragmento
3. Usuario da instrucción
4. Agente:

   * obtiene contexto
   * (opcional) consulta RAG
   * reescribe fragmento
   * evalúa resultado
   * crea nueva versión
5. Usuario decide:

   * aceptar
   * descartar

---

## 🧠 Modelo Mental del Agente

El agente actúa como:

> **editor literario asistido por IA**

Debe:

* mejorar calidad del texto
* adaptar estilo
* mantener coherencia

No debe:

* cambiar la historia sin permiso
* introducir contenido irrelevante
* romper continuidad narrativa

---

## 📚 RAG (Retrieval Augmented Generation)

El sistema usa RAG para:

* extraer estilo de documentos
* proporcionar contexto al agente

Características:

* chunking por párrafos
* embeddings semánticos
* metadata de estilo (tono, tipo, ritmo)

---

## ⚠️ Restricciones Importantes

* Nunca sobrescribir versiones existentes
* Nunca modificar más texto del seleccionado sin justificación
* Siempre mantener coherencia con el contexto
* El agente debe trabajar con inputs estructurados
* Las tools deben ser deterministas y predecibles

---

## 🧭 Decisiones de Diseño

* Versionado tipo snapshot (no patch-based)
* Fragmentos definidos por índices
* Agent loop basado en tool calling
* Separación clara entre:

  * retrieval
  * transformación
  * evaluación

---

## 💬 Filosofía del Producto

> “No ayudamos a escribir más. Ayudamos a escribir mejor mediante iteración inteligente.”

---

## 🚀 Estado Actual (Fase 0)

El sistema debe soportar:

* edición básica de texto
* selección de fragmentos
* reescritura mediante agente
* creación de versiones
* integración básica con LLM

---

## 🔮 Futuro (no implementar aún)

* diff visual avanzado
* multiusuario
* CRDT
* agentes múltiples
* optimización avanzada de RAG

---

## 🧠 Regla Final para el Agente

Siempre que tomes una decisión:

1. ¿Respeta el versionado?
2. ¿Respeta el fragmento seleccionado?
3. ¿Mantiene coherencia con el contexto?
4. ¿Está alineado con el rol de editor (no autor)?

Si alguna respuesta es “no”, la decisión es incorrecta.

---
