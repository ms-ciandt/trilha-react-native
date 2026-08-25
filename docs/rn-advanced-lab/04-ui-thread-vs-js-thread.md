---
title: UI Thread vs JS Thread
---

# Lab 04 — UI Thread vs JS Thread

**Prerequisite:** [Lab 03 — Native Library Bridge](/rn-advanced-lab/native-library-bridge).
**Optional:** no.

## Context

Every match in a tournament eventually needs a score. Rather than building a brand-new
screen from scratch, this lab reuses Lab 02's Tournament Detail screen as the entry point
for a new **Match Score Entry** screen — tapping a match in the bracket/pairing list opens
it. Architecturally this is the same pattern you already know: an RN screen navigating
to another RN screen with data as props, plus the Lab 02 forward-nav pattern into native
screens still applying once scores are saved (a completed tournament should be visible in
the native History screen).

The twist in this lab isn't new plumbing — it's performance. Score entry involves live
recalculation (running standings, elimination status, ranking deltas) as the user types,
and on Fabric/JSI it's very easy to write code that *looks* fine but blocks the JS thread
long enough to visibly drop frames. This lab plants that problem on purpose and asks you
to find and fix it.

## Goal

Build the Match Score Entry screen, and diagnose + fix a JS-thread performance problem
that shows up once real interaction (typing scores, scrolling a long participant/standings
list) triggers expensive synchronous work on every keystroke or frame.

## Completion criteria

- [ ] Tapping a match in the Tournament Detail screen (from Lab 02) opens a Match Score
      Entry screen for that specific match, receiving match/participant data as props
- [ ] The screen lets the user enter a score for each side and submit it
- [ ] On submit, standings/ranking are recalculated and the result is visible without
      leaving the screen (a small "current standing" or "elimination status" preview is
      enough — this does not need to be the full native Ranking screen)
- [ ] Submitting a final match in an elimination bracket correctly reflects the
      tournament's completed status back on the native side (visible later in the native
      History screen, reusing Lab 02's forward-navigation wiring)
- [ ] You can point to a **specific** piece of code that was blocking the JS thread (not a
      vague "it felt slow") — e.g. a recalculation running on every keystroke instead of
      on submit, an unmemoized expensive derive running on every re-render, or a
      synchronous loop over the full standings on a large participant list
- [ ] You've measured the problem before fixing it (Flipper/Perf Monitor frame drops, a
      `console.time`/profiler trace, or equivalent) — not just fixed on instinct
- [ ] After the fix, the same interaction (typing scores quickly, or scrolling a
      standings list during a pending recalculation) no longer drops visible frames
- [ ] The fix is a real architectural choice (debouncing input before recalculating,
      memoizing the derived standings, moving the calculation off the render path,
      `startTransition` for non-urgent updates) — not a workaround that just hides the
      symptom (e.g. disabling an interaction while it computes)

## How to approach it

1. Build the screen first, functionally, without worrying about performance — get score
   entry, recalculation, and submit working end to end.
2. Deliberately make the recalculation "naive": run it synchronously on every keystroke,
   against the full tournament's data, with no memoization. This is what most first
   drafts look like anyway.
3. Profile it. Use the in-app Perf Monitor or Flipper's React DevTools profiler while
   typing quickly into the score field, especially with a tournament that has a
   reasonably large participant count (10+).
4. Identify exactly which function/render is the bottleneck, and why it's running more
   often (or doing more work) than it needs to.
5. Apply the smallest fix that addresses the actual cause — this is a good place to reach
   for `useMemo`/`useCallback` correctly (not everywhere, just where the profiler pointed),
   debouncing, or `startTransition` if the recalculation can be deprioritized relative to
   the text input responding instantly.
6. Re-profile to confirm frames stopped dropping — this closes the loop the same way you
   opened it.

## Common pitfalls

:::warning Fixing without measuring first
It's easy to guess wrong about what's slow. A `useMemo` added to the wrong function does
nothing for frame drops caused by an unmemoized child re-rendering. Profile first, form a
specific hypothesis, then fix — reversing that order wastes time and this lab's whole
point is the diagnosis step.
:::

:::note The JS thread is not the only thread that can be blocked
On the New Architecture, Fabric's rendering has its own thread, and it's possible to
create jank through excessive host-view work (deeply nested layouts recalculating) rather
than JS-thread blocking specifically. If your profiling shows the JS thread is idle but
frames still drop, look at layout/render complexity, not just JS logic.
:::

:::warning Debouncing everything as a reflex
Debouncing the recalculation is a legitimate fix, but debouncing the *text input itself*
makes typing feel laggy — the input must stay instantly responsive; only the expensive
derived work (standings, elimination check) should be delayed or deferred.
:::

## Dig deeper

- [Performance](/trilha-masterclass/modulo-04-performance-cicd/performance) — the general
  vocabulary for this lab: what "the JS thread" means on the New Architecture, and the
  standard toolbox (memoization, batching, `startTransition`) for keeping it unblocked
- [Profiling and Renders](/trilha-masterclass/modulo-04-performance-cicd/profiling-and-renders) —
  how to actually read a profiler trace and tell a wasted re-render from a genuinely
  expensive one — read this before you start guessing at fixes

## Check your solution

The `lab-04-solution` reference branch on the source repo includes the intentionally
naive version *and* the fixed version as separate commits, so you can diff exactly what
changed and why, once you've done your own diagnosis first.

## Next lab

[Lab 05 — Godot Integration](/rn-advanced-lab/godot-integration) is optional — a deeper
brownfield exercise embedding a Godot game view alongside RN and native screens in the
same app. Everything required for the core lab track ends here at Lab 04.
