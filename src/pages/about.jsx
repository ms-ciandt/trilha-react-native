import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './about.module.css';

function GridBackground() {
  return <div className={styles.grid} aria-hidden="true" />;
}

const CONTRIBUTORS = [
  { username: 'ms-ciandt', name: 'Matheus Sales' },
  { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
  { username: 'erickSuh',       name: 'Erick Sugahara' },
];

const REVIEWERS = [
  { name: 'Matheus Sales',             role: 'React Native', username: 'ms-ciandt', avatar: null,                                             color: '#B4DCFA',  darkColor: null,     lightTextColor: '#5a8ab8', darkTextColor: '#B4DCFA' },
  { name: 'Diego Karol Gouvea Lana',   role: 'Architect',    username: null,        avatar: '/trilha-react-native/img/lana.webp',             color: '#242459',  darkColor: '#393973', lightTextColor: '#242459', darkTextColor: '#B4DCFA' },
  { name: 'Guilherme Rovaron',         role: 'Web',          username: null,        avatar: '/trilha-react-native/img/web-reviewer.jpg',       color: '#FA5A50',  darkColor: null,     lightTextColor: '#c43c33', darkTextColor: '#FA8982' },
  { name: 'Paulo Vitor Sato',          role: 'Android',      username: null,        avatar: '/trilha-react-native/img/sato.webp',             color: '#2db370',  darkColor: null,     lightTextColor: '#1e8a55', darkTextColor: '#3ddc84' },
  { name: 'Gabriel Dos Santos Xavier', role: 'iOS',          username: null,        avatar: '/trilha-react-native/img/gabriel-xavier.webp',   color: '#690037',  darkColor: '#A63832', lightTextColor: '#690037', darkTextColor: '#FAB9FF' },
];

const TOOLS = [
  {
    name: 'NotebookLM',
    description: 'Used to synthesize official documentation, RN changelogs, and reference articles into structured course outlines.',
  },
  {
    name: 'Claude',
    description: 'Authored all written content: explanations, code examples, analogies, and narrative sections across both trails.',
  },
];

const TRACKS = [
  {
    label: 'Web dev trail',
    color: '#FA5A50',
    desc: 'For developers coming from React, HTML/CSS and JavaScript. Covers the mental-model shift from browser to mobile environment.',
  },
  {
    label: 'Android native trail',
    color: '#2db370',
    desc: 'For Android developers coming from Kotlin and Jetpack Compose. Maps Compose concepts — Composables, remember, NavHost — to their React Native equivalents.',
  },
  {
    label: 'iOS native trail',
    color: '#690037',
    desc: 'For iOS developers coming from Swift and SwiftUI. Maps SwiftUI concepts — Views, @State, NavigationStack — to the React Native ecosystem.',
  },
  {
    label: 'React Native MasterClass Trail',
    color: '#8CB3D9',
    desc: 'Advanced trail covering Brownfield integration, TurboModules, Fabric, JSI, Performance and CI/CD.',
  },
];

const STACK = [
  'React Native 0.76+',
  'Expo SDK 56',
  'New Architecture (default)',
  'JSI · Fabric · TurboModules',
  'Hermes Engine',
];

function ReviewersCards() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  return REVIEWERS.map(({ name, role, username, avatar, color, darkColor, lightTextColor, darkTextColor }) => {
    const c = (isDark && darkColor) ? darkColor : color;
    const textColor = isDark ? darkTextColor : lightTextColor;
    return (
      <div key={role} className={styles.reviewerCard}>
        <img
          src={avatar
            ? avatar
            : username
              ? `https://github.com/${username}.png?size=120`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=1e2030&color=888&rounded=true`}
          alt={name}
          className={styles.avatar}
          style={{ borderColor: c, boxShadow: `0 0 0 2px color-mix(in srgb, ${c} 20%, transparent)` }}
        />
        <span className={styles.reviewerName}>{name}</span>
        <span
          className={styles.reviewerRole}
          style={{
            color: textColor ?? c,
            background: `color-mix(in srgb, ${c} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
          }}
        >
          {role}
        </span>
      </div>
    );
  });
}

export default function About() {
  return (
    <Layout title="About" description="About the React Native Academy">
      <main className={styles.main}>
        <GridBackground />

        <section className={styles.hero}>
          <h1>About This Course</h1>
          <p>
            React Native Academy is a free, open-source course for developers who already know
            how to build software, either on mobile (Android/iOS) or on the web (React),
            and want to master React Native with the New Architecture.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Who is it for</h2>
          <div className={styles.tools}>
            {TRACKS.map((track) => (
              <div
                key={track.label}
                className={styles.trackCard}
                style={{ borderLeftColor: track.color }}
              >
                <h3 style={{ color: track.color }}>{track.label}</h3>
                <p>{track.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Reference Stack</h2>
          <p>All content targets the current stable versions of React Native and Expo.</p>
          <div className={styles.stackTags}>
            {STACK.map((tag) => (
              <span key={tag} className={styles.stackTag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>RN Advanced Lab</h2>
          <p>
            Beyond the trails, the course includes a hands-on practice arena with five
            sequential challenges: Brownfield bootstrap, Brownfield navigation, a native
            library bridge, JS thread vs UI thread performance, and an optional Godot
            integration. Each lab unlocks the next as you complete it, and it works best
            after finishing a native trail or the Masterclass.
          </p>
          <Link to="/lab" className={styles.button}>Explore the Lab</Link>
        </section>

        <section className={styles.section}>
          <h2>Built AI-First</h2>
          <p>
            This course was created with an AI-first workflow. Every explanation, code example,
            analogy, and narrative section was authored using AI tools, not as a shortcut, but
            as a deliberate choice to move fast and maintain consistency across two parallel trails
            and dozens of topics.
          </p>
          <div className={styles.tools}>
            {TOOLS.map((tool) => (
              <div key={tool.name} className={styles.toolCard}>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            All content was reviewed and validated by the contributors listed below.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contributors</h2>
          <div className={styles.contributors}>
            {CONTRIBUTORS.map(({ username, name }) => (
              <a
                key={username}
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contributor}
              >
                <img
                  src={`https://github.com/${username}.png?size=120`}
                  alt={name}
                  className={styles.avatar}
                />
                <span>{name}</span>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Reviewers</h2>
          <p>Each trail was reviewed by a specialist in that platform.</p>
          <div className={styles.reviewers}>
            <ReviewersCards />
          </div>
        </section>

        <section className={styles.section}>
          <h2>Open Source</h2>
          <p>
            The full course content is open source and available on GitHub. Contributions,
            corrections, and new topics are welcome.
          </p>
          <a
            href="https://github.com/ms-ciandt/trilha-react-native"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.button}
          >
            View on GitHub
          </a>
        </section>

        <section className={styles.section}>
          <h2>Want to contribute?</h2>
          <p>
            Have a suggestion, found an error, or want to add content? Reach out to the
            contributors directly on GitHub.
          </p>
          <div className={styles.contributors} style={{ marginTop: '1.5rem' }}>
            {CONTRIBUTORS.map(({ username, name }) => (
              <a
                key={username}
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contributor}
              >
                <img
                  src={`https://github.com/${username}.png?size=120`}
                  alt={name}
                  className={styles.avatar}
                />
                <span>{name}</span>
              </a>
            ))}
          </div>
        </section>

      </main>
    </Layout>
  );
}
