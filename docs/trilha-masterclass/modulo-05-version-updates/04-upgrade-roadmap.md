---
title: Roadmap and Recommended Upgrade Path
---

# Roadmap and Recommended Upgrade Path

> The meta-question before any upgrade: *where are we going, and why now?* Upgrades done reactively ("the library we need requires 0.76") are harder than upgrades done proactively as part of a planned roadmap.

---

## The Support Window

React Native follows a rolling support window — only the **two most recent minor versions** receive backported security patches and critical bug fixes. Earlier versions are community-maintained (or not maintained at all).

```
As of July 2026:
  0.86  ← current stable (receives security patches)
  0.85  ← previous stable (receives critical fixes)
  0.84  ← end of support
  ...
```

Anything older than the two most recent minors gets no official fixes. A serious security bug found in the RN networking layer will not be patched in 0.73. This should be your baseline SLA for the upgrade roadmap.

**Practical rule:** be within two minor versions of the current stable. If you are three or more behind, start planning an upgrade sprint immediately.

---

## Deciding Between Incremental and Fresh Start

| Scenario | Recommendation |
|---|---|
| Within 2 minor versions of latest | Incremental — apply diffs minor by minor |
| 3–5 minor versions behind | Incremental — plan for 2–3 sprint upgrades |
| 6+ minor versions behind (e.g., still on 0.69) | Consider a new project, migrate screens progressively |
| Legacy bridge, no TurboModules yet | Incremental + parallel New Arch migration track |

The "fresh project" option is valid when the accumulated native config debt (custom build.gradle, old Podfile patterns, unmigrated modules) makes incremental upgrades slower than a rewrite would be. Count the native files that would need to change — if it's more than 20 custom files, the calculation shifts.

---

## Recommended Upgrade Path (2025–2026)

### Tier 1: From 0.72 to 0.76 (the New Arch migration)

This is the most impactful upgrade for most teams. The path is:

```
0.72 ──► 0.73 ──► 0.74 ──► 0.75 ──► 0.76
```

**0.72 → 0.73:** Hermes becomes the only engine. JSC removed. This is typically the lowest-friction step.

**0.73 → 0.74:** TurboModule Interop Layer becomes stable. Metro `exports` field support on by default. This is where you discover which third-party libraries have issues. Fix before moving on.

**0.74 → 0.75:** `minSdkVersion 24`, Xcode 15.1 required. Verify CI agent has the right Xcode version. iOS AppDelegate template switches to Swift.

**0.75 → 0.76:** New Architecture on by default. The largest step. Allocate a dedicated sprint. See the [Breaking Changes](./breaking-changes) topic for the full list.

**Time estimate:** 1–2 days per minor for a mid-size app with few custom native modules. Add 1 week for 0.75 → 0.76 if you have significant native code.

### Tier 2: From 0.76 to current stable (staying current)

Once on 0.76+, each subsequent minor is significantly lower friction because New Architecture is the baseline. Most changes are additive.

```
0.76 ──► 0.77 ──► 0.78 ──► ... ──► current
```

**Target cadence:** one minor per release cycle (~6 weeks), upgraded in the sprint immediately following the stable release. This keeps the diff small and the work routine.

### Tier 3: Expo SDK alignment

If you are on Expo:

```
SDK 51 (RN 0.74) ──► SDK 52 (RN 0.76) ──► SDK 53 (RN 0.79) ──► SDK 56 (RN current)
```

Expo's `npx expo upgrade` command handles the JS side. The native side requires re-running `prebuild` or using the [Expo bare upgrade guide](https://docs.expo.dev/bare/upgrade/).

**Never jump more than one Expo SDK at a time** — Expo's own libraries (expo-camera, expo-location, etc.) have inter-SDK dependencies that break when skipped.

---

## Compatibility Matrix (Official)

