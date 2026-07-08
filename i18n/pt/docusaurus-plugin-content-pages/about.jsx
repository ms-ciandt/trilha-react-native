import React from 'react';
import Layout from '@theme/Layout';
import styles from '@site/src/pages/about.module.css';

const CONTRIBUTORS = [
  { username: 'AlimuraMatheus', name: 'Matheus Sales' },
  { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
  { username: 'erickSuh',       name: 'Erick Sugahara' },
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

      </main>
    </Layout>
  );
}
