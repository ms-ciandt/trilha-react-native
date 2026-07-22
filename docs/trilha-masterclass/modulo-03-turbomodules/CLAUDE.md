# Masterclass — Module 02: TurboModules

## Public
Senior Android/iOS developers familiar with legacy Native Modules (bridge-based NativeModules) who want to migrate to or build exclusively with TurboModules and the New Architecture.

## Status
Complete first draft — all 8 topics covered.

## Files

| File | Content |
|---|---|
| `02-turbomodules.md` | Full module: JSI internals, spec files, Codegen deep dive, get vs getEnforcing, defensive loading patterns, complete types table, EventEmitter, Jest mocking strategies, Pure C++ modules |

## What not to repeat
- Basic native module concepts → `trilha-nativo/modulo-recursos-nativos/07-integracao-nativa-avancada.md`
- JSI rendering internals (shadow tree, Fabric) → Module 03 of this Masterclass
- Brownfield ReactHost/RCTHost setup → Module 01

## Key decisions made
- All code targets New Architecture / Bridgeless (RN 0.76+)
- Legacy bridge `NativeModules.*` mentioned only as contrast, not as valid pattern
- Defensive loading section shows 3 distinct patterns (get + null, platform guard, service abstraction)
- Testing section shows 4 strategies ranked by complexity

Ver também: ../../CLAUDE.md
