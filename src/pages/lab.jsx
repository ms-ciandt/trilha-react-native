import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './lab.module.css';

const LABS = [
  {
    id: '01',
    title: 'Brownfield Bootstrap',
    description: 'Embed React Native into the existing native Android + iOS tournament list, so tapping a card opens an RN screen.',
    goal: 'Tapping a tournament card in the native list opens a React Native screen that receives that tournament via props, renders the purple "REACT NATIVE SCREEN" badge, and can navigate back to the native list.',
    concepts: ['Brownfield', 'Android/iOS integration', 'RN initialization', 'Build organization'],
    outcome: 'A working native ↔ RN round trip — no real detail content yet, just the plumbing proven end to end.',
    prerequisite: null,
    optional: false,
    path: '/rn-advanced-lab/brownfield-bootstrap',
  },
  {
    id: '02',
    title: 'Brownfield Navigation',
    description: 'Build the real React Native Tournament Detail screen — bracket view for elimination, table + fixtures for round-robin/swiss — and bridge forward into the native History and Global Ranking screens.',
    goal: 'From the RN detail screen, wire forward navigation into the pre-built native History and Ranking screens, exercising the RN → native direction of interop.',
    concepts: ['Brownfield navigation', 'Navigation stack', 'Lifecycle', 'Android back', 'Native ↔ RN'],
    outcome: 'A React Native detail screen that renders real tournament data and hands off cleanly to existing native screens.',
    prerequisite: '01',
    optional: false,
    path: '/rn-advanced-lab/brownfield-navigation',
  },
  {
    id: '03',
    title: 'Native Library Bridge',
    description: 'Build a React Native Create Tournament form backed by a native bracket/pairing-generation TurboModule (single-elimination and Swiss).',
    goal: 'Create the TurboModule contract needed to generate real brackets/pairings from native code, replacing the hardcoded mock data, without rewriting the algorithm in JS.',
    concepts: ['Native Modules', 'TurboModules / JSI', 'TypeScript contracts', 'Async errors', 'Platform differences'],
    outcome: 'A React Native form that creates a tournament by calling the existing native library, safely and testably.',
    prerequisite: '02',
    optional: false,
    path: '/rn-advanced-lab/native-library-bridge',
  },
  {
    id: '04',
    title: 'UI Thread vs JS Thread',
    description: 'Investigate and fix jank on the Match Score Entry screen (built on top of Lab 02\'s detail screen) caused by heavy recompute on every score update.',
    goal: 'Move the standings recalculation off the JS thread and compare execution before/after, with measurable jank reduction.',
    concepts: ['Performance', 'Frame rate', 'JS thread', 'UI thread', 'Reanimated / worklets', 'Jank measurement'],
    outcome: 'A smooth live scoreboard even under heavy update load, with before/after benchmark evidence.',
    prerequisite: '03',
    optional: false,
    path: '/rn-advanced-lab/ui-thread-vs-js-thread',
  },
  {
    id: '05',
    title: 'Godot Integration',
    description: 'Launch a victory-celebration mini-game in Godot when a tournament final is decided.',
    goal: 'Explore communication and lifecycle between React Native and Godot, delivering an interactive experience.',
    concepts: ['RN ↔ Godot', 'Lifecycle', 'Event / data communication', 'Result return to RN'],
    outcome: 'React Native launches the Godot celebration, the user interacts, the result returns to the platform.',
    prerequisite: '04',
    optional: true,
    path: '/rn-advanced-lab/godot-integration',
  },
];

const RECOMMENDED_TRAILS = [
  {
    label: 'React Native Masterclass',
    to: '/trilha-masterclass/modulo-00-overview/course-overview',
    note: 'Brownfield · TurboModules · Fabric',
    lightColor: '#8CB3D9',
    darkColor: '#B4DCFA',
  },
  {
    label: 'iOS native trail',
    to: '/trilha-ios/modulo-fundamentos/ios-project-setup',
    note: 'Swift · SwiftUI patterns',
    lightColor: '#690037',
    darkColor: '#FAB9FF',
  },
  {
    label: 'Android native trail',
    to: '/trilha-android/modulo-compose-para-rn/composable-vs-component',
    note: 'Kotlin · Jetpack Compose patterns',
    lightColor: '#1e8a55',
    darkColor: '#3ddc84',
  },
];

const EMPTY_STARTED = { '01': false, '02': false, '03': false, '04': false, '05': false };

function getLabState(labId, started) {
  if (labId === '01') return started['01'] ? 'started' : 'unlocked';
  const prevId = String(parseInt(labId, 10) - 1).padStart(2, '0');
  if (!started[prevId]) return 'locked';
  return started[labId] ? 'started' : 'unlocked';
}

function GridBackground() {
  return <div className={styles.grid} aria-hidden="true" />;
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16v4H4V4zm0 6h7v10H4V10zm9 0h7v10h-7V10z" />
    </svg>
  );
}

function RecommendedTrails() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <div className={styles.prereqTrails}>
      {RECOMMENDED_TRAILS.map(({ label, to, note, lightColor, darkColor }) => {
        const c = isDark ? darkColor : lightColor;
        return (
          <Link
            key={label}
            to={to}
            className={styles.prereqChip}
            style={{ color: c, borderColor: `color-mix(in srgb, ${c} 38%, transparent)` }}
          >
            <span className={styles.prereqChipLabel}>{label}</span>
            {note && <span className={styles.prereqChipNote}>{note}</span>}
          </Link>
        );
      })}
    </div>
  );
}

