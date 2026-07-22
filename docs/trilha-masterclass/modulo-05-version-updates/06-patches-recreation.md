---
title: "Recreation of Patches (patch-package)"
---

# Recreation of Patches (patch-package)

> Patches in `patches/` are technical debt with an expiry date. Every RN upgrade is a forcing function to audit them — some can be deleted (the upstream fix landed), some need recreation, and some reveal that a library has been abandoned.

---

## How patch-package Works

`patch-package` stores diffs of `node_modules` as `.patch` files in your `patches/` directory. On every `npm install`, it re-applies those diffs via a `postinstall` script.

```json
// package.json
{
  "scripts": {
    "postinstall": "patch-package"
  },
  "devDependencies": {
    "patch-package": "^8.0.0"
  }
}
```

A patch file looks like:

```diff
diff --git a/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java b/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
index 3a2b1c..f8e4d1 100644
--- a/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
+++ b/node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
@@ -42,7 +42,7 @@ public class RNCameraModule extends ReactContextBaseJavaModule {
-    private static final int CAMERA_PERMISSION = 1;
+    private static final int CAMERA_PERMISSION = 2;  // fixes conflict with audio permission
```

When `react-native-camera` updates, this diff may no longer apply cleanly — `patch-package` will fail with a `Hunk FAILED` error and exit non-zero, breaking your `npm install`.

---

## Patch Failure During an Upgrade

After bumping a library version, patches that touch that library may fail:

```
$ npm install

> myapp@1.0.0 postinstall
> patch-package

patch-package 8.0.0
Applying patches...
react-native-camera+1.14.0.patch Hunk #1 FAILED at 42.
1 of 1 hunks FAILED -- saving rejects to file
  node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java.rej

ERROR: Failed to apply patch for react-native-camera.
```

This is intentional. patch-package refuses to silently apply a patch that doesn't fit — a failed hunk means your patch might no longer be necessary, or the code has moved.

---

## Recreation Workflow

### Step 1: Check if the patch is still needed

Before recreating, check if the upstream library fixed the issue:

```bash
# Check the library's changelog or releases
open https://github.com/the-library/releases

# Check the specific file that was patched
cat node_modules/the-library/path/to/file.js | grep "the thing you fixed"
```

If the fix landed upstream, **delete the patch file** and remove the entry from `postinstall`. This is the best possible outcome.

### Step 2: Understand what the original patch did

Read the `.patch` file before recreating:

```bash
cat patches/react-native-camera+1.13.0.patch
```

Understand the *intent* — not just the line numbers. Is it:
- A bug fix that hasn't been merged upstream?
- A workaround for an incompatibility with another library?
- A feature that the library doesn't support?

### Step 3: Apply the fix manually to the new version

Make the equivalent change to the new version of the file in `node_modules`:

```bash
# Edit the file directly in node_modules
code node_modules/react-native-camera/android/src/main/java/com/rncamera/RNCameraModule.java
```

### Step 4: Create the new patch file

```bash
# Creates patches/react-native-camera+NEW_VERSION.patch
npx patch-package react-native-camera
```

This overwrites the old patch file (different version number in the filename).

### Step 5: Test that the patch applies cleanly

```bash
# Simulate a fresh install
rm -rf node_modules
npm install
# Should see: "react-native-camera+1.14.0.patch  ✔"
```

---

## patch-package vs Alternatives (2025)

| Tool | Package Manager | Monorepo Support | How Patches are Stored |
|---|---|---|---|
| `patch-package` | npm, Yarn v1 | `--patch-dir` flag | `patches/` directory, `.patch` files |
| `yarn patch` | Yarn Berry (v2+) | Per-workspace | `.yarn/patches/` directory |
| `pnpm patch` | pnpm | Per-workspace, shared store | `patchedDependencies` in `package.json` |

### `yarn patch` (Yarn Berry)

```bash
# Open a temporary copy of the package for editing
yarn patch react-native-camera

# Make your changes in the temp directory shown in the output
# Then commit the patch:
yarn patch-commit /tmp/xfs-abc123/react-native-camera

# This adds to package.json:
# "resolutions": { "react-native-camera@patch:...": "..." }
```

### `pnpm patch`

```bash
# Open editable copy
pnpm patch react-native-camera@1.14.0

# Edit files in the temp dir, then:
pnpm patch-commit /path/to/temp-dir

# pnpm stores patches in node_modules/.pnpm/patches/
# and records in package.json:
# "pnpm": { "patchedDependencies": { "react-native-camera@1.14.0": "patches/react-native-camera@1.14.0.patch" } }
```

**Recommendation for new projects (2025):** use your package manager's native patching. `patch-package` remains the most widely understood option for npm projects and Yarn v1 — which covers most React Native projects still. For new monorepos using pnpm or Yarn Berry, use the native alternatives.

---

## Patch Inventory Before an Upgrade

Before starting any upgrade, audit your patches:

```bash
ls patches/
```

For each patch file, record:

| Patch file | Library being patched | Reason for patch | Is it still needed? |
|---|---|---|---|
| `react-native-camera+1.13.0.patch` | react-native-camera | Permission code conflict | Check new version |
| `react-native-maps+1.7.1.patch` | react-native-maps | Android 13 crash fix | Likely fixed in v1.8+ |
| `react-native-video+6.2.0.patch` | react-native-video | Hermes compatibility | Fixed in 6.3 |

Libraries where the patch:
- Touches a JS file → easier to recreate; check if logic moved
- Touches a Java/Kotlin file → medium; check if class structure changed
- Touches a C++/JSI file → hardest; these change significantly between RN versions

---

## Best Practice: Document Every Patch

Each patch file should have a companion comment in `package.json` or a `patches/README.md`:

```markdown
# patches/README.md

## react-native-camera+1.14.0.patch

**Reason:** `CAMERA_PERMISSION` constant (value 1) conflicts with `AUDIO_PERMISSION` (value 1)
introduced in RN 0.74. Changed to value 2 to avoid the collision.

**Upstream issue:** https://github.com/react-native-camera/issues/1234

**Status:** PR submitted, not merged. Re-check on library upgrade.

**Affects:** Android only. Permission request dialog may not appear without this fix.

---

## react-native-video+6.2.0.patch

**Reason:** Hermes 0.73+ changed the JSI function call convention for callbacks.
The library was calling `jsi::Function::call()` without a runtime guard.

**Upstream issue:** Fixed in react-native-video 6.3.1 — **DELETE THIS PATCH when upgrading to 6.3+**

**Affects:** Both platforms. App crashed on video playback start.
```

Without documentation, the next developer to maintain these patches has to reverse-engineer the intent from the diff. That developer will often just delete the patch and discover the bug in production.

---

## Study Materials

| Resource | Description |
|---|---|
| [patch-package — GitHub](https://github.com/ds300/patch-package) | Source, docs, `--patch-dir` for monorepos |
| [patch-package — npm](https://www.npmjs.com/package/patch-package) | Installation, usage, postinstall setup |
| [Yarn patch — official docs](https://yarnpkg.com/cli/patch) | Yarn Berry native patching command |
| [pnpm patch — official docs](https://pnpm.io/cli/patch) | pnpm native patching command |
| [patch-package vs yarn patch vs pnpm patch 2026](https://www.pkgpulse.com/guides/patch-package-vs-pnpm-patch-vs-yarn-patch-patching-node-2026) | Side-by-side comparison including monorepo behavior |
| [Patch Package in React Native — Medium](https://medium.com/@renaldhif/patch-package-in-react-native-a-practical-way-to-survive-updates-19a5197c2de6) | Practical walkthrough for RN-specific patches |

---