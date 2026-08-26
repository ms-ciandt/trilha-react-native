# CI&T Championships — App Spec (RN Advanced Lab)

Reference spec for the app used as the running example across the 5 RN Advanced Lab
challenges (`docs` area does not publish this file — it exists purely to keep the lab
content, the GitHub template repo, and the labs consistent with each other).

Not implemented yet. This is the shared domain model that Labs 01–05 build toward,
one native/RN slice at a time.

## Pitch

An internal tool for CI&T employees to organize and track informal "internal
championships" — whatever a group wants to run a bracket for. One person creates a tournament, picks a format,
adds participants, and the app tracks matches, scores, and a standings table. Wins
also feed a company-wide ranking across all modalities.

## Core entities

### Tournament
| Field | Notes |
|---|---|
| `id` | |
| `name` | free text, e.g. "Championship Q3 2026" |
| `modality` | free text/tag — no fixed enum, organizer types whatever they're running |
| `format` | one of: `single-elimination` (mata-mata), `round-robin` (ida-volta), `swiss` (suíço) |
| `matchStyle` | best-of, e.g. `single`, `md3`, `md5` — relevant for versus-style modalities, optional for others |
| `participantCount` | target size, drives bracket/pairing generation |
| `pointsConfig` | `{ win: number, draw: number, loss: number }` — only meaningful for round-robin/swiss tables |
| `teamLabelsEnabled` | boolean — e.g. a modality where each participant also picks a team label |
| `status` | `upcoming` \| `in-progress` \| `finished` |
| `createdAt` | |

### Participant
| Field | Notes |
|---|---|
| `id` | |
| `tournamentId` | |
| `personId` | link to the org-wide person, so wins roll up into the global ranking |
| `displayName` | |
| `teamLabel` | optional, only when `teamLabelsEnabled` — e.g. "Brasil", "França" |

### Match
| Field | Notes |
|---|---|
| `id` | |
| `tournamentId` | |
| `round` | round/stage number, or Swiss round index |
| `participantA`, `participantB` | |
| `scoreA`, `scoreB` | per-game score; for `md3`/`md5` this is games won within the match, not raw points |
| `games` | optional array of individual game scores when `matchStyle` is md3/md5 |
| `date` | |
| `status` | `scheduled` \| `played` \| `walkover` |

### Standings row (derived, not stored)
Computed per tournament from `Match` + `pointsConfig`: participant, played, won, drawn,
lost, points, score diff. Only rendered for `round-robin`/`swiss` formats — a
`single-elimination` tournament shows the bracket instead of a table.

### Global ranking (derived, not stored)
Cross-tournament, cross-modality leaderboard per person. A person's score is the sum
of placement points from every tournament they participated in, regardless of
modality — this is the "fulano ganhou de modalidade1 e modalidade2" case: both wins add to
the same running total.

Placement points (proposed baseline, tune later):
- 1st place: `100 × sizeFactor`
- 2nd place: `60 × sizeFactor`
- 3rd place / semifinal exit: `30 × sizeFactor`
- Participation: `5` flat
- `sizeFactor = participantCount / 8` (clamped to `[0.5, 2]`) — a 4-person pool tournament
  is worth less than a 32-person company-wide bracket

## Formats, briefly

- **Single elimination (mata-mata)**: standard bracket, losers are out; needs a seeding/
  bye strategy when `participantCount` isn't a power of 2.
- **Round robin (ida-volta)**: every participant plays every other participant once
  (`ida`) or twice home/away (`ida-volta`); standings table via `pointsConfig`.
- **Swiss (suíço)**: participants are paired each round against others with a similar
  record so far (no repeat pairings when avoidable); runs a fixed number of rounds
  instead of a full round robin — used for larger pools where round robin would take
  too many rounds.
- **MD3 / MD5**: not a tournament format by itself — a match-style modifier meaning a
  single match is decided by best-of-3 or best-of-5 games (common for versus-style
  modalities).

## Screens implied (for lab framing only)

1. Tournament list (home) — **native**, pre-built, present from Lab 01
2. Create tournament (name, modality, format, match style, points config, team labels toggle) — **RN**, built in Lab 03
3. Tournament detail — bracket view (elimination) or table + fixtures (round robin/swiss) — **RN**, built in Lab 02, reused in Lab 04
4. Match score entry — **RN**, built in Lab 04 (on top of the Lab 02 detail screen)
5. History — past tournaments, drill into any of them for full match detail — **native**, pre-built (Android template ships `ui/history/HistoryScreen.kt`), not a lab deliverable
6. Global ranking (company-wide leaderboard) — **native**, pre-built (Android template ships `ui/ranking/RankingScreen.kt`), not a lab deliverable

Screens 5 and 6 are shipped pre-built and native in the Android template on purpose: the
brownfield premise is that the native app already exists in production and RN is added
feature by feature into it, so History and Global Ranking act as pre-existing native
destinations that the RN screens built in Labs 02+ navigate *into* — exercising the
RN → native direction of interop, not just native → RN.

## Native vs React Native screen labeling convention

Every screen in the app (native or RN) shows a small colored banner at the top
identifying its origin, so it's obvious during brownfield debugging which screens are
native and which are RN. Defined in the Android template's `ui/common/OriginBadge.kt`:

- **Native (Kotlin/Compose)**: green, `#14532D`, label `"NATIVE SCREEN"`
- **React Native**: purple, `#4C1D95`, label `"REACT NATIVE SCREEN"`

When Lab 01+ scaffolds RN screens, render an equivalent banner (plain `View`/`Text`,
same colors) at the top of each one for visual parity with the native side.

## How this maps to the 5 labs

| Lab | Slice of the app used | Criteria |
|---|---|---|
| 01 — Brownfield Bootstrap | RN embedded alongside the native tournament list | Tapping a tournament card opens an RN screen that receives the tapped tournament via props, renders the purple "REACT NATIVE SCREEN" badge, and can navigate back to the native list. No real detail content yet — this lab is about the RN plumbing working end to end |
| 02 — Brownfield Navigation | Real RN **Tournament Detail** screen (bracket view for elimination, table+fixtures for round-robin/swiss) | From the RN detail screen, wire forward navigation into the pre-built native `history` and `ranking` screens — the mentally logical "RN screen bridges back out to native" case that motivates the navigation lab |
| 03 — Native Library Bridge | RN **Create Tournament** form calling a native TurboModule | TurboModule generates real bracket/Swiss pairings (replacing the hardcoded `TournamentRepository` mocks) and returns them to the RN form |
| 04 — UI Thread vs JS Thread | **Match score entry** screen, reusing/extending the Lab 02 detail screen | Screen ships with a deliberate JS-thread perf problem (heavy recompute or janky input on every score update) the student must diagnose and fix |
| 05 — Godot Integration (optional) | Victory celebration / bracket-predictor mini-game after a final | Optional stretch lab, triggered from the Lab 04 match screen on completion |

History and Global Ranking are intentionally left off this table — they're pre-built
native screens (see above), not lab deliverables.
