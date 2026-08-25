---
title: Brownfield Navigation
---

# Lab 02 — Brownfield Navigation

**Prerequisite:** [Lab 01 — Brownfield Bootstrap](/rn-advanced-lab/brownfield-bootstrap).
**Optional:** no.

## Context

Lab 01 proved the plumbing: tapping a tournament card opens a React Native screen that
receives the tournament's data and can navigate back. That screen currently just prints
a name — it isn't useful yet.

Meanwhile, the native app already ships two more screens: **History** (a list of
finished tournaments, `HistoryScreen.kt`) and **Global Ranking** (`RankingScreen.kt`, a
points table across all participants). Both exist today, pre-built, native, reachable
from the tournament list's top bar. Under the brownfield premise, these are "screens
that were already in production" — your RN work needs to fit *into* that app, including
navigating forward into those two existing native destinations.

This lab turns Lab 01's placeholder into the real Tournament Detail screen, and extends
the native `NavHost` graph so RN can push forward into native territory — not just
backward to where it came from.

## Goal

Replace the Lab 01 placeholder with a real **Tournament Detail** React Native screen, and
make it possible to navigate from that RN screen into the native History and Global
Ranking screens (RN → native, not native → RN this time).

## Completion criteria

- [ ] The RN screen from Lab 01 is replaced with a real Tournament Detail screen, still
      launched from tapping a `TournamentCard` and still receiving the tournament as
      initial props
- [ ] The screen shows, at minimum: tournament name, modality, format
      (single-elimination / round-robin / swiss), status, and the participant list
- [ ] If the tournament's format is single-elimination or swiss, the bracket/pairing
      structure is rendered (even a simple nested list of rounds/matches is fine — visual
      polish is not the point of this lab)
- [ ] The purple `"REACT NATIVE SCREEN"` badge from Lab 01 is still present
- [ ] The screen has a button/action that navigates to the native **History** screen
      without going back to the tournament list first (i.e. it's a forward push onto the
      existing native `NavHost` graph in `Routes.kt`, not a `finish()` + reopen)
- [ ] The screen has a second button/action that does the same for **Global Ranking**
- [ ] From either native screen, the platform back button returns to the RN Tournament
      Detail screen (not all the way back to the native tournament list) — the navigation
      stack must be a real stack, not a set of independent one-off screens
- [ ] No duplicate `OriginBadge`/purple-banner screens are pushed on top of each other if
      the user mashes the navigation buttons repeatedly

## How to approach it

1. Look at `Routes.kt` and `MainActivity.kt`'s `CiandtChampionshipsApp` composable from
   Lab 01 (or from the template, if you haven't touched navigation yet) — the native
   `NavHost` already has `TOURNAMENT_LIST`, `HISTORY`, and `RANKING` destinations.
2. The RN surface you built in Lab 01 lives outside that `NavHost` (a separate Activity
   or a Fragment pushed some other way). Decide how forward navigation from RN reaches
   `HISTORY`/`RANKING`: the cleanest option is exposing a small native module
   (`NavigationBridge` or similar) with two methods (`openHistory()`, `openRanking()`)
   that the RN screen calls, which in turn push onto the *same* `NavHostController`
   instance already driving the native graph.
3. Build out the participant list and bracket rendering using the tournament data you
   already receive as initial props — no new native data is needed for this lab, reuse
   what Lab 01 wired up.
4. Test the back-stack behavior explicitly: RN detail → native History → back → should
   land on RN detail, not the native list.

## Common pitfalls

:::warning Two navigation systems, one mental stack
Because RN doesn't live inside the native `NavHost`, it's easy to end up with two
independent back stacks that don't agree with each other. Before writing code, sketch
the navigation stack you want on paper: `TournamentList → [RN] Detail → History` should
behave as a single linear stack from the user's point of view, even though the
implementation is split across two navigation systems.
:::

:::note Bracket rendering can stay simple
Don't spend this lab's time on bracket visuals (lines connecting matches, seeding logic,
etc.) — a plain nested list of rounds and pairings that's readable is enough. Visual
polish is explicitly out of scope; the criterion is "the structure is there and correct."
:::

:::warning Passing a new native module bridge both ways
If your `NavigationBridge` module also needs to notify RN of something (e.g. "user came
back from History"), remember TurboModules on the New Architecture use
`TurboModuleRegistry.getEnumerator`-style codegen with a `.spec.ts` file — don't fall back
to a legacy `NativeModules` implementation just because it's marginally less setup for a
one-off method call.
:::

## Dig deeper

- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  covers exactly this scenario (RN pushing into native destinations) under "Channel 5:
  calling native methods from RN," and the broader trade-offs of split navigation stacks
- [JSI — The JavaScript Interface](/trilha-masterclass/modulo-02-jsi-fabric/jsi-javascript-interface) —
  background on why a synchronous native module call (like `openHistory()`) is cheap on
  the New Architecture compared to the old async bridge, if you're curious about the
  "why" behind the recommended approach

## Check your solution

Compare your navigation stack behavior against the `lab-02-solution` reference branch on
the source repo once you're done.

## Next lab

Continue to
[Lab 03 — Native Library Bridge](/rn-advanced-lab/native-library-bridge), where you'll
build a TurboModule from scratch to generate tournament brackets natively and call it
from a new Create Tournament RN screen.
