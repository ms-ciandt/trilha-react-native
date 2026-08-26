# Masterclass — Module 01: Brownfield Integration

## Public
Senior Android (Kotlin) / iOS (Swift) developers embedding RN into existing production apps.
Assumes familiarity with Gradle, CocoaPods, Activity/Fragment lifecycle, UIViewController, and RN fundamentals.

## Status
Complete first draft — 9 topics covered across 4 files.

## Files

| File | Content |
|---|---|
| `01-setup-and-embedding.md` | Topics 1-3: greenfield vs brownfield, ReactHost/RCTHost setup (Android + iOS), RN within Activities/ViewControllers |
| `02-surfaces-and-lifecycle.md` | Topics 4-5: multiple surfaces from RN, lifecycle and native host |
| `03-communication-and-navigation.md` | Topics 6-8: 5 communication channels, state/session sharing, hybrid navigation |
| `04-bundle-strategy.md` | Topic 9: single bundle (default) vs. service bundles + shared core via Re.Pack/Module Federation, decision guidance |

## What not to repeat from other modules
- Basic native module concepts → `trilha-nativo/modulo-recursos-nativos/07-integracao-nativa-avancada.md`
- JSI/TurboModule internals → covered in Module 02 of this Masterclass
- Fabric rendering internals → covered in Module 03

## Key decisions made
- All code targets New Architecture (RN 0.76+): ReactHost on Android, RCTHost on iOS
- Legacy Bridge mentioned only as "do not use for new code"
- Navigation model is native-first (native NavController owns the stack)
- State sharing recommends MMKV as default, AsyncStorage 3.0 as alternative
- Bundle strategy: single bundle stays the recommended default; multi-bundle (Re.Pack + Module Federation, shared core + service bundles) is presented as the scale-out option, not a replacement — see `04-bundle-strategy.md`

Ver também: ../../CLAUDE.md
