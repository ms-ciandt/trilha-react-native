import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { useColorMode } from '@docusaurus/theme-common';
import styles from '@site/src/pages/lab.module.css';

const LABS = [
  {
    id: '01',
    title: 'Brownfield Bootstrap',
    description: 'Embarque o React Native na lista de campeonatos nativa já existente (Android + iOS), de forma que tocar num card abra uma tela React Native.',
    goal: 'Ao tocar num card de campeonato na lista nativa, abrir uma tela React Native que recebe aquele campeonato via props, exibe o badge roxo "REACT NATIVE SCREEN" e consegue voltar para a lista nativa.',
    concepts: ['Brownfield', 'Integração Android/iOS', 'RN initialization', 'Organização de build'],
    outcome: 'Uma ida e volta nativo ↔ RN funcionando de ponta a ponta — ainda sem conteúdo real de detalhe, só a integração comprovada.',
    prerequisite: null,
    optional: false,
    path: '/rn-advanced-lab/brownfield-bootstrap',
  },
  {
    id: '01b',
    title: 'Brownfield Bundle Split',
    description: 'Reconstrua a encanação do Lab 01 usando um split de core compartilhado + bundle de serviço via Re.Pack e Module Federation, em vez de um único bundle JS.',
    goal: 'Produzir dois bundles compiláveis de forma independente (host de core compartilhado + remote tournament-detail) com react/react-native como singletons compartilhados, mantendo o mesmo comportamento de tocar-e-abrir-tela-RN do Lab 01.',
    concepts: ['Module Federation', 'Re.Pack', 'Divisão de bundle', 'Organização de build', 'Performance em devices fracos'],
    outcome: 'A mesma ida e volta nativo ↔ RN do Lab 01, mas construída sobre uma arquitetura multi-bundle que você pode comparar diretamente com ela.',
    prerequisite: '01',
    optional: true,
    path: '/rn-advanced-lab/brownfield-bundle-split',
  },
  {
    id: '02',
    title: 'Brownfield Navigation',
    description: 'Construa a tela React Native de Detalhes do Campeonato de verdade — chaveamento para mata-mata, tabela + jogos para ida-volta/suíço — e faça a ponte para as telas nativas de Histórico e Ranking Global.',
    goal: 'A partir da tela de detalhes em RN, montar a navegação para as telas nativas de Histórico e Ranking já existentes, exercitando o sentido RN → nativo da integração.',
    concepts: ['Brownfield navigation', 'Navigation stack', 'Lifecycle', 'Android back', 'Native ↔ RN'],
    outcome: 'Uma tela de detalhes em React Native que exibe dados reais do campeonato e entrega o fluxo de volta para telas nativas existentes.',
    prerequisite: '01',
    optional: false,
    path: '/rn-advanced-lab/brownfield-navigation',
  },
  {
    id: '03',
    title: 'Native Library Bridge',
    description: 'Construa o formulário React Native de Criar Campeonato apoiado num TurboModule nativo de geração de chaveamento/pareamento (mata-mata e suíço).',
    goal: 'Criar o contrato TurboModule necessário para gerar chaveamentos/pareamentos reais a partir do código nativo, substituindo os dados mockados, sem reescrever o algoritmo em JS.',
    concepts: ['Native Modules', 'TurboModules / JSI', 'Contratos TypeScript', 'Erros assíncronos', 'Diferenças entre plataformas'],
    outcome: 'Um formulário React Native que cria um campeonato chamando a biblioteca nativa existente, de forma segura e testável.',
    prerequisite: '02',
    optional: false,
    path: '/rn-advanced-lab/native-library-bridge',
  },
  {
    id: '04',
    title: 'UI Thread vs JS Thread',
    description: 'Investigue e corrija o jank na tela de Registro de Placar (construída em cima da tela de detalhes do Lab 02), causado por recálculo pesado a cada atualização de placar.',
    goal: 'Mover o recálculo da tabela de classificação para fora da JS thread e comparar a execução antes/depois, com redução mensurável de jank.',
    concepts: ['Performance', 'Frame rate', 'JS thread', 'UI thread', 'Reanimated / worklets', 'Medição de jank'],
    outcome: 'Um placar ao vivo fluido mesmo sob carga pesada de atualizações, com evidências de benchmark antes/depois.',
    prerequisite: '03',
    optional: false,
    path: '/rn-advanced-lab/ui-thread-vs-js-thread',
  },
  {
    id: '05',
    title: 'Godot Integration',
    description: 'Dispare um mini-game de comemoração em Godot quando a final de um campeonato é decidida.',
    goal: 'Explorar a comunicação e o lifecycle entre React Native e Godot e entregar uma experiência interativa iniciada pelo app.',
    concepts: ['RN ↔ Godot', 'Lifecycle', 'Comunicação de eventos/dados', 'Retorno para o RN'],
    outcome: 'React Native inicia a comemoração em Godot, o usuário interage e o resultado retorna para a plataforma.',
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
    label: 'Trilha iOS',
    to: '/trilha-ios/modulo-fundamentos/ios-project-setup',
    note: 'Swift · SwiftUI',
    lightColor: '#690037',
    darkColor: '#FAB9FF',
  },
  {
    label: 'Trilha Android',
    to: '/trilha-android/modulo-compose-para-rn/composable-vs-component',
    note: 'Kotlin · Jetpack Compose',
    lightColor: '#1e8a55',
    darkColor: '#3ddc84',
  },
];

