import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import chapterData from '@site/src/data/chapter-knowledge-map.json';
import topicCoverage from '@site/src/data/topic-coverage.json';
import styles from '@site/src/pages/chapter.module.css';

const SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1QTCpMAF3Yf5JKaU-cDijxWx9xPpH-r4z-9hj4dViSm0/edit?usp=sharing';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Reuniões recorrentes',
    desc: 'O chapter se reúne periodicamente para discutir tópicos de React Native, desafios reais e boas práticas em todo o time.',
  },
  {
    step: '02',
    title: 'Priorização de tópicos',
    desc: 'O grupo mapeia os tópicos relevantes e os ordena por prioridade, gerando o mapa de conhecimento abaixo.',
  },
  {
    step: '03',
    title: 'Nível de conhecimento auto-reportado',
    desc: 'Cada dev avalia o próprio nível por tópico em uma escala Jedi (de Youngling a Mestre Jedi) em uma planilha compartilhada, com visualização pública.',
  },
  {
    step: '04',
    title: 'Alimenta as trilhas',
    desc: 'Os dados agregados de prioridade e domínio direcionam devs para trilhas existentes e definem quais módulos serão expandidos ou criados a seguir.',
  },
];

const TRAIL_COLORS = {
  Web: { light: '#FA5A50', dark: '#FA8982' },
  Android: { light: '#2db370', dark: '#3ddc84' },
  iOS: { light: '#690037', dark: '#FAB9FF' },
  Masterclass: { light: '#8CB3D9', dark: '#B4DCFA' },
};

const JEDI_RANKS = ['Youngling', 'Padawan', 'Jedi', 'Cavaleiro Jedi', 'Mestre Jedi'];

function jediRank(avgScore) {
  const index = Math.min(JEDI_RANKS.length, Math.max(1, Math.round(avgScore))) - 1;
  return JEDI_RANKS[index];
}

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
  covered: 'Já coberto',
  partial: 'Parcialmente coberto',
  'not-covered': 'Ainda não coberto',
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

function CoverageGap({ gap }) {
  if (!gap) return null;
  return (
    <div className={styles.coverageGap}>
      <span className={styles.coverageGapLabel}>O que falta</span>
      <p className={styles.coverageGapText}>{gap}</p>
    </div>
  );
}

function ReferencePeople({ references }) {
  if (!references || references.length === 0) return null;
  return (
    <div className={styles.referenceBox}>
      <span className={styles.referenceLabel}>Procure por</span>
      <div className={styles.referenceChips}>
        {references.map((name) => (
          <span key={name} className={styles.referenceChip}>
            {name}
          </span>
        ))}
      </div>
    </div>
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
                {topic.masteryPercent}% domínio do grupo · {jediRank(topic.avgScore)}
              </span>
            </>
          ) : (
            <span className={styles.masteryPending}>Aguardando respostas</span>
          )}
        </div>
        <ReferencePeople references={topic.references} />
        {coverage && (
          <div className={styles.coverageBox}>
            <CoverageBadge status={coverage.status} />
            <CoverageLinks links={coverage.links} />
            <CoverageGap gap={coverage.gap} />
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
      description="Um espaço recorrente para discutir tópicos, desafios e boas práticas de React Native — e um mapa de conhecimento que alimenta as trilhas do curso."
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <div className={styles.heroBadge}>Comunidade</div>
          <h1 className={styles.heroTitle}>React Native Chapter</h1>
          <p className={styles.heroSubtitle}>
            Um espaço recorrente para o time discutir tópicos de React Native, desafios reais
            e boas práticas — separado do curso, mas retroalimentando-o diretamente.
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
            <h2 className={styles.knowledgeMapTitle}>Mapa de Conhecimento</h2>
          </div>
          <p className={styles.knowledgeMapDesc}>
            Tópicos levantados na primeira reunião do chapter, ordenados por prioridade. O
            domínio do grupo é preenchido conforme os devs respondem à pesquisa de nível de
            conhecimento — aqui só aparecem números agregados e anônimos, notas individuais
            nunca são publicadas. Quando alguém se autoavalia com nota alta em um tópico, o
            nome pode aparecer como referência para consultar — nunca a nota em si. Cada
            tópico também mostra se já está coberto por alguma trilha existente, com links
            para os módulos que o cobrem.
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
            <span className={styles.sourceTitle}>Planilha de origem</span>
          </div>
          <p className={styles.sourceDesc}>
            O mapa de conhecimento completo, incluindo as respostas individuais, vive em uma
            planilha com visualização pública. Esta página mostra apenas os agregados de
            grupo que a própria planilha já calcula, além de uma lista curta de referências
            por tópico para quem se autoavaliou com nota alta — notas individuais nunca são
            publicadas aqui.
          </p>
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceBtn}
          >
            Abrir planilha
          </a>
        </section>
      </main>
    </Layout>
  );
}
