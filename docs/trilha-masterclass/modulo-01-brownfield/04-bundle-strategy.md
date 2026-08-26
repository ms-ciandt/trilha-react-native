---
title: Bundle Strategy
---

## 9. Bundle Strategy: Single Bundle vs. Multi-Bundle

Every example so far in this module assumes one JS bundle behind every surface — Section
4 explicitly said "any number of surfaces from the same JS bundle." That default is
correct for most brownfield apps. This section covers when it stops being correct, and
what the alternative looks like.

### The single-bundle default (recap)

One `index.js` registers every RN surface in the app via `AppRegistry.registerComponent`.
`ReactHost` / `RCTHost` loads that one bundle once, and every surface — Checkout, Feed,
Profile, whatever else — is a component tree defined inside it. Simple to build (Metro
out of the box), simple to reason about, simple to version: one bundle, one release.

### Where it breaks down at scale

The single bundle grows monotonically as features are added. Every surface pays the
parse, compile, and memory cost of the **entire** bundle, whether or not the user ever
opens most of those features:

- **Cold start cost.** Hermes has to load and initialize bytecode for the whole bundle
  before the first surface can render, even if that surface only needs a fraction of it.
  On a low or mid-tier Android device, a bundle that has grown into the multiple-MB range
  measurably adds to first-surface latency.
- **Sustained memory footprint.** Everything registered in the bundle stays resident in
  the same JS heap, for the lifetime of the `ReactHost`, regardless of which surfaces are
  actually mounted.
- **Organizational cost.** If three teams each own a different RN surface, they all ship
  inside the same artifact. One team's change means rebuilding and re-releasing
  everyone's code.

None of this matters for a small app with one team and a handful of surfaces — the
bundle simply never gets big enough to notice. It matters once an app reaches super-app
scale: many teams, many surfaces, a bundle that has already grown past what a low-end
device parses comfortably.

### Mechanism 2: service bundles + shared core

The alternative splits the single bundle into:

- **One shared-core bundle** — the RN runtime glue, design-system components, and common
  utilities every surface needs. Loaded once.
- **N service bundles** — one per feature or team (Checkout, Feed, Profile...), each built
  and versioned independently, each referencing the shared core instead of duplicating it.

This is the same problem Module Federation solves on the web: a **host** exposes a
shared scope of dependencies, and **remotes** consume them instead of bundling their own
copies. Metro does not support this natively — there is no built-in dedupe mechanism for
modules across independently-built bundles. [Re.Pack](https://re-pack.dev/) (Callstack's
Rspack-based bundler for React Native) is the tool that brings Module Federation to RN,
replacing Metro rather than sitting on top of it.

A minimal Re.Pack Module Federation config marks the shared dependencies as singletons so
every remote resolves to the *same* React/React Native instance already loaded by the
host, instead of bundling its own:

```js
// rspack.config.mjs (shared-core / host)
import { Repack } from '@callstack/repack';
import { ModuleFederationPlugin } from '@callstack/repack/webpack';

export default {
  plugins: [
    new Repack.RepackPlugin(),
    new ModuleFederationPlugin({
      name: 'host',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }),
  ],
};
```

```js
// rspack.config.mjs (tournament-detail service bundle / remote)
import { Repack } from '@callstack/repack';
import { ModuleFederationPlugin } from '@callstack/repack/webpack';

export default {
  plugins: [
    new Repack.RepackPlugin(),
    new ModuleFederationPlugin({
      name: 'tournamentDetail',
      exposes: {
        './TournamentDetailScreen': './src/screens/TournamentDetailScreen',
      },
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }),
  ],
};
```

The service bundle is fetched and evaluated only when its surface is actually created —
so a cold start pays for the shared core plus whichever single service the user opens
first, not for every feature in the app.

### Comparison

| Dimension | Single bundle (default) | Multi-bundle (service + shared core) |
|---|---|---|
| Setup complexity | Low — Metro out of the box | Higher — Re.Pack/Rspack replaces Metro |
| Cold start cost | Pays for the whole app's JS | Pays for shared core + the one feature opened |
| Memory footprint | Grows with total features shipped | Grows with features actually opened |
| Team deploy independence | One release train for all RN surfaces | Each service bundle ships/versions on its own |
| Debugging | One source map, one call stack | Multiple source maps, cross-bundle stack traces |
| Tooling maturity | Battle-tested, RN's default path | Newer, smaller community, more manual wiring |
| Where it pays off | Small-to-mid app, one team | Many teams, or a bundle already hurting low-end cold start |

### Decision guidance

Default to the single bundle. Splitting is a cost — extra build tooling, a shared-scope
contract that has to stay correct across every remote, harder debugging — that only pays
for itself with real evidence: a measured cold-start or memory regression on your actual
low-end target devices, or a genuine organizational need for teams to deploy their RN
surfaces independently of each other. Splitting a small app's bundle "for performance"
without either of those in hand usually adds tooling complexity with no observable
payoff.

### Try it hands-on

[Lab 01-B — Brownfield Bundle Split](/rn-advanced-lab/brownfield-bundle-split) rebuilds
Lab 01's exact same outcome on this architecture, so you can compare the two directly.

### Further reading

| Resource | What it covers |
|---|---|
| [Re.Pack documentation](https://re-pack.dev/) | Module Federation setup for React Native, shared scope configuration |
| [Re.Pack on GitHub](https://github.com/callstack/repack) | Source, examples, migration notes from Metro |
| [Webpack: Module Federation concepts](https://webpack.js.org/concepts/module-federation/) | The underlying host/remote/shared-scope model Re.Pack implements for RN |
