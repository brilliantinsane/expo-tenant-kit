# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** for architectural decisions that touch the area you're about to work in.

If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront. The producer skill (`/grill-with-docs`) creates and updates domain docs as terms and decisions get resolved.

## File structure

This repo currently uses a single-context layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

If the domain later splits into multiple durable areas with different vocabularies or decision histories, introduce `CONTEXT-MAP.md` at the root and move to a multi-context layout.

## When to consider `CONTEXT-MAP.md`

Consider splitting when the root `CONTEXT.md` starts forcing agents to ignore large sections for most tasks, or when separate areas need different glossaries, invariants, or ADR streams.

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, either reconsider the wording or note the gap for `/grill-with-docs`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
