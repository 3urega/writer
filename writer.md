# Escritura en ai-writer (`/write`)

Este documento describe **qué está implementado hoy** en el flujo de escritura, el **modelo de versionado**, **la interfaz efectiva en `/write`**, y **cómo se persiste** el estado en cliente y servidor. Sirve de base para decidir mejoras de UX (confirmaciones, borradores, indicadores “sin guardar”, etc.).

---

## Dónde está el código principal

| Pieza | Ubicación |
|--------|-----------|
| Página | [`app/write/page.tsx`](app/write/page.tsx) → [`WriteEditorClient`](app/write/WriteEditorClient.tsx) (solo carga cliente) |
| Editor y versiones (UI) | [`app/_components/ChapterEditor.tsx`](app/_components/ChapterEditor.tsx) |
| Estado local + `localStorage` | [`lib/storage/projectStore.ts`](lib/storage/projectStore.ts) |
| Dominio (`Project`, ramas, snapshots) | [`lib/domain/types.ts`](lib/domain/types.ts), [`lib/domain/versioning.ts`](lib/domain/versioning.ts) |
| API proyecto (GET/PUT grafo) | [`app/api/project/[id]/route.ts`](app/api/project/[id]/route.ts), [`lib/storage/serverProjectClient.ts`](lib/storage/serverProjectClient.ts) |
| Persistencia Postgres del proyecto | [`lib/storage/postgresProjectStore.ts`](lib/storage/postgresProjectStore.ts) |
| Agent: snapshot programático | tool `create_version` → [`lib/agent/application/createAgentVersion.ts`](lib/agent/application/createAgentVersion.ts) |

---

## Conceptos de dominio

### Proyecto (`Project`)

Libro o trabajo: `id`, `name`, `chapters[]`. En la práctica del editor actual suele usarse **un capítulo activo** como foco de escritura.

### Capítulo (`Chapter`)

Cada capítulo tiene:

- `versions[]`: todos los **snapshots** del texto (historial inmutable).
- `branches[]`: **variantes** (líneas paralelas de trabajo).
- `mainVersionId` (opcional): puntero a la **versión oficial** del capítulo (“lo canónico”), distinto de tener muchas versiones guardadas.

Las **Version** son siempre inmutables: no se edita el contenido de una fila guardada; solo se añaden nuevas.

### Versión / snapshot (`Version`)

Una fila de historial:

- `id`, `content` (texto completo del capítulo en ese instante).
- `parentVersionId`: vínculo al snapshot anterior (grafo).
- `branchId`: a qué variante pertenece.
- `createdBy`: `user` | `agent`.
- `createdAt`, `metadata` opcional.

En la UI derecha, la lista titulada **“Snapshots”** recorre estas `Version` del capítulo activo (mezclando ramas en la misma lista; se indica cuál es oficial con ◆ y texto “Versión oficial”).

### Variante / rama (`Branch`)

No es Git técnico; es una **línea narrativa o de intención** (p. ej. “más tensión”) con `name`, `slug`, etc. La rama con slug `main` suele ser **“Línea principal”**.

- **Crear variante** (botón en la columna izquierda) hace un **fork**: nueva rama + un snapshot inicial enlazado desde la versión activa (lógica [`createIntentVariation`](lib/domain/versioning.ts)).

---

## Qué significan “Variantes” y “Snapshots” en pantalla

| En la UI | En el modelo |
|----------|----------------|
| **Variantes** | `Branch` del capítulo activo. Lista a la izquierda. |
| **Snapshots** | `Version`. Lista a la derecha. Cada item es un estado completo del texto **ya guardado** en el proyecto. |
| **Versión oficial** | `Chapter.mainVersionId` apunta a un `Version.id`. El usuario puede cambiar quién es oficial (acción en la lista, con confirmación). |

Texto de ayuda en la propia pantalla: la versión oficial no se reescribe “in place”; cada guardado añade nodos; el puntero oficial solo cambia con confirmación explícita.

---

## El detalle crítico: editor vs grafo guardado

El estado de React `ProjectState` (en [`projectStore.ts`](lib/storage/projectStore.ts)) une:

1. **`project`**: el JSON del dominio (capítulos, ramas, **todas las `Version` guardadas**).
2. **`editorContent`**: el texto que ves en el **textarea ahora mismo**.

Comentario explícito en código: *“Contenido del editor; puede diferir del snapshot hasta guardar.”*

- **Escribir** actualiza `editorContent`.
- Eso **no** actualiza automáticamente el contenido de la `Version` activa dentro de `project` hasta que el usuario (o el código que replique el mismo flujo) **crea un nuevo snapshot**.

### Cómo queda un snapshot nuevo en el grafo

Botón **«Nuevo snapshot»** (`onSaveVersion`):

- Toma `editorContent` y el `activeVersionId` actual.
- Crea una **nueva** `Version` con `parentVersionId` = la versión desde la que guardas, `branchId` coherentes con rama activa / versión base.
- Actualiza el proyecto en memoria y mueve `activeVersionId` al nuevo id.
- **Sincronización** (ver abajo) puede entonces enviar el `project` ampliado al servidor.

