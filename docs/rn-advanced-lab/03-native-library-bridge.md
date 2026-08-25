---
title: Native Library Bridge
---

# Lab 03 — Native Library Bridge

**Prerequisite:** [Lab 02 — Brownfield Navigation](/rn-advanced-lab/brownfield-navigation).
**Optional:** no.

## Context

So far the app only reads existing tournaments — nobody can create one from the RN side.
Creating a tournament also isn't just "save a form to a list": once you know the
participants and the format (single-elimination, round-robin, or swiss), you need to
generate the actual bracket or pairing schedule, including the odd-participant-count
edge cases (byes in single-elimination, an extra "rest" round in round-robin).

That generation logic is exactly the kind of thing worth writing once, natively, and
reusing — it's pure computation, has no UI, and benefits from strong typing on both
sides of the bridge. This lab is where TurboModules stop being something you've only
read about and become something you build.

## Goal

Build a **Create Tournament** React Native screen, backed by a native TurboModule that
takes a participant list and a format and returns a generated bracket/schedule — computed
natively, not in JavaScript.

## Completion criteria

- [ ] A new RN screen (Create Tournament) collects: tournament name, modality, format
      (single-elimination / round-robin / swiss), and a list of participant names (add/
      remove entries, at least 2 required)
- [ ] A TurboModule (with a proper `.spec.ts` and codegen — no legacy `NativeModules`) is
      implemented on the Android side that exposes a method taking the participant list
      and format, returning the generated bracket structure
- [ ] The native module correctly handles **single-elimination** with a non-power-of-2
      participant count (byes are assigned, not left as errors or crashes)
- [ ] The native module correctly handles **round-robin** (every participant plays every
      other participant exactly once; an odd count produces one "rest" per round, not a
      crash)
- [ ] The native module correctly handles **swiss** pairing for round 1 (subsequent
      rounds' pairing depends on results, which don't exist yet at creation time — round 1
      only is enough for this lab)
- [ ] The generated bracket is displayed back in the RN screen before/after submission
      (reusing the rendering approach from Lab 02's Tournament Detail screen is
      encouraged, not required)
- [ ] Submitting the form creates a real tournament that shows up in the native
      `TournamentListScreen`'s list (persisted through whatever the existing
      `TournamentRepository` uses — in-memory is fine if that's what the repo already
      does)
- [ ] The TurboModule call is exercised with a type-mismatched or malformed input at least
      once during development (e.g. an empty participant list) and fails predictably
      (a thrown/rejected error the RN side can catch), not with a native crash

## How to approach it

1. Write the `.spec.ts` first. Decide the shape of the return value (a nested structure
   of rounds → matches → participant pairs works for all three formats) before writing any
   Kotlin — this keeps codegen honest about what both sides agree the contract is.
2. Implement the three generation algorithms in Kotlin as plain functions first (testable
   without RN in the loop at all), then wrap them in the TurboModule class.
3. Wire the module into the existing native module package/registration the RN embedding
   from Lab 01 already set up.
4. Build the Create Tournament form in RN, call the module, render the result.
5. Persist the created tournament through the same repository the native list screen
   reads from, so it appears without a manual refresh mechanism.

## Common pitfalls

:::warning Generating brackets in JavaScript "for now"
It's tempting to prototype the bracket algorithm in JS first since it's faster to iterate
on, and never get around to porting it. The criterion is specifically that the
*generation* happens natively — if you find yourself with working JS logic, treat it as
your spec for the Kotlin port, not as the final implementation.
:::

:::note Supported TurboModule types
Nested arrays of objects (rounds → matches → pairs) are supported by codegen, but the
exact shape needs to be expressed correctly in the `.spec.ts` (typed objects, not `any`).
Check the supported-types reference linked below before designing an overly creative
return shape.
:::

:::warning Odd participant counts are not edge cases you can skip
Every one of the three formats has a real, common odd-count scenario (5 people signing up
for a single-elimination bracket is completely normal in an office tournament). Test with
an odd count for every format before considering this lab done, not just the even/happy
path.
:::

## Dig deeper

- [What Is a TurboModule](/trilha-masterclass/modulo-03-turbomodules/what-is-turbomodules) —
  the mental model for what you're building in this lab
- [Specs in TypeScript](/trilha-masterclass/modulo-03-turbomodules/specs-typescript) — how
  to write the `.spec.ts` this lab needs first
- [Codegen](/trilha-masterclass/modulo-03-turbomodules/codegen) — what actually happens
  between writing the spec and having a callable native method
- [Supported Types](/trilha-masterclass/modulo-03-turbomodules/supported-types) — read this
  before finalizing your bracket's return shape
- [Tests and Mocks](/trilha-masterclass/modulo-03-turbomodules/tests-mocks) — useful if you
  want to unit-test the RN side without running the real native module every time

## Check your solution

The `lab-03-solution` reference branch on the source repo includes one worked
implementation of all three formats — useful to compare edge-case handling against,
especially for swiss round-1 pairing, which has more than one defensible approach.

## Next lab

Continue to
[Lab 04 — UI Thread vs JS Thread](/rn-advanced-lab/ui-thread-vs-js-thread), where you'll
build a Match Score Entry screen that reuses Lab 02's detail screen and diagnose a
real JS-thread performance problem.