const EMPTY_STARTED = { '01': false, '01b': false, '02': false, '03': false, '04': false, '05': false };

function getLabState(lab, started) {
  if (!lab.prerequisite) return started[lab.id] ? 'started' : 'unlocked';
  if (!started[lab.prerequisite]) return 'locked';
  return started[lab.id] ? 'started' : 'unlocked';
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
            <span className={styles.optionalBadge}>Opcional</span>
          )}
          {isStarted && (
            <span className={styles.startedBadge}>
              <CheckIcon />
              Iniciado
            </span>
          )}
          {isLocked && (
            <span className={styles.lockedBadge}>
              <LockIcon />
              Bloqueado
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
        <span className={styles.outcomeLabel}>Resultado esperado</span>
        <span className={styles.outcomeText}>{lab.outcome}</span>
      </div>

      <div className={styles.labAction}>
        {isLocked ? (
          <span className={styles.requiresText}>
            <LockIcon />
            Requer Lab {lab.prerequisite}
          </span>
        ) : (
          <Link className={styles.startBtn} to={lab.path} onClick={() => onStart(lab.id)}>
            {isStarted ? `Continuar Lab ${lab.id}` : `Iniciar Lab ${lab.id}`}
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
      description="Seis desafios práticos para testar suas habilidades avançadas em React Native."
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <div className={styles.heroBadge}>RN Advanced Lab</div>
          <h1 className={styles.heroTitle}>Coloque em Prática</h1>
          <p className={styles.heroSubtitle}>
            Seis desafios práticos para testar suas habilidades avançadas em React Native.
            Os labs seguem uma sequência, com um desvio opcional (01-B) logo após o Lab 01.
          </p>
          <p className={styles.heroThemeNote}>
            Os seis labs são construídos em cima do mesmo exemplo: CI&amp;T Championships,
            um app interno para organizar campeonatos do escritório — futebol, sinuca,
            Mortal Kombat, FIFA e qualquer outra modalidade que o pessoal queira disputar.
          </p>
        </header>

        <section className={styles.prereqBox}>
          <div className={styles.prereqGlow} />
          <div className={styles.prereqHeader}>
            <span className={styles.prereqIcon}><ShieldCheckIcon /></span>
            <span className={styles.prereqTitle}>Recomendado antes de começar</span>
          </div>
          <p className={styles.prereqDesc}>
            Estes labs pressupõem familiaridade com desenvolvimento nativo e os conceitos fundamentais do React Native.
            Complete ao menos uma trilha nativa e a Masterclass para aproveitar ao máximo cada desafio.
          </p>
          <RecommendedTrails />
        </section>

        <section className={styles.prereqBox}>
          <div className={styles.prereqGlow} />
          <div className={styles.prereqHeader}>
            <span className={styles.prereqIcon}><TemplateIcon /></span>
            <span className={styles.prereqTitle}>Como obter o seu template</span>
          </div>
          <p className={styles.prereqDesc}>
            Cada plataforma tem um repositório inicial no GitHub com a base nativa do Lab 01
            já funcionando (Android pronto; iOS vem depois). Você não busca um template novo
            a cada lab — pega sua cópia uma única vez e evolui ela pelos cinco.
          </p>
          <ol className={styles.templateSteps}>
            <li>
              Clique em <strong>Use this template</strong> no repositório{' '}
              <a
                href="https://github.com/gbonin-ciandt/ciandt-championships-android-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                ciandt-championships-android-template
              </a>{' '}
              para criar sua própria cópia na sua conta do GitHub.
            </li>
            <li>Clone sua cópia e abra no Android Studio — a lista de torneios nativa do Lab 01 já roda direto, junto com outras duas telas nativas, Histórico e Ranking Global, que já existem porque a premissa do brownfield é que esse app já está em produção. Os Labs 02+ fazem as telas React Native se conectarem a essas telas nativas já existentes.</li>
            <li>Faça os Labs 01–05 dentro dessa mesma cópia, commitando conforme completa cada um. Seu histórico de commits vira o seu log de progresso.</li>
            <li>Travou? O repositório original mantém branches de solução (<code>lab-02-solution</code>, <code>lab-03-solution</code>, ...) como gabarito de referência — eles não são copiados automaticamente pro seu fork, então consulte no repositório original se precisar.</li>
          </ol>
        </section>

        <section className={styles.labsGrid}>
          {LABS.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              state={getLabState(lab, started)}
              onStart={handleStart}
            />
          ))}
        </section>

        {anyStarted && (
          <button className={styles.resetBtn} onClick={handleReset}>
            Redefinir progresso dos labs
          </button>
        )}
      </main>
    </Layout>
  );
}