function LabCard({ lab, state, onStart }) {
  const isLocked = state === 'locked';
  const isStarted = state === 'started';

  const cardClass = [
    styles.labCard,
    isLocked && styles.labCardLocked,
    isStarted && styles.labCardStarted,
    lab.optional && styles.labCardOptional,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className={styles.labGlow} />

      <div className={styles.labCardHeader}>
        <span className={styles.labNumber}>Lab {lab.id}</span>
        <div className={styles.labBadgeRow}>
          {lab.optional && (
            <span className={styles.optionalBadge}>Optional</span>
          )}
          {isStarted && (
            <span className={styles.startedBadge}>
              <CheckIcon />
              Started
            </span>
          )}
          {isLocked && (
            <span className={styles.lockedBadge}>
              <LockIcon />
              Locked
            </span>
          )}
        </div>
      </div>

      <h2 className={styles.labTitle}>{lab.title}</h2>
      <p className={styles.labDesc}>{lab.description}</p>

      <div className={styles.conceptsRow}>
        {lab.concepts.map((concept) => (
          <span key={concept} className={styles.conceptTag}>{concept}</span>
        ))}
      </div>

      <div className={styles.outcomeBox}>
        <span className={styles.outcomeLabel}>Expected outcome</span>
        <span className={styles.outcomeText}>{lab.outcome}</span>
      </div>

      <div className={styles.labAction}>
        {isLocked ? (
          <span className={styles.requiresText}>
            <LockIcon />
            Requires Lab {lab.prerequisite}
          </span>
        ) : (
          <Link className={styles.startBtn} to={lab.path} onClick={() => onStart(lab.id)}>
            {isStarted ? `Continue Lab ${lab.id}` : `Start Lab ${lab.id}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Lab() {
  const [started, setStarted] = useState(EMPTY_STARTED);

  useEffect(() => {
    try {
      const s = {};
      LABS.forEach(({ id }) => {
        s[id] = localStorage.getItem(`rn_lab_${id}_started`) === 'true';
      });
      setStarted(s);
    } catch {}
  }, []);

  function handleStart(labId) {
    try {
      localStorage.setItem(`rn_lab_${labId}_started`, 'true');
    } catch {}
    setStarted((prev) => ({ ...prev, [labId]: true }));
  }

  function handleReset() {
    try {
      LABS.forEach(({ id }) => localStorage.removeItem(`rn_lab_${id}_started`));
    } catch {}
    setStarted(EMPTY_STARTED);
  }

  const anyStarted = Object.values(started).some(Boolean);

  return (
    <Layout
      title="RN Advanced Lab"
      description="Five sequential hands-on challenges to put your advanced React Native skills to the test."
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <div className={styles.heroBadge}>RN Advanced Lab</div>
          <h1 className={styles.heroTitle}>Practice in the Field</h1>
          <p className={styles.heroSubtitle}>
            Five hands-on challenges to put your advanced React Native skills to the test.
            Each lab builds on the previous one — complete them in order.
          </p>
          <p className={styles.heroThemeNote}>
            All five labs are built around the same running example: CI&amp;T Championships,
            an internal app for organizing office tournaments — soccer, pool, Mortal Kombat,
            FIFA, and anything else a group wants to run a bracket for.
          </p>
        </header>

        <section className={styles.prereqBox}>
          <div className={styles.prereqGlow} />
          <div className={styles.prereqHeader}>
            <span className={styles.prereqIcon}><ShieldCheckIcon /></span>
            <span className={styles.prereqTitle}>Recommended before starting</span>
          </div>
          <p className={styles.prereqDesc}>
            These labs assume familiarity with native development and React Native core concepts.
            Complete at least one native trail and the Masterclass to get the most out of each challenge.
          </p>
          <RecommendedTrails />
        </section>

        <section className={styles.prereqBox}>
          <div className={styles.prereqGlow} />
          <div className={styles.prereqHeader}>
            <span className={styles.prereqIcon}><TemplateIcon /></span>
            <span className={styles.prereqTitle}>Getting your template</span>
          </div>
          <p className={styles.prereqDesc}>
            Each platform has a starter repo on GitHub with the native Lab 01 base already
            working (Android is ready; iOS is coming later). You don&apos;t re-template for
            every lab — you get your copy once and evolve it through all five.
          </p>
          <ol className={styles.templateSteps}>
            <li>
              Click <strong>Use this template</strong> on{' '}
              <a
                href="https://github.com/gbonin-ciandt/ciandt-championships-android-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                ciandt-championships-android-template
              </a>{' '}
              to create your own copy under your GitHub account.
            </li>
            <li>Clone your copy and open it in Android Studio — the native tournament list from Lab 01 already runs out of the box, along with two other native screens, History and Global Ranking, that already exist because the brownfield premise is that this app is already in production. Labs 02+ bridge React Native screens forward into those existing native screens.</li>
            <li>Work through Labs 01–05 directly inside that same copy, committing as you complete each one. Your commit history becomes your progress log.</li>
            <li>Stuck? The original template keeps solution branches (<code>lab-02-solution</code>, <code>lab-03-solution</code>, ...) as a reference answer key — they aren&apos;t copied into your fork automatically, so check them on the source repo if needed.</li>
          </ol>
        </section>

        <section className={styles.labsGrid}>
          {LABS.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              state={getLabState(lab.id, started)}
              onStart={handleStart}
            />
          ))}
        </section>

        {anyStarted && (
          <button className={styles.resetBtn} onClick={handleReset}>
            Reset lab progress
          </button>
        )}
      </main>
    </Layout>
  );
}
