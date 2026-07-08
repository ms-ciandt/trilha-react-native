import React from 'react';
import Layout from '@theme/Layout';
import styles from './about.module.css';

const CONTRIBUTORS = [
  { username: 'AlimuraMatheus', name: 'Matheus Sales' },
  { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
  { username: 'erickSuh',       name: 'Erick Sugahara' },
];

const TOOLS = [
  {
    name: 'NotebookLM',
    description: 'Used to synthesize official documentation, RN changelogs, and reference articles into structured course outlines.',
  },
  {
    name: 'Claude',
    description: 'Authored all written content — explanations, code examples, analogies, and narrative sections — across both tracks.',
  },
];

export default function About() {
  return (
    <Layout title="About" description="About the React Native Trail course">
      <main className={styles.main}>

        <section className={styles.hero}>
          <h1>About This Course</h1>
          <p>
            React Native Trail is a free, open-source course for developers who already know
            how to build software — either on mobile (Android/iOS) or on the web (React) —
            and want to master React Native with the New Architecture.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Built AI-First</h2>
          <p>
            This course was created with an AI-first workflow. Every explanation, code example,
            analogy, and narrative section was authored using AI tools — not as a shortcut, but
            as a deliberate choice to move fast and maintain consistency across two parallel tracks
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

      </main>
    </Layout>
  );
}