Source: [reactwg/react-native-releases/blob/main/docs/support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| RN Version | Node (min) | JDK | Xcode (min) | CocoaPods | Android SDK (min API) |
|---|---|---|---|---|---|
| 0.72 | 16 | 11 | 15.1 | 1.13.x | API 21 (5.0) |
| 0.73 | 18 | 17 | 15.1 | 1.13.x | API 21 (5.0) |
| 0.74 | 18 | 17 | 15.1 | 1.13.x | API 23 (6.0) |
| 0.75 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) |
| 0.76 | 18 | 17 | 15.1 | 1.13.x | API 24 (7.0) |
| 0.77 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.78 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.79 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.80 | 18 | 17 | 15.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.81 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.82 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.83 | 20 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.84 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.85 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |
| 0.86 | 22 | 17 | 16.1 | 1.13.x–1.15.2 | API 24 (7.0) |

**Key transitions to watch:**
- `0.72 → 0.73`: JDK 11 → 17 required (major CI impact)
- `0.74 → 0.75`: `minSdk` 23 → 24 (device support change)
- `0.80 → 0.81`: Node 18 → 20 (CI agent update required)
- `0.83 → 0.84`: Node 20 → 22 (CI agent update required)

---

## Upgrade Roadmap Template

Use this as a starting point for planning an upgrade sprint:

```markdown
## React Native Upgrade: 0.74 → 0.76

### Pre-work (Week 1)
- [ ] Read CHANGELOG for 0.75 and 0.76
- [ ] Run `npx react-native-check-new-archi` — document incompatible libraries
- [ ] Check CI agent: Xcode version, JDK version, Node version
- [ ] Identify all custom native modules (TurboModule migration required for 0.76?)
- [ ] Identify all patches in patches/ — will any need recreation?

### 0.74 → 0.75 (Week 2)
- [ ] Apply Upgrade Helper diffs
- [ ] Update CI agent Xcode if needed (15.1+)
- [ ] Full build on both platforms (clean)
- [ ] Run test suite
- [ ] Smoke test on device (Android + iOS)

### 0.75 → 0.76 (Week 3)
- [ ] Apply Upgrade Helper diffs (AppDelegate, Podfile, gradle changes)
- [ ] Verify New Architecture: `newArchEnabled=true`
- [ ] Address any incompatible libraries (disable New Arch temporarily if needed)
- [ ] Fix edge-to-edge StatusBar issues (if targetSdk=35)
- [ ] Recreate patches that touch upgraded files
- [ ] Full build on both platforms (clean)
- [ ] Run test suite
- [ ] Extended smoke test on device

### Release (Week 4)
- [ ] Beta release to internal testers
- [ ] Monitor crash rate (Sentry / Firebase)
- [ ] Gradual rollout: 5% → 25% → 100%
```

---

## Expo SDK ↔ React Native Version Mapping

| Expo SDK | React Native | Key Features |
|---|---|---|
| 51 | 0.74 | Expo Router v3, Expo Camera v14 |
| 52 | 0.76 | New Architecture default, SDK 52 modules all New Arch-ready |
| 53 | 0.79 | Android 16 preparation, expo-updates v2 |
| 54 | 0.81 | — |
| 55 | 0.83 | — |
| 56 | Current | See [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) |

---

## Study Materials

| Resource | Description |
|---|---|
| [reactwg/react-native-releases — support.md](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md) | Official compatibility matrix — the primary source for environment requirements |
| [React Native Versions](https://reactnative.dev/versions) | Docs snapshot per version — useful for API lookups at a specific version |
| [Expo SDK Upgrade Walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) | Official step-by-step for Expo managed and bare workflow |
| [Expo Changelog](https://expo.dev/changelog) | Full SDK release notes; each entry links to the corresponding RN version |
| [App.js Conf 2024](https://appjs.swmansion.com/editions/2024) | Talks include New Architecture adoption strategies and upgrade war stories |
| [App.js Conf 2025](https://appjs.swmansion.com/editions/2025) | Post-0.76 roadmap, Legacy Architecture sunset plan |

---

Next → [Validation with a Build on Both Platforms](./build-validation)
