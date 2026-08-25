---
title: Godot Integration
---

# Lab 05 — Godot Integration (optional)

**Prerequisite:** [Lab 04 — UI Thread vs JS Thread](/rn-advanced-lab/ui-thread-vs-js-thread).
**Optional:** yes — the core lab track (01–04) is complete without this one.

## Context

By Lab 04 the app can create tournaments, play out matches, and track standings and
rankings end to end, all through native and React Native screens talking to each other.
This lab adds something different: a celebration mini-game, built in **Godot**, that
launches when a tournament's final match is decided.

Godot is not React Native and not part of the Android SDK's usual toolkit — embedding it
means treating it the same way you'd treat any third-party native surface: something the
app hosts, hands data to, and gets a result back from, using the same brownfield
communication instincts from Labs 01–02, just with a different native runtime on the
other side of the bridge instead of plain Kotlin views.

This lab is optional specifically because it introduces a new toolchain (Godot, GDScript
or its C# bindings, the Godot Android export template) on top of everything else — do it
if you want the extra depth, skip it if RN ↔ native interop is what you came here for.

## Goal

When a tournament's final match is submitted (from Lab 04's Match Score Entry screen),
launch an embedded Godot view showing a short victory-celebration mini-game, let the user
interact with it, and return a result back to the app when it's done.

## Completion criteria

- [ ] A Godot project (even a minimal one — a podium scene, confetti, a "tap to
      continue" interaction) is embedded into the Android app as a native view/surface
- [ ] Submitting the final match of a tournament (single-elimination or swiss) in Lab 04's
      Match Score Entry screen triggers this Godot view to open, passing at minimum the
      winner's name into Godot
- [ ] The winner's name (or another piece of match data) is visibly used inside the Godot
      scene — not hardcoded — proving data actually crossed into the Godot runtime
- [ ] The user can interact with the mini-game (a tap, a button, a simple animation
      trigger) rather than just watching a static screen
- [ ] When the mini-game ends (user dismisses it, or it completes on its own), control
      returns to the RN/native app in a clean state — no orphaned Godot process, no
      inability to navigate afterward
- [ ] At least one piece of information flows back out of Godot into the app (e.g. "user
      finished watching," or a score/interaction result from the mini-game), demonstrating
      two-way communication, not just a one-way launch

## How to approach it

1. Get a bare Godot Android export running standalone first, outside the app, to confirm
   your toolchain (Godot version, Android export template, NDK requirements) works before
   integrating anything.
2. Embed the exported Godot Android library into the existing native project the same way
   you'd embed any native Android library module — as a view/Activity/Fragment the app can
   host.
3. Decide the data contract for "app → Godot": the simplest option is passing the winner's
   name as a launch argument/Bundle extra, similar to how Lab 01 passed tournament data
   into RN.
4. Decide the data contract for "Godot → app" for the return trip — Godot's Android
   plugin/singleton mechanism can call back into JVM code, which can then notify RN the
   same way the Lab 02 navigation bridge did.
5. Keep the mini-game itself intentionally small — a podium, a name label, one interactive
   element. The interop is the point of this lab, not game design.

## Common pitfalls

:::warning Treating Godot as "just another WebView"
Godot's Android integration has its own lifecycle and threading model — it isn't a drop-in
`WebView`. Budget real time for getting the export template and embedding right before
worrying about the celebration content itself.
:::

:::note Reuse what you already know about cross-runtime communication
The shape of this problem (native passes data in via a bundle/props, gets a result back
via a callback/native module) is the same shape as Labs 01 and 02 — if you find yourself
inventing a completely new communication pattern, it's worth first checking whether the
brownfield-communication approach you already used elsewhere in this app applies here
too.
:::

## Dig deeper

There's no dedicated Godot module in the Masterclass trail — this lab intentionally goes
beyond the course's core RN content. The closest conceptual parallel is:

- [Setup and Embedding](/trilha-masterclass/modulo-01-brownfield/setup-and-embedding) —
  the general pattern of embedding a foreign runtime inside a native Android app, which is
  exactly what you're doing here with Godot instead of RN
- [Communication and Navigation](/trilha-masterclass/modulo-01-brownfield/communication-and-navigation) —
  the two-way data flow model to adapt for the Godot ↔ native leg of this lab

For the Godot-specific pieces (export templates, GDScript/Android plugin APIs), the
official Godot documentation is the right reference — this course doesn't duplicate it.

## Check your solution

A `lab-05-solution` reference branch exists on the source repo for comparison, though
given this lab's open-ended nature, there's more than one valid way to structure the
Godot embedding — treat it as one example, not the only correct answer.

## Wrapping up

This is the last lab in the track. If you've completed Labs 01–04 (Lab 05 optional), you
have hands-on experience with every core brownfield pattern this course covers: embedding
RN into an existing native app, bidirectional native ↔ RN navigation, building a real
TurboModule, and diagnosing a JS-thread performance problem with evidence instead of
guesswork. Head back to the [Labs overview](/lab) to review your progress.
