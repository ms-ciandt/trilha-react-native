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

| Module | Native Track | Web Track |
|--------|-------------|-----------|
| Fundamentals | ✅ Done | ✅ Done |
| Native Resources | ✅ Done | ✅ Done |
| Performance | ✅ Done | ✅ Done |
| Testing | ✅ Done | ✅ Done |
| CI/CD | ✅ Done | ✅ Done |
| Architecture | ✅ Done | ✅ Done |

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
│   └── trilha-web/                  ← for React web devs
│       ├── modulo-fundamentos/
│       ├── modulo-recursos-nativos/
│       ├── modulo-performance/
│       ├── modulo-testes/
│       ├── modulo-cicd/
│       └── modulo-arquitetura/
├── static/assets/videos/            ← mp4 video files
├── src/
│   ├── pages/                       ← custom pages (About)
│   └── css/
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
- Each module folder has a `COURSE-[module].md` consolidating all content (not published to the site)
- Each folder has its own `CLAUDE.md` with local context (not published to the site)
- No emojis in content files
- `trilha-nativo`: Kotlin/Swift analogies; `trilha-web`: HTML/CSS/React web analogies

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
