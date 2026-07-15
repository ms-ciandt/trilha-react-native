# Masterclass — Module 05: React Native Version Updates

## Public
Senior developers responsible for maintaining and upgrading React Native apps in production. Assumes familiarity with Gradle, CocoaPods, and native builds.

## Status
Complete first draft — all 10 topics covered across 2 sections (Process + Dependencies/Environment).

## Files

| File | Section | Content |
|---|---|---|
| `01-upgrade-strategy.md` | Process | Incremental strategy, four-phase process, recommended path 0.72→0.76 |
| `02-rn-upgrade-helper.md` | Process | How the tool works, reading native diffs, brownfield mapping |
| `03-breaking-changes.md` | Process | Where to find changelogs, high-impact changes per version 0.72→0.76 |
| `04-upgrade-roadmap.md` | Process | Support window policy, version roadmap, compatibility matrix, Expo mapping |
| `05-build-validation.md` | Process | Clean build steps, Android/iOS failure table, smoke test checklist, CI config |
| `06-patches-recreation.md` | Dependencies | patch-package workflow, recreation steps, alternatives (yarn/pnpm patch) |
| `07-library-compatibility.md` | Dependencies | New Arch compatibility tools, three scenarios, common library alternatives |
| `08-environment-requirements.md` | Dependencies | Full compatibility matrix, nvm/JDK/Xcode/CocoaPods management |
| `09-native-settings.md` | Dependencies | Edge-to-edge breakage, SystemBars, useSafeAreaInsets, common library issues |
| `10-rn-doctor.md` | Dependencies | Doctor command, custom checks, build failure diagnosis flowchart |

## What not to repeat
- TurboModule registration details → Module 02
- ReactHost/RCTHost brownfield setup → Module 01
- Fabric/JSI internals → Module 03

Ver também: ../../CLAUDE.md
