# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

This monorepo has one domain context so far, Sketchbook. Portfolio and `ui` have no `CONTEXT.md` yet.

- **`apps/sketchbook/CONTEXT.md`** when the work touches entries, the playground or the journal pipeline.
- **`apps/sketchbook/docs/adr/`** for Sketchbook decisions, and the root **`docs/adr/`** for decisions that span apps. Read the ones that touch the area you're about to work in.
- **`CONTEXT-MAP.md`** at the repo root if it exists. It points at one `CONTEXT.md` per context.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved. A new context's `CONTEXT.md` goes beside its app (`apps/<app>/CONTEXT.md`), per the multi-context layout below.

## File structure

Single-context repo (the generic shape):

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root). Here the contexts sit under `apps/` rather than `src/`:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                          <- system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  <- context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal - either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) - but worth reopening because..._
