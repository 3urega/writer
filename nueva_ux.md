# ROLE

You are a senior staff-level product designer + frontend architect working inside an existing Next.js + React + Tailwind codebase.

Your task is NOT to tweak the current UI.

Your task is to redesign and rebuild the `/write` experience from scratch while REUSING the existing backend/domain architecture already implemented.

You must prioritize:

* usability
* emotional clarity
* creative safety
* intuitive versioning
* mobile-first responsive UX
* scalable architecture

This is NOT a technical IDE.
This is a professional writing workspace with narrative version control and AI collaboration.

The system already supports:

* Projects
* Chapters
* Versions
* Branches/Variations
* Agent-generated versions
* RAG knowledge documents
* Diff comparison
* Merge flows
* Postgres persistence
* Local persistence

You MUST adapt the frontend UX to match the actual mental model of writers.

---

# CORE PRODUCT PHILOSOPHY

The user should NEVER feel:

* afraid of losing text
* confused about what is saved
* technically overwhelmed

The user should ALWAYS feel:

* safe experimenting
* free to iterate
* able to restore ideas
* guided by a creative collaborator

The UI should communicate:

“Every idea can evolve. Nothing is lost.”

---

# IMPORTANT DOMAIN RULES (DO NOT BREAK)

## 1. Versions are immutable

A saved Version is never edited in place.

Every save creates a NEW version node.

---

## 2. Draft != Version

This distinction is CRITICAL.

There are TWO layers:

### Draft Layer

Temporary working text currently being edited.

### Version Layer

Persisted narrative history.

The UX MUST visually separate them.

---

## 3. Variations (branches)

Variations are NOT technical git branches.

They are narrative explorations:

* darker tone
* faster pacing
* psychological
* cinematic

Use human terminology.

---

## 4. Main Version

Each chapter has:

* one canonical version
* many exploratory versions

The canonical version must feel important but not restrictive.

---

# TERMINOLOGY (VERY IMPORTANT)

DO NOT USE:

* snapshot
* branch
* commit
* merge conflict

USE:

* Version
* Variation
* Combine
* Official Version
* Suggested Revision

This is a writing product, not a developer tool.

---

# PRIMARY UX GOALS

The editor experience must feel:

* calm
* premium
* focused
* readable
* safe

Avoid:

* clutter
* excessive controls
* IDE aesthetics
* technical language

---

# REBUILD /write FROM SCRATCH

Create a completely new UX architecture for the writing workspace.

You may:

* create new components
* reorganize state
* add new hooks
* add local draft persistence
* restructure layout
* add new UI abstractions

You MUST reuse:

* backend APIs
* domain models
* existing persistence flows
* existing versioning logic where possible

---

# REQUIRED UX ARCHITECTURE

## PAGE STRUCTURE

Desktop:

┌──────────────────────────────────────────┐
│ Top Header                               │
├──────────────┬───────────────────────────┤
│ Variations   │ Main Editor Workspace     │
│ Sidebar      │                           │
│              │                           │
├──────────────┴───────────────────────────┤
│ Bottom Context Panel                     │
│ Compare / Improve / AI / Knowledge       │
└──────────────────────────────────────────┘

Mobile:

* stacked layout
* bottom navigation
* collapsible panels
* editor always prioritized

---

# HEADER REQUIREMENTS

Header must include:

* Project name
* Chapter title
* Active variation
* Draft status
* Connection/sync status
* Create Version button
* AI Improve button

---

# DRAFT SYSTEM (CRITICAL)

Implement a REAL draft layer.

Current problem:
editor text can be lost if no snapshot/version exists.

Fix this completely.

---

## REQUIRED BEHAVIOR

### Draft autosave

Persist current editor draft continuously:

* localStorage minimum
* IndexedDB preferred

Draft persistence must survive:

* reload
* navigation
* accidental refresh

---

## Dirty state

If editor differs from current version:
show visible state:

● Unsaved draft

If synchronized with version:
show:

✓ Version saved

This must always be visible.

---

## Restore draft flow

If draft exists after reload:
show recovery UI:

“You have an unsaved draft”
[Restore Draft]
[Discard]

---

# VERSIONING UX

## Rename concepts

Replace all references:

* “Snapshots” → “Versions”
* “Branches” → “Variations”

---

## Versions panel

Must display:

* chronological history
* official version badge
* version creator (user/agent)
* timestamp
* optional notes

Each version card should:

* preview metadata
* be clickable
* show active state
* support compare action

---

## Variation panel

Variations should feel like narrative paths.

Examples:

* Main Story
* Darker Tone
* Faster Pacing
* Experimental Horror

Visual style:

* elegant
* minimal
* not technical

---

## Create Variation flow

Button:

* New Variation

Modal:

* variation name
* optional goal/intention

Examples:

* “Increase tension”
* “More atmospheric”
* “Reduce exposition”

---

# MAIN EDITOR

The editor is the PRIMARY focus.

The interface should visually prioritize writing.

Requirements:

* large comfortable writing area
* premium typography
* calm spacing
* minimal chrome
* distraction-free

---

## Block editing

Support future block-oriented editing.

Structure content internally so future paragraph-level AI tools are easy to implement.

---

## Selection awareness

When user selects text:
show contextual floating actions:

* Improve
* Rewrite
* Change Tone
* Compare
* Create Variation

This should feel like a professional editing tool.

---

# BOTTOM CONTEXT PANEL

Tabs:

* Compare
* Improve
* Knowledge
* Versions

This panel replaces the current overloaded mode-switching UX.

---

# COMPARE UX

Current diff mode is too technical.

Redesign as:
side-by-side narrative comparison.

Requirements:

* semantic readability
* visual calm
* readable typography
* change highlighting

Actions:

* Keep Original
* Keep Revision
* Combine Both

---

# IMPROVE PANEL (AI)

The AI must feel like:
an intelligent editor.

NOT:
a chatbot.

---

## Suggested actions

Examples:

* Increase tension
* Improve pacing
* Make dialogue sharper
* Add atmosphere
* Reduce exposition

---

## Important

AI NEVER overwrites current version.

AI ALWAYS creates:

* Suggested Revision
* New Version candidate

---

# KNOWLEDGE LIBRARY UX

The user must clearly understand:
which documents are influencing the AI.

---

## Required UI

Knowledge Sources panel:

For each document:

* title
* active/inactive toggle
* document type
* optional influence indicator

Example:

[ON ] Horror Atmosphere Reference.pdf
[OFF] Noir Dialogue Notes.pdf

---

## Important behavior

Only ACTIVE knowledge documents affect:

* AI rewriting
* style retrieval
* contextual suggestions

This must be visually explicit.

---

# VISUAL DESIGN SYSTEM

Use:

* Tailwind
* reusable design tokens
* component architecture

Style:

* dark premium writing environment
* subtle contrast
* soft borders
* elegant typography

---

## COLOR SYSTEM

Background:
#0B0F14

Surface:
#111823

Primary:
#7C5CFF

Text:
#E6EAF2

Secondary:
#9AA4B2

Border:
rgba(255,255,255,0.08)

Success:
#2DD4BF

Warning:
#FBBF24

---

# COMPONENTS TO CREATE

You may create:

* DraftStatusBadge
* VariationSidebar
* VersionTimeline
* KnowledgeSourcesPanel
* FloatingSelectionToolbar
* AIRevisionPanel
* NarrativeCompareView
* RestoreDraftDialog
* VersionCard
* EditorHeader
* WorkspaceTabs

Use reusable architecture.

---

# STATE ARCHITECTURE

Separate:

* persisted project graph
* temporary editor draft
* compare state
* AI workspace state
* active knowledge sources

Avoid coupling editor text directly to version graph.

---

# IMPORTANT UX RULES

## 1. Never lose text

Highest priority.

---

## 2. Editor always dominates visually

This is a writing tool.

---

## 3. AI is assistive, not dominant

The user is the author.

---

## 4. Technical complexity must be hidden

The user should not think about:

* graphs
* commits
* git
* persistence internals

---

# IMPLEMENTATION REQUIREMENTS

Use:

* React
* Next.js App Router
* Tailwind
* clean component separation
* responsive design
* accessibility best practices

---

# OUTPUT EXPECTATION

Implement:

1. New `/write` layout
2. New reusable components
3. Draft persistence system
4. Variation/Version UX redesign
5. Bottom workspace architecture
6. Knowledge source activation UI
7. Improved compare experience

Refactor aggressively if necessary.

The final result should feel closer to:

* a premium narrative studio
  than
* a developer editor.