Sin pulsar **«Nuevo snapshot»**, el historial de versiones en `project` **no** refleja tus últimas pulsaciones de teclado.

### Qué pasa al cambiar de snapshot o de variante

- **Al elegir otro snapshot** (`onSelectVersion`): se reemplaza `editorContent` por `v.content` de esa versión y se actualizan `activeVersionId` / rama. Si había texto distinto solo en el editor y no guardado como snapshot, **ese borrador se pierde** (no hay hoy diálogo de confirmación).
- **Al cambiar de variante** (`onSelectBranch`): se intenta mostrar la última versión de esa rama; el editor pasa a otra línea temporal del mismo capítulo — mismas consecuencias para borrador no snapshot.

---

## Persistencia local (`localStorage`)

Clave típica: `ai-writer:project` (definido en [`projectStore.ts`](lib/storage/projectStore.ts)).

Al guardar, se serializa un **`ProjectFile`**: proyecto + punteros (`activeChapterId`, `activeVersionId`, ramas comparación en modo diff, etc.).

**Importante:** el objeto persistido **no incluye explícitamente `editorContent`**. Después de `load()`, `createStateFromFile` vuelve a poner `editorContent` igual al contenido del snapshot **`activeVersionId`**.

Por tanto:

- Sin **«Nuevo snapshot»**, un borrador prolongado puede perderse también al **recargar la página**.
- Quien espera autosave tipo Google Docs debe entender que hoy **el “salvado estable” como versión nueva es explícito** (`Nuevo snapshot`).

---

## Servidor remoto

- Tras cargar con `DATABASE_URL`/API, existe un **`remoteProjectId`** y flujos **`fetchProjectFromServer`** / **`putProjectToServer`** (`createProjectOnServer` si no hay id).
- Un **debounce** (~1,5 s) envía **`state.project`** cuando cambia (`useEffect` en `ChapterEditor`): lo que cuenta es el **grafo del proyecto**, no el solo `editorContent` aisladamente.
- Consecuencia: escribir mucho tiempo sin hacer snapshot puede **subir al servidor una versión de `project` que aún no contiene ese texto dentro de ninguna `Version`** (solo cambian otros campos si los hubiera; el contenido nuevo sigue solo en pantalla hasta snapshot).

Hay botón **«Sincronizar»** para forzar `PUT`.

---

## Otras vistas del editor

Modos **`edit`** | **`diff`** | **`ai`** (Ideas + fusión):

- Comparación de dos versiones (selectores A/B) y vistas de fusión según código en el mismo archivo.
- Siguen usando el mismo `project` / versiones; no cambian la regla de **editor ↔ snapshot**.

---

## UX actual de `/write` (implementada)

Descripción orientada al usuario sobre **lo que muestra la interfaz** y **qué permite hacer** tal como está montado en [`ChapterEditor`](app/_components/ChapterEditor.tsx). No incluye comportamientos que solo estén en conversación pero aún sin código (p. ej. un diálogo “¿guardar antes de cambiar de snapshot?” no existe hoy).

### Cabecera y estado general

- Título del **nombre del proyecto** (`state.project.name`) y texto secundario: estado de **conexión** (truncado del `remoteProjectId` si existe, “Sin conexión” si no) y sufijo **“· Guardando…”** mientras un `PUT` al servidor está en curso (`syncing`).
- Errores de carga servidor y de sincronización en **alertas visuales** (ámbar y rojo) encima del layout; texto indica si puedes seguir con borrador local frente al fallo.
- Botones globales en la derecha del encabezado:
  - **«Nuevo snapshot»**: solo aparece cuando el modo vista es **Escribir** (`edit`); ejecuta persistencia del contenido actual del textarea como nueva `Version`.
  - **«Sincronizar»**: fuerza guardar el **`project`** en el servidor (`PUT`); se desactiva si no hay proyecto remoto asociado o si ya hay sync en marcha.
  - **«Reiniciar»**: ciclo pesado para desvincular local, crear proyecto nuevo en servidor y cargar estado limpio (`onResetLocal`); deshabilitado mientras está cargando.
- Debajo del encabezado, párrafo de ayuda fijo sobre **snapshot en la variante activa** y **puntero oficial** solo tras confirmación (refuerza modelo mental esperado por el equipo de producto).

### Disposición (layout)

- Pantallas grandes: **rejilla en tres zonas**: columna Variantes (~12rem), columna central (editor o comparación), columnas laterales combinadas (~15rem incl. snapshots/fragmentos). En vista móvil el orden puede reordenarse; hay **barra fija inferior** para los tres modos cuando no está el interruptor grande en escritorio.

### Columna izquierda — Variantes

- Lista clickeable por **nombre de rama**; la activa se resalta con fondo; ramas no `active` muestran su `status`.
- Pie: campo de texto (“Intención…”) + **«Crear variante desde la versión activa»** (`window.prompt` adicional puede pedir confirmación nombre según flujo ya en código).
- Comportamiento: al seleccionar otra variante **no** aparece ninguna confirmación de borrador; el editor muestra contenido derivado del grafo como se describió antes.

