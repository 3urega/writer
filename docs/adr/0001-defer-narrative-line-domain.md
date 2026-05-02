# ADR 0001: aplazar modelo «línea narrativa viva» en servidor

## Contexto

El documento de producto `writer.md` propone centrar el dominio en una **variación editable** (`currentContent`) con versiones como checkpoints internos, en lugar de que la versión inmutable sea la unidad principal en la experiencia.

La guía `nueva_ux.md` y el código existente mantienen **Version** y **Branch** en Prisma y en el agregado de proyecto, con un **borrador** separado en cliente.

## Decisión

**No migrar el esquema ni la API en esta épica.** La «línea viva» se representa así:

- **Variación** en UI ↔ `Branch` en dominio.
- **Borrador** ↔ `editorContent` persistido en IndexedDB / `localStorage` por `(projectId, chapterId, branchId)`.
- **Historial** ↔ `Version[]` inmutable; «Crear versión» persiste un nodo nuevo explícito.

## Consecuencias

- La IA y el servidor siguen creando **nuevas filas Version** cuando corresponde (`create_version`, guardado manual).
- Si en el futuro el producto exige `currentContent` en base de datos, hará falta migración Prisma, sincronización con `postgresProjectStore` y estrategia de datos para proyectos existentes (p. ej. puntero al último nodo por variación).

## Estado

Aceptada; revisar tras medir fricción de la capa de borrador y del nuevo workspace `/write`.
