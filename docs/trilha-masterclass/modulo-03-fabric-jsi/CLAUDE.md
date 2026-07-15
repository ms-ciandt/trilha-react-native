# Module 03 — Fabric & JSI (CLAUDE.md)

## Status

COMPLETE — three published files.

## Files

- `01-jsi-javascript-interface.md` — JSI vs bridge, HostObject, HostFunction, synchronous/async calls, Hermes interop
- `02-fabric-renderer.md` — Shadow Tree, Yoga, reconciliation, concurrent rendering, threading model, Fabric components
- `03-runtime-new-architecture.md` — Hermes bytecode, Codegen pipeline, TurboModule + Fabric interaction, debugging

## Target audience

Senior engineers who have already used React Native in production and need to understand the internals — not how to write components, but how the renderer and module system work at the C++ level.

## Key conventions used

- No emojis
- Code blocks are used for all snippets (C++, Kotlin, Swift, TypeScript)
- Every section links to official source code files in the RN repo
- Expo Snack links are included for interactive exploration where possible
- Study Materials section at the end of each file with: official source, official docs, deep dives, video tutorials, interactive links

## Do not add

- Content about StyleSheet, navigation libraries, or state management — those belong in modulo-fundamentos
- Old bridge / legacy architecture content — this module focuses exclusively on New Architecture (0.76+)
