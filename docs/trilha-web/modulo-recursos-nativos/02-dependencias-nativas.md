---
title: Native Dependencies — JS-only vs Native Code
---

# Native Dependencies — JS-only vs Native Code

> On the web, adding a dependency is cheap: `npm install`, tree-shaking, done. On mobile, that assumption breaks for a whole category of libraries. Understanding the difference before you add a package saves hours of debugging.

## Two Classes of Dependencies

React Native packages split into two profiles with very different risk levels:

| Class | Examples | Risk profile |
|---|---|---|
| **JS-only** | lodash, date-fns, zod, zustand, immer | Low — behaves exactly like a web dependency |
| **Native code** | camera, maps, storage, gestures, sensors | Higher — brings Kotlin/Swift that must compile with your app |

JS-only packages work the same as on the web: no native build step, no compatibility matrix, easy to replace.

Native packages are different. Each one adds:

1. **Version coupling** — must be compatible with your RN version, Gradle/AGP, Xcode, and (if Expo) the SDK version. Upgrading RN often means waiting for native libs to publish a compatible release.
2. **Build cost** — errors surface in Gradle or Xcode, not in the Metro bundler. Debugging a build failure is a different skill than debugging a JS error.
3. **New Architecture compatibility** — libraries tied to the legacy bridge may have performance issues or deprecation risk. Check [reactnative.directory](https://reactnative.directory/) for the "New Architecture" badge before adopting.
4. **Removal cost** — removing a native library requires a full rebuild. In a published app, that means a new release to the stores — you can't "hot-fix" out a native dependency.

## Checklist Before Adding a Native Package

Before `npm install` on anything with native code:

- [ ] Does it have native code at all? (Check for `android/` or `ios/` folders in the package)
- [ ] Does it support the New Architecture? (Check [reactnative.directory](https://reactnative.directory/))
- [ ] When was the last commit? How many open issues?
- [ ] Is there a maintained `expo-*` alternative? (Often better integrated with the Expo ecosystem)
- [ ] Is there a JS-only alternative that covers the use case?

## Brownfield Note

When React Native lives inside an existing native app (brownfield), each new native dependency can conflict with libraries the host app already uses — duplicate versions of Android libraries (OkHttp, Firebase, Glide), CocoaPods conflicts, or duplicate native symbols. In this context, adding a native dependency is not a decision for the RN team alone — it needs to be coordinated with the native team.

For a deeper look at brownfield integration, see the [Masterclass module on Brownfield](../../trilha-masterclass/modulo-01-brownfield/).

---

## Resources

| Resource | Type | Link |
|---|---|---|
| React Native Directory | Community | [reactnative.directory](https://reactnative.directory/) |
| Expo SDK packages | Official | [docs.expo.dev/versions/latest/](https://docs.expo.dev/versions/latest/) |
| New Architecture compatibility | Guide | [reactnative.dev/docs/new-architecture-intro](https://reactnative.dev/docs/new-architecture-intro) |

---

Next → **[CI/CD](../modulo-cicd/topico-ci-cd-web)**
