---
title: Brownfield Bundle Split
---

# Lab 01-B — Brownfield Bundle Split

**Prerequisite:** [Lab 01 — Brownfield Bootstrap](/rn-advanced-lab/brownfield-bootstrap).
**Optional:** yes — this is an alternative take on Lab 01's plumbing, not a required step
toward Lab 02.
**Template:** same as Lab 01 —
[`ciandt-championships-android-template`](https://github.com/gbonin-ciandt/ciandt-championships-android-template),
starting from a fresh copy of the base template again, not from your Lab 01 branch.

## Context

Lab 01 solved the plumbing problem with the simplest correct architecture: one JS bundle,
one `AppRegistry.registerComponent` surface. That is the right default for a small app —
see [Bundle Strategy](/trilha-masterclass/modulo-01-brownfield/bundle-strategy) for why.

But once an app has many RN surfaces owned by different teams, or the JS bundle has grown
large enough to hurt cold start on low-end Android, teams split it into a **shared-core**
bundle plus **N service bundles**, wired through Module Federation instead of a single
Metro bundle. This lab rebuilds Lab 01's exact same user-facing outcome on that
architecture, so you can compare the two directly.

## Goal

Reproduce Lab 01's behavior — tapping a tournament card opens an RN placeholder screen
with the purple badge and the tournament name — but built as:

1. A **shared-core** bundle carrying the RN runtime glue and a shared `OriginBadge`-style
   component,
2. A separate **tournament-detail service bundle** that is the remote consumed by the
   shared core,
3. Wired through [Re.Pack](https://re-pack.dev/) with Module Federation, `react` and
   `react-native` configured as shared singletons.

## Completion criteria

- [ ] Re.Pack replaces Metro as the bundler for this project
- [ ] Two distinct output bundles exist after building: a shared-core/host bundle and a
      tournament-detail remote bundle — confirm this by inspecting the build output, not
      just by trusting the config
- [ ] `react` and `react-native` are configured as shared singletons in the Module
      Federation config on both sides — confirm at runtime there is only one React
      instance (no duplicate-instance warnings, no broken context)
- [ ] The tournament-detail remote bundle is fetched/evaluated lazily — only after the
      first tap, not during cold start (the same lazy principle Lab 01 required, now
      enforced at the bundle level too)
- [ ] Functional behavior matches Lab 01 exactly: purple `"REACT NATIVE SCREEN"` badge,
      tournament name received via initial props, clean back navigation
- [ ] You can rebuild the tournament-detail remote bundle on its own, without rebuilding
      or redeploying the shared-core bundle
- [ ] You compare the per-bundle output sizes against Lab 01's single bundle and write
      down what you observe — "no meaningful difference at this app's size" is a valid,
      expected finding here (see the pitfall below)

## How to approach it

1. Start from a fresh copy of the template — don't reuse your Lab 01 branch, since the RN
   dependency wiring changes shape (Re.Pack instead of Metro).
2. Install and configure Re.Pack in place of Metro; set up two Rspack configs — one for
   the shared-core/host, one for the tournament-detail remote.
3. Mark `react` and `react-native` as `shared: { singleton: true, eager: true }` in both
   configs. This is the piece that prevents two separate React instances from loading.
4. Move the purple badge component into the shared-core bundle, export it, and consume it
   from the remote's `TournamentDetailScreen`.
5. Wire the native side the same way as Lab 01 (`ReactHost`/`RCTHost` + a surface), but
   point the bundle loader at the host bundle first, then resolve the remote container on
   demand when the surface is created.
6. Build both bundles and inspect the output manifests/sizes to confirm the split
   actually happened — a shared dependency that leaked into both bundles is a silent
   failure mode, not a build error.

## Common pitfalls

:::warning Expecting a dramatic performance win in this app
The Championships app is small — three to five screens. Splitting it into multiple
bundles will very likely **not** produce a measurable startup or memory improvement here;
the point of this lab is the mechanics (Module Federation wiring, the shared-singleton
config, independent builds), not a benchmark win. If you want to actually see the
performance difference, try artificially bloating the shared-core or service bundle with
a couple of heavy third-party libraries first, then compare cold-start timing before and
after — that is optional and outside this lab's completion criteria.
:::

:::warning Duplicate React instances
If `react`/`react-native` aren't marked `singleton: true` on both the host and the remote,
you can end up with two separate React copies loaded at runtime. This usually shows up as
"Invalid hook call" errors or silently broken context, not a clean crash. If something in
the remote's component tree behaves strangely, check the shared config first.
:::

:::note No solution branch yet
Unlike the other labs, `ciandt-championships-android-template` does not currently have a
`lab-01b-solution` reference branch — this is a newer, optional lab. Compare notes with
peers or an instructor instead.
:::

## Dig deeper

- [Bundle Strategy](/trilha-masterclass/modulo-01-brownfield/bundle-strategy) — the
  trade-off table and decision guidance behind this lab
- [Re.Pack documentation](https://re-pack.dev/) — Module Federation setup for React
  Native
- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) —
  the `ReactHost`/`RCTHost` wiring, unchanged by this lab

## Check your solution

No reference `lab-01b-solution` branch exists yet on the template repo. Compare your
approach with peers or an instructor instead.

## Next lab

This is a side branch, not a dependency for what follows. Return to
[Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation), which builds on
Lab 01's plumbing — either version works, since the user-facing behavior is identical.
