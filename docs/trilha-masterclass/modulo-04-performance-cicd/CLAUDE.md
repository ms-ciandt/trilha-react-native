# Module 04 — Performance, Bundle & CI/CD (CLAUDE.md)

## Status

COMPLETE — three published files.

## Files

- `01-performance.md` — startup time (four phases + instrumentation), Hermes GC tuning, worklets, profiling methodology, React DevTools Profiler, re-render causes, React.memo, useMemo, FlashList, Zustand selectors, image/query caching
- `02-bundle-distribution.md` — Metro config deep dive, bundle CLI, Hermes AOT compilation, bundle analysis, Android/iOS production build pipelines, R8/ProGuard, bundle metadata injection, OTA hot-patch mechanics, Artifactory publishing, semver for native apps
- `03-cicd-pipeline.md` — complete GitHub Actions release workflow (7-gate pipeline), Fastlane for Android and iOS, code signing with Match, versioning automation, deploy to Firebase/TestFlight/Play Store, staged rollout, rollback, preflight checks script (permissions baseline, version code uniqueness, signing validation), Slack notifications

## Target audience

Senior engineers owning the release pipeline — not entry-level CI setup, but the architecture decisions behind each gate and the failure modes each check prevents.

## Do not add

- React Native basics (navigation, styling, state management) — not this module
- Old architecture content — everything assumes New Architecture / RN 0.76+
- Expo-managed workflow specifics — content targets bare React Native

## Key tools referenced

- Metro, Hermes hermesc, Gradle, Fastlane, GitHub Actions
- Perfetto (Android), Instruments (iOS), React DevTools Profiler
- FlashList, React Native Reanimated 3 worklets, TanStack Query
- Sentry source maps, Firebase App Distribution, TestFlight
- Artifactory npm registry, React Native Builder Bob
