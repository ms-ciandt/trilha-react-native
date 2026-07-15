# React Native Trail

A free, open-source course for developers who already know how to build software — either on mobile (Android/iOS) or on the web (React) — and want to master React Native with the New Architecture.

**Live site:** [alimuramatheus.github.io/trilha-react-native](https://alimuramatheus.github.io/trilha-react-native)

---

## Two Tracks, One Destination

| Track | For |
|-------|-----|
| **Native Dev Track** | Android (Kotlin) / iOS (Swift) developers |
| **Web Dev Track** | React / JavaScript web developers |

Both tracks cover the same React Native skill set — they just approach it from your existing strengths.

---

## Course Modules

### Native Dev Track & Web Dev Track

| Module | Native Track | Web Track |
|--------|-------------|-----------|
| Introduction | ✅ Done (shared) | ✅ Done (shared) |
| Fundamentals | ✅ Done | ✅ Done |
| Native Resources | 🔜 Coming soon | 🔜 Coming soon |
| Performance | 🔜 Coming soon | 🔜 Coming soon |
| Testing | 🔜 Coming soon | 🔜 Coming soon |
| CI/CD | 🔜 Coming soon | 🔜 Coming soon |
| Architecture | 🔜 Coming soon | 🔜 Coming soon |

### Masterclass Track (Advanced)

| Module | Status |
|--------|--------|
| 00 — Course Overview | ✅ Done |
| 01 — Brownfield Integration | ✅ Done |
| 02 — TurboModules | ✅ Done |
| 03 — Fabric & JSI | ✅ Done |
| 04 — Performance & CI/CD | ✅ Done |
| 05 — Upgrade Strategy | ✅ Done |

---

## Built AI-First

This course was created with an AI-first workflow. Every explanation, code example, analogy, and narrative section was authored using AI tools — not as a shortcut, but as a deliberate choice to move fast and maintain consistency across two parallel tracks and dozens of topics.

Tools used: **NotebookLM**, **Claude**, etc.

All content was reviewed and validated by the contributors.

---

## Contributors

| | GitHub |
|---|---|
| Matheus Sales | [@AlimuraMatheus](https://github.com/AlimuraMatheus) |
| Gabriel Bonin | [@gbonin-ciandt](https://github.com/gbonin-ciandt) |
| Erick Sugahara | [@erickSuh](https://github.com/erickSuh) |

---

## Repository Structure

```
trilha-react-native/
├── docs/
│   ├── introducao/                  ← module zero, common to both tracks
│   ├── trilha-nativo/               ← for Android (Kotlin) / iOS (Swift) devs
│   │   ├── modulo-fundamentos/
│   │   ├── modulo-recursos-nativos/
│   │   ├── modulo-performance/
│   │   ├── modulo-testes/
│   │   ├── modulo-cicd/
│   │   └── modulo-arquitetura/
│   ├── trilha-web/                  ← for React web devs
│   │   ├── modulo-fundamentos/
│   │   ├── modulo-recursos-nativos/
│   │   ├── modulo-performance/
│   │   ├── modulo-testes/
│   │   ├── modulo-cicd/
│   │   └── modulo-arquitetura/
│   └── trilha-masterclass/          ← advanced track
│       ├── modulo-00-overview/
│       ├── modulo-01-brownfield/
│       ├── modulo-02-turbomodules/
│       ├── modulo-03-fabric-jsi/
│       ├── modulo-04-performance-cicd/
│       └── modulo-05-upgrade/
├── _course-refs/                    ← consolidated COURSE-*.md files (not published)
├── i18n/pt/                         ← Portuguese (PT-BR) translations
│   ├── docusaurus-plugin-content-docs/current/
│   └── docusaurus-plugin-content-pages/
├── static/assets/videos/            ← mp4 video files
├── src/
│   ├── pages/                       ← home page (index.jsx) and About page
│   └── css/
├── .claude/
│   ├── design-system.md             ← visual design rules for all pages
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

Suggested branch format: `content/<slug>` for content, `fix/<slug>` for fixes.

### File conventions

- Individual files: `NN-slug.md` with `title` frontmatter only
- Use `.mdx` extension only when JSX is needed inside the file (e.g. Masterclass overview pages)
- `COURSE-[module].md` files live in `_course-refs/` — not inside `docs/` (avoids build warnings)
- Each folder has its own `CLAUDE.md` with local context (not published to the site)
- No emojis in content files
- `trilha-nativo`: Kotlin/Swift analogies; `trilha-web`: HTML/CSS/React web analogies
- Target file size: 150–400 lines; split if over 500 lines

### Running locally

```bash
npm install
npm run start        # dev server at localhost:3000/trilha-react-native
npm run build        # production build
npm run serve        # preview production build
```

### Adding a new page

1. Create the `.md` file under `docs/`
2. Register it in `sidebars.js` under the correct track and module
3. If a video exists, add it with the `## Video Overview` pattern (see any existing topic file)

---

## Tech Stack

- [Docusaurus 3](https://docusaurus.io) — static site generator
- [React Navigation](https://reactnavigation.org) — referenced throughout
- React Native 0.76+ (New Architecture by default)
- Expo SDK 56
