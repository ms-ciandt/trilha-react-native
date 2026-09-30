import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import chapterData from '../data/chapter-knowledge-map.json';
import topicCoverage from '../data/topic-coverage.json';
import styles from './chapter.module.css';

const SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qvjwg5FH_kC_m1L8dWNJZqVH8k_hPfHnTHFHDOOEfGk/edit?usp=sharing';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Recurring sessions',
    desc: 'The chapter meets periodically to discuss React Native topics, real challenges, and best practices across the team.',
  },
  {
    step: '02',
    title: 'Topic prioritization',
    desc: 'The group maps out relevant topics and ranks them by priority, producing the knowledge map below.',
  },
  {
    step: '03',
    title: 'Self-reported skill level',
    desc: 'Each dev rates their own knowledge (1-5) per topic in a shared spreadsheet, restricted to CI&T employees.',
  },
  {
    step: '04',
    title: 'Feeds the trails',
    desc: 'Aggregated priority and mastery data directs devs to existing trails, and shapes which modules get expanded or created next.',
  },
];

const TRAIL_COLORS = {
  Web: { light: '#FA5A50', dark: '#FA8982' },
  Android: { light: '#2db370', dark: '#3ddc84' },
  iOS: { light: '#690037', dark: '#FAB9FF' },
  Masterclass: { light: '#8CB3D9', dark: '#B4DCFA' },
};

function GridBackground() {
  return <div className={styles.grid} aria-hidden="true" />;
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

const COVERAGE_LABELS = {
  covered: 'Already covered',
  partial: 'Partially covered',
  'not-covered': 'Not yet covered',
};

function CoverageBadge({ status }) {
  return (
    <span className={`${styles.coverageBadge} ${styles[`coverage-${status}`]}`}>
      {COVERAGE_LABELS[status]}
    </span>
  );
}

function CoverageLinks({ links }) {
  if (!links || links.length === 0) return null;
  return (
    <ul className={styles.coverageLinks}>
      {links.map((link) => (
        <li key={link.path}>
          <Link to={`/${link.path}`} className={styles.coverageLink}>
            {link.trail} · {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TrailChips({ trails }) {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  return (
    <div className={styles.trailChips}>
      {trails.map((trail) => {
        const c = TRAIL_COLORS[trail] ?? { light: '#7c3aed', dark: '#a78bfa' };
        const color = isDark ? c.dark : c.light;
        return (
          <span
            key={trail}
            className={styles.trailChip}
            style={{
              color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            }}
          >
            {trail}
          </span>
        );
      })}
    </div>
  );
}

function TopicRow({ topic }) {
  const hasData = topic.avgScore !== null;
  const coverage = topicCoverage.topics[topic.topic];
  return (
    <div className={styles.topicRow}>
      <span className={styles.topicPriority}>{topic.priority}</span>
      <div className={styles.topicMain}>
        <div className={styles.topicHeader}>
          <h3 className={styles.topicTitle}>{topic.topic}</h3>
          <TrailChips trails={topic.trails} />
        </div>
        <p className={styles.topicDesc}>{topic.description}</p>
        <div className={styles.masteryBox}>
          {hasData ? (
            <>
              <div className={styles.masteryBar}>
                <div
                  className={styles.masteryFill}
                  style={{ width: `${topic.masteryPercent}%` }}
                />
              </div>
              <span className={styles.masteryLabel}>
                {topic.masteryPercent}% group mastery · avg {topic.avgScore.toFixed(1)}/5
              </span>
            </>
          ) : (
            <span className={styles.masteryPending}>Awaiting responses</span>
          )}
        </div>
        {coverage && (
          <div className={styles.coverageBox}>
            <CoverageBadge status={coverage.status} />
            <CoverageLinks links={coverage.links} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chapter() {
  return (
    <Layout
      title="RN Chapter"
      description="A recurring space to discuss React Native topics, challenges, and best practices — and a knowledge map that feeds the course trails."
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <div className={styles.heroBadge}>Community</div>
          <h1 className={styles.heroTitle}>React Native Chapter</h1>
          <p className={styles.heroSubtitle}>
            A recurring space for the team to discuss React Native topics, real challenges,
            and best practices — separate from the course, but feeding directly back into it.
          </p>
        </header>

        <section className={styles.howItWorks}>
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className={styles.howCard}>
              <span className={styles.howStep}>{step}</span>
              <h3 className={styles.howTitle}>{title}</h3>
              <p className={styles.howDesc}>{desc}</p>
            </div>
          ))}
        </section>

        <section className={styles.knowledgeMapSection}>
          <div className={styles.knowledgeMapHeader}>
            <span className={styles.knowledgeMapIcon}><UsersIcon /></span>
            <h2 className={styles.knowledgeMapTitle}>Knowledge Map</h2>
          </div>
          <p className={styles.knowledgeMapDesc}>
            Topics raised in the first chapter session, ranked by priority. Group mastery
            fills in as devs respond to the skill-level survey — only aggregated, anonymous
            numbers are shown here, never individual names or scores. Each topic also shows
            whether it is already covered by an existing trail, with links to the modules
            that cover it.
          </p>
          <div className={styles.topicsList}>
            {chapterData.topics.map((topic) => (
              <TopicRow key={topic.topic} topic={topic} />
            ))}
          </div>
        </section>

        <section className={styles.sourceBox}>
          <div className={styles.sourceGlow} />
          <div className={styles.sourceHeader}>
            <span className={styles.sourceIcon}><LockIcon /></span>
            <span className={styles.sourceTitle}>Source spreadsheet</span>
          </div>
          <p className={styles.sourceDesc}>
            The full knowledge map, including per-person responses, lives in a spreadsheet
            restricted to CI&amp;T employees. This page only ever shows the group-level
            aggregates the spreadsheet itself computes — individual names and scores are
            never published here.
          </p>
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceBtn}
          >
            Open spreadsheet (CI&amp;T access only)
          </a>
        </section>
      </main>
    </Layout>
  );
}
