import React from 'react';
import Layout from '@theme/Layout';
import styles from './about.module.css';

const CONTRIBUTORS = [
  { username: 'AlimuraMatheus', name: 'Matheus Sales' },
  { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
  { username: 'erickSuh',       name: 'Erick Sugahara' },
];

const REVIEWERS = [
  { name: 'Matheus Sales', role: 'React Native', username: 'AlimuraMatheus', color: '#00d4ff' },
  { name: 'Diego Karol Gouvea Lana', role: 'Architect', username: null, avatar: '/trilha-react-native/img/lana.webp', color: '#7c3aed' },
  { name: 'Guilherme Rovaron',       role: 'Web',       username: null, avatar: '/trilha-react-native/img/web-reviewer.jpg', color: '#059669' },
  { name: 'Paulo Vitor Sato',        role: 'Android',   username: null, avatar: '/trilha-react-native/img/sato.webp', color: '#d97706' },
  { name: 'Reviewer',      role: 'iOS',          username: null,             color: '#d97706' },
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
    color: '#059669',
    desc: 'For developers coming from React, HTML/CSS and JavaScript. Covers the mental-model shift from browser to mobile environment.',
  },
  {
    label: 'Native dev trail',
    color: '#d97706',
    desc: 'For Android (Kotlin) and iOS (Swift) developers. Maps native concepts: lifecycles, layouts, threading to the JS ecosystem.',
  },
  {
    label: 'React Native MasterClass Trail',
    color: '#00d4ff',
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

export default function About() {
  return (
    <Layout title="About" description="About the React Native Trail course">
      <main className={styles.main}>

        <section className={styles.hero}>
          <h1>About This Course</h1>
          <p>
            React Native Trail is a free, open-source course for developers who already know
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
                className={styles.toolCard}
                style={{ borderLeft: `3px solid ${track.color}` }}
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
            {REVIEWERS.map(({ name, role, username, avatar, color }) => (
              <div key={role} className={styles.reviewerCard}>
                <img
                  src={avatar
                    ? avatar
                    : username
                      ? `https://github.com/${username}.png?size=120`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=1e2030&color=888&rounded=true`}
                  alt={name}
                  className={styles.avatar}
                  style={{ borderColor: color, boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 20%, transparent)` }}
                />
                <span className={styles.reviewerName}>{name}</span>
                <span
                  className={styles.reviewerRole}
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  }}
                >
                  {role}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Open Source</h2>
          <p>
            The full course content is open source and available on GitHub. Contributions,
            corrections, and new topics are welcome.
          </p>
          <a
            href="https://github.com/AlimuraMatheus/trilha-react-native"
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
