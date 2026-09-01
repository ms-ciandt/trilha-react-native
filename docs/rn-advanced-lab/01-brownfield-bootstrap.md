---
title: Brownfield Bootstrap
---

# Lab 01 — Brownfield Bootstrap

**Prerequisite:** none — this is the first lab.
**Optional:** no.
**Template:** [`ciandt-championships-android-template`](https://github.com/gbonin-ciandt/ciandt-championships-android-template) (iOS template coming later).

## Context

The CI&T Championships app (see the [Labs overview](/lab)) already exists as a native Android app. It
has one working screen: a list of internal tournaments, each rendered as a card by
`TournamentListScreen.kt`. Two more native
screens already exist too — **History** and **Global Ranking** — reachable from text
buttons on the tournament list, wired through a Jetpack Navigation Compose graph in
`MainActivity.kt`.

This is the brownfield premise for the whole lab track: the native app is already in
production, and React Native gets added into it feature by feature, screen by screen —
not the other way around. Lab 01 is where that addition happens for the first time.

Right now, tapping a tournament card does nothing. Your job is to make it open a React
Native screen.

## Project layout

The template ships as a plain native project today — only the `android/` folder exists,
holding the whole Kotlin/Compose app (Gradle files, `app/`, the wrapper). There is no
`package.json`, no `index.js`, nothing JS-related yet.

This lab adds React Native the same way a fresh `npx react-native init` would lay things
out, just retrofitted onto an app that already exists:

```
your-repo/
  android/                 ← existing native project, structurally untouched
    app/
    build.gradle.kts
    settings.gradle.kts
    ...
  package.json              ← new, at the repo root
  metro.config.js
  babel.config.js
  index.js                  ← registers the RN screen(s) you add in this lab
  src/
    screens/                 ← your React Native code, starting with this lab's placeholder
```

Everything Gradle-related stays inside `android/` — that's also where the RN Gradle
plugin (`com.facebook.react`) and the `ReactHost`/`ReactActivityDelegate` wiring get
added, since it's the native module that resolves them. The RN toolchain (Metro, Babel,
autolinking config) lives at the repo root, same as in any React Native app — `android/`
is simply the platform folder Metro and autolinking already expect to find there.

## Goal

Embed React Native into this native Android project, and make tapping a tournament card
in the native list open a new React Native screen that:

1. receives the tapped tournament's data,
2. visually identifies itself as a React Native screen,
3. can navigate back to the native list without leaving the app in a broken state.

This lab is about proving the plumbing works end to end — it is **not** about building
the real Tournament Detail UI (that's Lab 02). A screen that just prints the tournament
name is a complete, correct Lab 01.

## Completion criteria

- [ ] React Native is embedded into the existing Android project (not a fresh
      `npx react-native init` sitting next to it — the native `TournamentListScreen`,
      `HistoryScreen` and `RankingScreen` must keep working exactly as before)
- [ ] The app still runs on the **New Architecture** (Fabric + JSI + Hermes) — no legacy
      bridge, no `requireNativeComponent`, no `NativeModules` for anything you add here
- [ ] Tapping a `TournamentCard` in the native list launches a React Native screen
- [ ] That RN screen receives the tapped `Tournament` (at minimum `id` and `name`) through
      **initial props**, not through a network call or a hardcoded value
- [ ] The RN screen renders a banner at the top identical in spirit to the native
      `OriginBadge` — same purple (`#4C1D95`), same all-caps style, label
      `"REACT NATIVE SCREEN"` — so during debugging it's obvious which screen you're on
- [ ] The RN screen displays the tournament name it received, proving the data actually
      arrived (not just that the screen opened)
- [ ] There is a way back to the native tournament list (Android back gesture/button, and
      ideally an explicit close action) that doesn't crash, doesn't duplicate the native
      screen, and doesn't leave a blank/frozen surface behind
- [ ] Cold-starting the app still shows the native tournament list first — RN is only
      loaded when a card is tapped, not eagerly at app launch (a lazy `ReactHost` is fine
      and expected)

## How to approach it

Work through this roughly in order:

1. **Add the RN dependency layer** to the existing Gradle project — `package.json`,
   Metro config, the RN Gradle plugin, and the Kotlin `ReactHost`/`ReactActivityDelegate`
   wiring for the New Architecture. Don't touch `TournamentListViewModel`,
   `TournamentRepository`, or the existing Compose screens' internals — this lab is purely
   additive.
2. **Register one RN surface** (a single `AppRegistry.registerComponent` call is enough)
   for the detail placeholder screen.
3. **Decide how the tap turns into an RN screen launching.** The simplest correct option:
   a dedicated `Activity` (or Fragment, if you'd rather push it onto the existing
   `NavHost`) that hosts a `ReactRootView`/`ReactFragment` and receives the tournament as
   a `Bundle` extra, which becomes the RN surface's `initialProperties`.
4. **Render the purple badge + tournament name** in the RN screen — plain `View`/`Text`,
   no need for a component library yet.
5. **Wire the way back** — either the platform back button closing the Activity/Fragment
   naturally, or an explicit "Back to native list" button calling into a small native
   module/event that finishes the RN surface.

## Common pitfalls

:::warning Don't eagerly start the JS runtime
If you initialize the `ReactHost` in `Application.onCreate()` and never tear it down,
you'll pay RN's startup cost on every app launch even when the user never taps a card.
Prefer creating it lazily, on first tap, unless you have a specific reason to warm it up
earlier.
:::

:::note Passing the wrong shape of data
Passing only the tournament `id` and re-deriving the rest inside RN from a duplicated
in-memory list works, but misses the point of this lab — the criterion is specifically
that the **already-loaded native data** crosses the bridge as initial props. Pass the
whole `Tournament` (or at least `id`, `name`, `modality`, `format`, `status`).
:::

:::warning Back navigation double-pop
A common bug: implementing both "hardware back finishes the Activity" AND a custom
back button that also calls `finish()`, resulting in navigating back twice (skipping past
the tournament list) when the user taps the RN button. Pick one mechanism, or make sure
both funnel through the same code path.
:::

## Dig deeper

This lab is a direct, hands-on application of the Masterclass's brownfield module. If
anything above feels unclear, these sections cover the exact mechanics:

- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) —
  Android setup for New Architecture (`ReactHost`), and the three ways to host RN inside
  a native screen (full-screen, partial, or inside a native list)
- [Surfaces and Lifecycle](/trilha-masterclass/modulo-01-brownfield/surfaces-and-lifecycle) —
  `ReactHost` lifecycle, warm-start strategy, multiple surfaces in the same app
- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  Channel 1 (initial props) is exactly what this lab exercises; skim Channel 5 (calling
  RN methods from native) if you want the RN screen to expose an explicit close action

If you haven't been through the Masterclass yet, it's worth doing at least the Brownfield
module before this lab — see the [prerequisites note on the Labs page](/lab).

## Check your solution

The original template repo keeps a `lab-01-solution` branch as a reference answer key.
It is not copied into your own "Use this template" copy — check it on the source repo
if you want to compare your approach after finishing.

## Next lab

Once your RN screen round-trips correctly, move on to
[Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation), where that
placeholder becomes the real Tournament Detail screen and starts talking to the native
History and Ranking screens.

If you're curious how this same plumbing looks with a multi-bundle architecture instead
of a single JS bundle, [Lab 01-B — Brownfield Bundle Split](/rn-advanced-lab/brownfield-bundle-split)
is an optional side branch that rebuilds this exact outcome on Re.Pack + Module
Federation. It's not required before Lab 02 — either version's output works as the
starting point.
