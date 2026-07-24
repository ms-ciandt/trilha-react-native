# React Native Trail

A free, open-source course for developers who already know how to build software — either on Android (Kotlin/Compose), iOS (Swift/SwiftUI), or on the web (React) — and want to master React Native with the New Architecture.

**Live site:** [ms-ciandt.github.io/trilha-react-native](https://ms-ciandt.github.io/trilha-react-native)

---

## Four Tracks, One Destination

| Track | For |
|-------|-----|
| **Web dev trail** | React / JavaScript web developers |
| **Android native trail** | Android developers coming from Kotlin & Jetpack Compose |
| **iOS native trail** | iOS developers coming from Swift & SwiftUI |
| **React Native MasterClass** | Advanced — Brownfield, TurboModules, Fabric, JSI, CI/CD |

Every trail leads to the same destination: production-ready React Native apps with the New Architecture.

---

## Course Content

### Web Dev Trail

| Module | Topics | Status |
|--------|--------|--------|
| Introduction (shared) | 4 | ✅ Done |
| Fundamentals | 9 | ✅ Done |
| Native Resources | 3 | ✅ Done |
| Performance | 1 | ✅ Done |
| Testing | 1 | ✅ Done |
| CI/CD | 2 | ✅ Done |
| Architecture | 1 | ✅ Done |

### Android Native Trail

| Module | Topics | Status |
|--------|--------|--------|
| Fundamentals | 5 | ✅ Done |
| Compose → React Native | 5 | ✅ Done |
| Native Resources | 5 | ✅ Done |
| Performance | 5 | ✅ Done |
| Testing | 5 | ✅ Done |
| CI/CD | 5 | ✅ Done |
| Architecture | 5 | ✅ Done |
| New Architecture | 5 | ✅ Done |

### iOS Native Trail

| Module | Topics | Status |
|--------|--------|--------|
| Fundamentals | 10 | ✅ Done |
| Native Resources | 1 | 🚧 Stub |
| Performance | 1 | 🚧 Stub |
| Testing | 1 | 🚧 Stub |
| CI/CD | 1 | 🚧 Stub |
| Architecture | 1 | 🚧 Stub |

### Masterclass Trail (Advanced)

| Module | Topics | Status |
|--------|--------|--------|
| 00 — Course Overview | 1 | ✅ Done |
| 01 — Brownfield Integration | 3 | ✅ Done |
| 02 — JSI & Fabric | 6 | ✅ Done |
| 03 — TurboModules | 8 | ✅ Done |
| 04 — Performance, Bundle & CI/CD | 5 | ✅ Done |
| 05 — RN Version Updates & Upgrade Strategy | 10 | ✅ Done |

---

## Translations

All content is available in English and **Portuguese (PT-BR)**. The PT-BR translation covers the full site — introduction, all trails, and the complete Masterclass.

Translations live in `i18n/pt/` and are served under the `/pt/` URL prefix via Docusaurus's built-in i18n support.

---

## Built AI-First

This course was created with an AI-first workflow. Every explanation, code example, analogy, and narrative section was authored using AI tools — not as a shortcut, but as a deliberate choice to move fast and maintain consistency across four parallel trails and hundreds of topics.

Tools used: **NotebookLM**, **Claude**.

All content was reviewed and validated by the contributors.

---

## Contributors

| | GitHub |
|---|---|
| Matheus Sales | [@ms-ciandt](https://github.com/ms-ciandt) |
| Gabriel Bonin | [@gbonin-ciandt](https://github.com/gbonin-ciandt) |
| Erick Sugahara | [@erickSuh](https://github.com/erickSuh) |

---

## Repository Structure

```
trilha-react-native/
├── docs/
│   ├── introducao/                      ← module zero, shared across all trails (4 topics)
│   ├── trilha-web/                      ← for React / web devs
│   │   ├── modulo-fundamentos/          ← 9 topics ✅
│   │   ├── modulo-recursos-nativos/     ← 3 topics ✅
│   │   ├── modulo-performance/          ← 1 topic ✅
│   │   ├── modulo-testes/               ← 1 topic ✅
│   │   ├── modulo-cicd/                 ← 2 topics ✅
│   │   └── modulo-arquitetura/          ← 1 topic ✅
│   ├── trilha-android/                  ← for Kotlin / Compose devs
│   │   ├── modulo-fundamentos/          ← 5 topics ✅
│   │   ├── modulo-compose-para-rn/      ← 5 topics ✅ (Composable, remember, NavHost…)
│   │   ├── modulo-recursos-nativos/     ← 5 topics ✅
│   │   ├── modulo-performance/          ← 5 topics ✅
│   │   ├── modulo-testes/               ← 5 topics ✅
│   │   ├── modulo-cicd/                 ← 5 topics ✅
│   │   ├── modulo-arquitetura/          ← 5 topics ✅
│   │   └── modulo-new-architecture/     ← 5 topics ✅ (Hermes, JSI, TurboModule, Fabric…)
│   ├── trilha-ios/                      ← for Swift / SwiftUI devs
│   │   ├── modulo-fundamentos/          ← 10 topics ✅
│   │   ├── modulo-recursos-nativos/     ← stub
│   │   ├── modulo-performance/          ← stub
│   │   ├── modulo-testes/               ← stub
│   │   ├── modulo-cicd/                 ← stub
│   │   └── modulo-arquitetura/          ← stub
│   └── trilha-masterclass/              ← advanced trail — all 6 modules done ✅
│       ├── modulo-00-overview/
│       ├── modulo-01-brownfield/
│       ├── modulo-02-jsi-fabric/
│       ├── modulo-03-turbomodules/
│       ├── modulo-04-performance-cicd/
│       └── modulo-05-version-updates/
├── _course-refs/                        ← consolidated COURSE-*.md files (not published)
├── i18n/pt/                             ← Portuguese (PT-BR) — full coverage
│   ├── docusaurus-plugin-content-docs/current/
│   └── docusaurus-plugin-content-pages/
├── static/assets/videos/               ← mp4 video files per trail
│   ├── introducao/
│   ├── trilha_nativo/
│   ├── trilha_web/
│   └── trilha_masterclass/
├── src/
│   ├── pages/                           ← index.jsx (home) · about.jsx
│   └── css/custom.css                   ← per-trail color themes
├── .claude/
│   ├── design-system.md                 ← visual design rules for all pages
│   └── commands/
├── docusaurus.config.js
└── sidebars.js
```

---

## Contributing

### Branch rules

Never commit directly to `main`. Always create a branch and open a PR:

```bash
git checkout -b content/my-topic
# make changes
git push origin content/my-topic
# open a PR on GitHub
```

Suggested branch formats: `content/<slug>` for content, `fix/<slug>` for fixes, `feat/<slug>` for features.

### File conventions

- Individual files: `NN-slug.md` with `title` frontmatter only
- Use `.mdx` only when JSX is needed inside the file (e.g. Masterclass overview pages)
- `COURSE-[module].md` files live in `_course-refs/` — not inside `docs/` (avoids build warnings)
- Each folder has its own `CLAUDE.md` with local context (not published)
- No emojis in content files
- `trilha-android`: Kotlin/Compose analogies; `trilha-ios`: Swift/SwiftUI analogies; `trilha-web`: HTML/CSS/React analogies
- Target file size: 150–400 lines; split if over 500 lines

### Bilingual requirement

Every content file must have a PT-BR mirror:

| File type | EN source | PT-BR mirror |
|-----------|-----------|--------------|
| Page (`src/pages/`) | `src/pages/foo.jsx` | `i18n/pt/docusaurus-plugin-content-pages/foo.jsx` |
| Doc (`docs/`) | `docs/<trail>/…/file.md` | `i18n/pt/docusaurus-plugin-content-docs/current/<trail>/…/file.md` |

### Running locally

```bash
npm install
npm run start        # dev server at localhost:3000/trilha-react-native
npm run build        # production build
npm run serve        # preview production build
```

### Adding a new page

1. Create the `.md` file under `docs/`
2. Create its PT-BR mirror under `i18n/pt/docusaurus-plugin-content-docs/current/`
3. Register both in `sidebars.js` under the correct trail and module
4. If a video exists, add it after the `# Title` with the `## Video Overview` pattern

---

## Tech Stack

- [Docusaurus 3](https://docusaurus.io) — static site generator with i18n support
- React Native 0.76+ (New Architecture by default — JSI, Fabric, TurboModules, Hermes)
- Expo SDK 56
- [React Navigation](https://reactnavigation.org) — referenced throughout course content
