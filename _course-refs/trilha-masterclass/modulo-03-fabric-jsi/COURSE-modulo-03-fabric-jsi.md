# COURSE — Masterclass Module 03: Fabric & JSI

## Files

- `01-jsi-javascript-interface.md` — JSI vs old bridge; jsi::Runtime, jsi::Value, jsi::HostObject, jsi::HostFunction; synchronous and asynchronous call patterns; Hermes interop (HermesRuntime, bytecode, BigInt); JSI debugging with CDP and Perfetto
- `02-fabric-renderer.md` — Shadow Tree and reconciliation; Yoga layout engine; three-tree model (current / work-in-progress / rendering); concurrent rendering and React 18 features (useTransition); Fabric threading model (JS, commit, UI threads); writing Fabric native components end-to-end (TypeScript spec → Codegen → iOS + Android view); interop layer for legacy components
- `03-runtime-new-architecture.md` — Hermes execution pipeline; bytecode format and AOT compilation; inline requires and bundle optimisation; Codegen end-to-end (TypeScript spec → C++ header → native implementation); TurboModule lazy loading; synchronous TurboModule call flow; end-to-end TurboModule implementation (SecureStorage); debugging tools (CDP, Perfetto/Systrace, Hermes sampling profiler, React DevTools Profiler); feature flags for New Architecture

## Status

COMPLETE. All three files published and registered in sidebars.js.

## Prerequisites

Students should have completed:
- Module 01 (Brownfield Integration) — understand ReactHost/RCTHost and surface lifecycle
- Module 02 (TurboModules) — understand how to write a basic TurboModule before seeing the Codegen internals here

## Key references used throughout

- `jsi/jsi.h` — JSI type definitions
- `ShadowTree.cpp` — Fabric commit pipeline
- `TurboModuleBinding.cpp` — how `__turboModuleProxy` is installed
- `ReactNativeFeatureFlags.h` — feature flags for New Architecture
- Yoga playground: https://yogalayout.dev/playground
- Hermes playground: https://playground.hermesengine.dev/
