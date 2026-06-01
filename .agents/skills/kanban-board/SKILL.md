---
name: kanban-board
description: Manage the kanban board. List, read, plan (with vertical slicing), and close GitHub issues for 3urega/writer.
---

# Kanban Board

Repository: `3urega/writer`

All `gh` commands require `--repo 3urega/writer`.

## Commands

List open issues:
```bash
gh issue list --repo 3urega/writer
```

View a specific issue:
```bash
gh issue view <number> --repo 3urega/writer
```

Close an issue:
```bash
gh issue close <number> --repo 3urega/writer
```

## Behavior

### Without arguments

List all open issues and show a summary to the user.

### With an issue ID as argument (e.g. `/kanban-board 42`)

1. **Read** the issue using `gh issue view <id>`.
2. **Analyze** the description, acceptance criteria, and labels.
3. **Present an implementation plan** to the user (see **Vertical slicing** below) with:
   - Summary of what the issue asks for.
   - Slices (VS1, VS2, …) with user-visible value per slice.
   - Main files / layers touched per slice.
   - Potential risks or open questions.
   - Manual verification checklist before closing.

### After completing work on an issue

Close the issue only when **all slices** are done and verified. Close with a comment summarizing what was done:
```bash
gh issue close <number> --repo 3urega/writer --comment "Done: <brief summary>"
```

---

## Vertical slicing (regla general)

Al planificar e implementar issues, **partir el trabajo en slices verticales** (historias finas, entregables de punta a punta). No planificar por capas horizontales (“primero toda la API, luego toda la UI”).

### Qué es un slice vertical

Cada slice (VS1, VS2, …) debe:

1. **Aportar valor visible** al usuario o escritor (aunque sea parcial).
2. **Cruzar capas** cuando haga falta: UI + aplicación/dominio + persistencia/API mínima para ese valor — no una capa entera aislada.
3. **Integrarse y demostrarse** por sí solo (mergeable / probabile en `/write` o la ruta que toque).
4. **Ser lo más pequeño posible** que cumpla un criterio de aceptación claro.

### Cómo escribir el plan

Incluir una tabla o lista con columnas equivalentes a:

| Slice | Valor para el usuario | Capas / archivos principales |
|-------|----------------------|------------------------------|
| VS1 | … | … |
| VS2 | … | … |

Reglas adicionales:

- Ordenar slices de **menor a mayor** dependencia; el primero suele ser el “tracer bullet” (flujo mínimo demostrable).
- Marcar explícitamente **fuera de alcance** del issue para no inflar slices.
- Si el issue es trivial (un bug de una línea), **un solo slice** basta; no forzar VS1–VS4.
- Al implementar, completar y verificar **un slice antes de pasar al siguiente**, salvo que el usuario pida paralelizar.
- Respetar `AGENTS.md` y `docs/` al tocar infraestructura, API o casos de uso.

### Ejemplo (referencia)

Issue “Mejorar con IA” partido en:

- **VS1:** panel mínimo + selección obligatoria (solo UI).
- **VS2:** reescritura E2E (UI + endpoint + splice en editor).
- **VS3:** versión automática tras IA (dominio + sync).
- **VS4:** limpiar entry points y código muerto.

Cada VS se puede probar en producto antes del siguiente.