### Zona central — modos `Escribir` | `Comparar` | `Ideas + fusión`

- **Escribir** (`edit`): textarea con fuente monoespacio, altura mínima grande, placeholders en español. Opciones **«Vista por bloques»** / **«Bloques»** (misma casilla responsive): divide por dobles saltos línea cuando hay contenido suficiente; mensaje de ayuda si no hay ningún bloque detectable pero hay texto.
- **Comparar** (`diff`): selects **A** (referencia) y **B** (variante) entre snapshots del capítulo — **comparte el mismo estado** `compareVersionA` / `compareVersionB` con **Ideas + fusión**, así que al cambiar la pareja en un modo puede verse reflejada en el otro; vista visual de diferencias cuando ambos están elegidos (`VersionDiffView`).
- **Ideas + fusión** (`ai`): panel violeta centrado en **comparación intención + merge** sobre la misma pareja A/B.
  - Ayuda incorporada en UI: dice que ese par alimenta pistas y fusión y que **siempre se añade un snapshot nuevo**, sin pisar snapshots anteriores.
  - **“Ideas” (pistas)**: con A y B resueltas, se calculan notas mediante [`narrativePairHints`](lib/narrative/diffIntelligence.ts) y se muestran como lista; si falta selección válida aparece texto de estado avisando que hace falta par de versiones.
  - **Fusión**: tres botones que ejecutan [`createMergedVersion`](lib/domain/versioning.ts) (`keepA`, `keepB`, `smart`) y luego `saveNewVersionInChapter`: nueva `Version`, activación de esa copia como edición actual y cambio automático de vista a **Escribir** con el contenido resultado.
    - Etiquetas en pantalla: **«Llevar A al siguiente snapshot»**, **«Llevar B al siguiente snapshot»**, **«Fusión compuesta (nuevo snapshot)»** (fusión `smart` en dominio: por defecto **concatena** A y B con un separador si no se pasa texto compuesto; desde este componente **no hay llamada a modelo de IA**).
- En móvil, **barra inferior fija** con los tres mismos modos (etiqueta «Ideas» abreviada frente a «Ideas + fusión» en escritorio).

### Columna derecha — Snapshots e instrumentos

- Título **“Snapshots”**, lista vertical con scroll. Cada fila muestra etiqueta **`#orden · createdBy · fecha UTC`**; la que coincide con **`mainVersionId`** lleva prefijo **`◆`**. Quien sea la versión **activamente seleccionada** para editar muestra sufijo **“(editando)”** si **no** es la oficial — refleja discrepancia habitual “Estoy pisando contenido pero no vivo en la oficial” en la UI textual.
- Bajo cada item: tamaño **`N caracteres`**. Si ese snapshot es el oficial aparece marca verde **“Versión oficial”**; si no, botón **`Hacer oficial esta versión`** con `confirm` del navegador antes (`onSetOfficial`).
- Con modo **edit**: panel **«Fragmento seleccionado»** mostrando rango Unicode/índices y texto cuando hay selección en el textarea útil para agentes o futuras herramientas (“Nada seleccionado” si no hay selección válida).

### Biblioteca de conocimiento (RAG)

- Componente **`KnowledgeLibrary`** con `remoteProjectId` al pie de la página: gestión/documentos ligados al mismo proyecto servidor para ingestión/consulta (detalle fuera del grafo versiones pero parte de la página `write`).

### Qué UX **no** ofrece aún (breve)

- **Indicador explícito** de “hay cambios sin snapshot” versus el snapshot base.
- **Bloqueo o diálogo** al cambiar de snapshot o variante con texto sin guardar.
- Persistencia visible del textarea en **autosave granular** antes de crear `Version`; el único salvado estable de historial nuevo sigue siendo explícito.

---

## Agente y versiones

El agente puede persistir mediante la tool **`create_version`** (`createAgentVersion` + `saveProjectToPostgres`):

- Inserta una **nueva** `Version` con contenido nuevo colgando de una base; **no** actualiza solo `editorContent`.
- No marca automáticamente la nueva como **oficial** (`mainVersionId` sigue igual salvo UX futura).

Detalle en [docs/ai/writing-agent-phase3.md](docs/ai/writing-agent-phase3.md).

---

## Resumen de límites actuales (útiles para planificar UX)

1. **`editorContent` ≠ último snapshot** hasta **«Nuevo snapshot»**.
2. **Cambiar de lista (snapshot / variante) sin guardar** descarta diferencias solo en pantalla respecto al último archivo de versión cargado en memoria como `project`.
3. **`localStorage` no conserva borrador** más allá de rehidratarse desde snapshot activo.
4. **Sync remoto** reacciona a cambios del **grafo `project`**, no al mero texto del textarea.

Cuando definamos la siguiente UX (confirmación al abandonar borrador “sucio”, indicador visible, autosnapshot, etc.), este documento es el contrato de comportamiento contra el cual contrastar cada cambio.
