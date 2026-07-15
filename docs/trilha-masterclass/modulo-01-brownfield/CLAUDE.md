# Masterclass — Module 01: Brownfield Integration

## Public
Senior Android (Kotlin) / iOS (Swift) developers embedding RN into existing production apps.
Assumes familiarity with Gradle, CocoaPods, Activity/Fragment lifecycle, UIViewController, and RN fundamentals.

## Status
Complete first draft — all 8 topics covered.

## Files

| File | Content |
|---|---|
| `01-brownfield-integration.md` | Full module: greenfield vs brownfield, ReactHost/RCTHost setup, surfaces, lifecycle, communication channels (5), state sharing, hybrid navigation |

## What not to repeat from other modules
- Basic native module concepts → `trilha-nativo/modulo-recursos-nativos/07-integracao-nativa-avancada.md`
- JSI/TurboModule internals → covered in Module 02 of this Masterclass
- Fabric rendering internals → covered in Module 03

## Key decisions made
- All code targets New Architecture (RN 0.76+): ReactHost on Android, RCTHost on iOS
- Legacy Bridge mentioned only as "do not use for new code"
- Navigation model is native-first (native NavController owns the stack)
- State sharing recommends MMKV as default, AsyncStorage 3.0 as alternative

Ver também: ../../CLAUDE.md
