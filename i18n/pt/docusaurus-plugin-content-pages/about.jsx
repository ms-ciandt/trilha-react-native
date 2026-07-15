import React from 'react';
import Layout from '@theme/Layout';
import styles from '@site/src/pages/about.module.css';

const CONTRIBUTORS = [
  { username: 'AlimuraMatheus', name: 'Matheus Sales' },
  { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
  { username: 'erickSuh',       name: 'Erick Sugahara' },
];

const REVIEWERS = [
  { name: 'Matheus Sales', role: 'React Native', username: 'AlimuraMatheus', color: '#00d4ff' },
  { name: 'Revisor',       role: 'Web',          username: null,             color: '#059669' },
  { name: 'Revisor',       role: 'Android',      username: null,             color: '#d97706' },
  { name: 'Revisor',       role: 'iOS',          username: null,             color: '#d97706' },
];

const TOOLS = [
  {
    name: 'NotebookLM',
    description: 'Usado para sintetizar documentação oficial, changelogs do RN e artigos de referência em roteiros estruturados de curso.',
  },
  {
    name: 'Claude',
    description: 'Responsável por todo o conteúdo escrito — explicações, exemplos de código, analogias e seções narrativas — nas duas trilhas.',
  },
];

const TRACKS = [
  {
    label: 'Trilha Web',
    color: '#059669',
    desc: 'Para devs com background em React, HTML/CSS e JavaScript. Cobre a mudança de mentalidade do browser para o ambiente mobile.',
  },
  {
    label: 'Trilha Nativo',
    color: '#d97706',
    desc: 'Para devs Android (Kotlin) e iOS (Swift). Mapeia conceitos nativos — ciclos de vida, layouts, threads — para o ecossistema JS.',
  },
  {
    label: 'Masterclass',
    color: '#00d4ff',
    desc: 'Trilha avançada cobrindo integração Brownfield, TurboModules, Fabric, JSI, Performance e CI/CD.',
  },
];

const STACK = [
  'React Native 0.76+',
  'Expo SDK 56',
  'New Architecture (padrão)',
  'JSI · Fabric · TurboModules',
  'Hermes Engine',
];

export default function About() {
  return (
    <Layout title="Sobre" description="Sobre o curso React Native Trail">
      <main className={styles.main}>

        <section className={styles.hero}>
          <h1>Sobre Este Curso</h1>
          <p>
            React Native Trail é um curso gratuito e open source para desenvolvedores que já
            sabem construir software — seja no mobile (Android/iOS) ou na web (React) — e
            querem dominar o React Native com a New Architecture.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Para quem é</h2>
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
          <h2>Stack de referência</h2>
          <p>Todo o conteúdo é baseado nas versões estáveis mais recentes do React Native e Expo.</p>
          <div className={styles.stackTags}>
            {STACK.map((tag) => (
              <span key={tag} className={styles.stackTag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Feito com IA</h2>
          <p>
            Este curso foi criado com um fluxo de trabalho centrado em IA. Cada explicação,
            exemplo de código, analogia e seção narrativa foi produzida com ferramentas de IA
            — não como atalho, mas como escolha deliberada para avançar rápido e manter
            consistência em duas trilhas paralelas com dezenas de tópicos.
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
            Todo o conteúdo foi revisado e validado pelos contribuidores listados abaixo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contribuidores</h2>
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
          <h2>Revisores</h2>
          <p>Cada trilha foi revisada por um especialista na plataforma correspondente.</p>
          <div className={styles.reviewers}>
            {REVIEWERS.map(({ name, role, username, color }) => (
              <div key={role} className={styles.reviewerCard}>
                <img
                  src={username
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
            Todo o conteúdo do curso é open source e está disponível no GitHub.
            Contribuições, correções e novos tópicos são bem-vindos.
          </p>
          <a
            href="https://github.com/AlimuraMatheus/trilha-react-native"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.button}
          >
            Ver no GitHub
          </a>
        </section>

        <section className={styles.section}>
          <h2>Quer contribuir?</h2>
          <p>
            Tem uma sugestão, encontrou um erro ou quer adicionar conteúdo? Entre em contato
            com os contribuidores diretamente pelo GitHub.
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
