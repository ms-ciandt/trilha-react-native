import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import styles from '@site/src/pages/about.module.css';

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
  { name: 'Diego Karol Gouvea Lana',   role: 'Arquiteto',    username: null,        avatar: '/trilha-react-native/img/lana.webp',             color: '#242459',  darkColor: '#393973', lightTextColor: '#242459', darkTextColor: '#B4DCFA' },
  { name: 'Guilherme Rovaron',         role: 'Web',          username: null,        avatar: '/trilha-react-native/img/web-reviewer.jpg',       color: '#FA5A50',  darkColor: null,     lightTextColor: '#c43c33', darkTextColor: '#FA8982' },
  { name: 'Paulo Vitor Sato',          role: 'Android',      username: null,        avatar: '/trilha-react-native/img/sato.webp',             color: '#2db370',  darkColor: null,     lightTextColor: '#1e8a55', darkTextColor: '#3ddc84' },
  { name: 'Gabriel Dos Santos Xavier', role: 'iOS',          username: null,        avatar: '/trilha-react-native/img/gabriel-xavier.webp',   color: '#690037',  darkColor: '#A63832', lightTextColor: '#690037', darkTextColor: '#FAB9FF' },
];

const TOOLS = [
  {
    name: 'NotebookLM',
    description: 'Usado para sintetizar documentação oficial, changelogs do RN e artigos de referência em roteiros estruturados de curso.',
  },
  {
    name: 'Claude',
    description: 'Responsável por todo o conteúdo escrito: explicações, exemplos de código, analogias e seções narrativas nas duas trilhas.',
  },
];

const TRACKS = [
  {
    label: 'Trilha Web',
    color: '#FA5A50',
    desc: 'Para devs com background em React, HTML/CSS e JavaScript. Cobre a mudança de mentalidade do browser para o ambiente mobile.',
  },
  {
    label: 'Trilha Android',
    color: '#2db370',
    desc: 'Para devs Android vindos de Kotlin e Jetpack Compose. Mapeia conceitos do Compose — Composables, remember, NavHost — para os equivalentes em React Native.',
  },
  {
    label: 'Trilha iOS',
    color: '#690037',
    desc: 'Para devs iOS vindos de Swift e SwiftUI. Mapeia conceitos do SwiftUI — Views, @State, NavigationStack — para o ecossistema React Native.',
  },
  {
    label: 'Trilha React Native MasterClass',
    color: '#8CB3D9',
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

function RevisoresCards() {
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
    <Layout title="Sobre" description="Sobre o React Native Academy">
      <main className={styles.main}>
        <GridBackground />

        <section className={styles.hero}>
          <h1>Sobre Este Curso</h1>
          <p>
            React Native Academy é um curso gratuito e open source para desenvolvedores que já
            sabem construir software, seja no mobile (Android/iOS) ou na web (React), e
            querem dominar o React Native com a New Architecture.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Para quem é</h2>
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
          <h2>Stack de referência</h2>
          <p>Todo o conteúdo é baseado nas versões estáveis mais recentes do React Native e Expo.</p>
          <div className={styles.stackTags}>
            {STACK.map((tag) => (
              <span key={tag} className={styles.stackTag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>RN Advanced Lab</h2>
          <p>
            Além das trilhas, o curso conta com uma arena de prática com cinco desafios
            sequenciais: Brownfield bootstrap, Brownfield navigation, uma ponte com biblioteca
            nativa, JS thread vs UI thread performance e uma integração opcional com Godot.
            Cada lab libera o próximo conforme é concluído, e funciona melhor depois de
            terminar uma trilha nativa ou a Masterclass.
          </p>
          <Link to="/lab" className={styles.button}>Explorar o Lab</Link>
        </section>

        <section className={styles.section}>
          <h2>Feito com IA</h2>
          <p>
            Este curso foi criado com um fluxo de trabalho centrado em IA. Cada explicação,
            exemplo de código, analogia e seção narrativa foi produzida com ferramentas de IA
            não como atalho, mas como escolha deliberada para avançar rápido e manter
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
            <RevisoresCards />
          </div>
        </section>

        <section className={styles.section}>
          <h2>Open Source</h2>
          <p>
            Todo o conteúdo do curso é open source e está disponível no GitHub.
            Contribuições, correções e novos tópicos são bem-vindos.
          </p>
          <a
            href="https://github.com/ms-ciandt/trilha-react-native"
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
