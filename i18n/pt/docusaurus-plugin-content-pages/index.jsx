import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from '@site/src/pages/index.module.css';

function GridBackground() {
  return <div className={styles.grid} aria-hidden="true" />;
}

function ForkArrows() {
  return (
    <svg
      viewBox="0 0 400 80"
      className={styles.arrows}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className={styles.arrowCurve} d="M 200 0 C 196 28, 120 55, 88 74" />
      <path className={styles.arrowCurve} d="M 200 0 C 204 28, 280 55, 312 74" style={{ animationDelay: '0.1s' }} />
      <path className={styles.arrowHead} d="M 88 74 L 96 62 M 88 74 L 102 73" />
      <path className={styles.arrowHead} d="M 312 74 L 298 73 M 312 74 L 304 62" style={{ animationDelay: '0.1s' }} />
    </svg>
  );
}

function ConvergenceArrows() {
  return (
    <svg
      viewBox="0 0 400 80"
      className={styles.arrows}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className={styles.arrowCurve} d="M 88 4 C 120 24, 196 52, 200 66" />
      <path className={styles.arrowCurve} d="M 312 4 C 280 24, 204 52, 200 66" style={{ animationDelay: '0.1s' }} />
      <path className={styles.arrowHead} d="M 200 66 L 200 78 M 200 78 L 191 67 M 200 78 L 209 67" />
    </svg>
  );
}

function DotConnector() {
  return (
    <div className={styles.dotConnectorWrap} aria-hidden="true">
      <div className={styles.dotTrack}>
        <span className={styles.dot} style={{ animationDelay: '0s' }} />
        <span className={styles.dot} style={{ animationDelay: '0.3s' }} />
        <span className={styles.dot} style={{ animationDelay: '0.6s' }} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout
      title="Home"
      description="A próxima onda: um código, duas plataformas"
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Trilha React Native</h1>
          <p className={styles.heroSubtitle}>
            A próxima onda: um código, duas plataformas
          </p>
        </header>

        <div className={styles.introWrapper}>
          <div className={styles.startHere} aria-hidden="true">
            <span className={styles.startHereLabel}>Comece<br />por aqui</span>
            <svg className={styles.startHereSvg} viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 50 2 C 50 50, 80 58, 86 50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 3" fill="none" />
              <path d="M 92 50 L 81 42 M 92 50 L 81 58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div className={styles.intro}>
            <div className={styles.introGlow} />
            <div className={styles.introLabel}>Introdução</div>
            <p className={styles.trackDesc}>
              História, arquitetura e New Architecture: contexto essencial antes de escolher sua trilha.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.introBtnStyle}`}
              to="/introducao/intro"
            >
              Começar por aqui
            </Link>
          </div>
        </div>

        <ForkArrows />

        <p className={styles.forkCaption}>Escolha seu background: três caminhos, o mesmo destino</p>

        <section className={styles.tracks}>
          <div className={`${styles.trackCard} ${styles.trackCardWeb}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardGlow} />
            <div className={styles.cardBadge}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
              Web
            </div>
            <div className={styles.trackLabel}>Trilha Web</div>
            <p className={styles.trackDesc}>
              Você vem do React, HTML/CSS e JavaScript. Aprenda as diferenças do ambiente mobile.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.trackBtnWeb}`}
              to="/trilha-web/modulo-fundamentos/adaptando-js-ts"
            >
              Começar
            </Link>
          </div>

          <div className={`${styles.trackCard} ${styles.trackCardAndroid}`} style={{ animationDelay: '0.2s' }}>
            <div className={styles.cardGlow} />
            <div className={styles.cardBadge}>
              <svg viewBox="19.933 68.509 228.155 228.155" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                <path d="M101.885 207.092c7.865 0 14.241 6.376 14.241 14.241v61.09c0 7.865-6.376 14.24-14.241 14.24-7.864 0-14.24-6.375-14.24-14.24v-61.09c0-7.864 6.376-14.24 14.24-14.24z" fill="#a4c639"/>
                <path d="M69.374 133.645c-.047.54-.088 1.086-.088 1.638v92.557c0 9.954 7.879 17.973 17.66 17.973h94.124c9.782 0 17.661-8.02 17.661-17.973v-92.557c0-.552-.02-1.1-.066-1.638H69.374z" fill="#a4c639"/>
                <path d="M166.133 207.092c7.865 0 14.241 6.376 14.241 14.241v61.09c0 7.865-6.376 14.24-14.241 14.24-7.864 0-14.24-6.375-14.24-14.24v-61.09c0-7.864 6.376-14.24 14.24-14.24zM46.405 141.882c7.864 0 14.24 6.376 14.24 14.241v61.09c0 7.865-6.376 14.241-14.24 14.241-7.865 0-14.241-6.376-14.241-14.24v-61.09c-.001-7.865 6.375-14.242 14.241-14.242zM221.614 141.882c7.864 0 14.24 6.376 14.24 14.241v61.09c0 7.865-6.376 14.241-14.24 14.241-7.865 0-14.241-6.376-14.241-14.24v-61.09c0-7.865 6.376-14.242 14.241-14.242zM69.79 127.565c.396-28.43 25.21-51.74 57.062-54.812h14.312c31.854 3.073 56.666 26.384 57.062 54.812H69.79z" fill="#a4c639"/>
                <path d="M74.743 70.009l15.022 26.02M193.276 70.009l-15.023 26.02" fill="none" stroke="#a4c639" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M114.878 102.087c.012 3.974-3.277 7.205-7.347 7.216-4.068.01-7.376-3.202-7.388-7.176v-.04c-.011-3.975 3.278-7.205 7.347-7.216 4.068-.011 7.376 3.2 7.388 7.176v.04zM169.874 102.087c.012 3.974-3.277 7.205-7.347 7.216-4.068.01-7.376-3.202-7.388-7.176v-.04c-.011-3.975 3.278-7.205 7.347-7.216 4.068-.011 7.376 3.2 7.388 7.176v.04z" fill="#ffffff"/>
              </svg>
              Android
            </div>
            <div className={styles.trackLabel}>Trilha Android</div>
            <p className={styles.trackDesc}>
              Você vem do Kotlin e Jetpack Compose. Mapeie seus conceitos para o ecossistema React Native.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.trackBtnAndroid}`}
              to="/trilha-android/modulo-compose-para-rn/composable-vs-component"
            >
              Começar
            </Link>
          </div>

          <div className={`${styles.trackCard} ${styles.trackCardIos}`} style={{ animationDelay: '0.3s' }}>
            <div className={styles.cardGlow} />
            <div className={styles.cardBadge}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04l-.07.28zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              iOS
            </div>
            <div className={styles.trackLabel}>Trilha iOS</div>
            <p className={styles.trackDesc}>
              Você vem do Swift e SwiftUI. Mapeie seus conceitos para o ecossistema React Native.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.trackBtnIos}`}
              to="/trilha-ios/modulo-fundamentos/swift-to-javascript"
            >
              Começar
            </Link>
          </div>
        </section>

        <ConvergenceArrows />

        <div className={styles.goal}>
          <div className={styles.goalGlow} />
          <div className={styles.goalCardGlow} />
          <span className={styles.goalLabel}>
            <img src="/trilha-react-native/img/react-native-logo.svg" alt="" width="22" height="22" style={{verticalAlign: 'middle', marginRight: '8px', marginBottom: '2px'}} />
            React Native
          </span>
          <p className={styles.goalDesc}>
            Um único codebase: apps nativos em iOS e Android
          </p>
          <div className={styles.levelBadge}>Básico · Intermediário</div>
        </div>

        <DotConnector />

        <section className={styles.masterclass}>
          <div className={styles.masterclassGlow} />
          <div className={styles.masterclassCyanGlow} />
          <div className={styles.masterclassContent}>
            <img
              src="/trilha-react-native/img/react-native-masterclass-icon-v2.png"
              alt="Masterclass"
              className={styles.masterclassIcon}
            />
            <div className={styles.masterclassText}>
              <div className={styles.masterclassLabel}>React Native Masterclass</div>
              <p className={styles.masterclassDesc}>
                Brownfield App · TurboModules · Fabric · Performance · CI/CD e mais
              </p>
              <div className={styles.masterclassLevelBadge}>Avançado</div>
              <Link
                className={styles.masterclassBtn}
                to="/trilha-masterclass/modulo-00-overview/course-overview"
              >
                Acessar Masterclass
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.contributors}>
          <Link to="/about" className={styles.contributorsLabel}>Feito por</Link>
          <div className={styles.contributorsList}>
            {[
              { username: 'ms-ciandt', name: 'Matheus Sales' },
              { username: 'gbonin-ciandt',  name: 'Gabriel Bonin' },
              { username: 'erickSuh',       name: 'Erick Sugahara' },
            ].map(({ username, name }, i) => (
              <a
                key={username}
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contributorCard}
                style={{ animationDelay: `${1.0 + i * 0.1}s` }}
              >
                <img
                  src={`https://github.com/${username}.png?size=120`}
                  alt={name}
                  className={styles.contributorAvatar}
                />
                <span className={styles.contributorName}>{name}</span>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.contributors}>
          <span className={styles.contributorsLabel}>Revisores</span>
          <div className={styles.contributorsList}>
            {[
              { name: 'Matheus Sales', role: 'React Native', username: 'ms-ciandt', color: '#00d4ff' },
              { name: 'Diego Karol Gouvea Lana', role: 'Arquiteto', username: null, avatar: '/trilha-react-native/img/lana.webp', color: '#7c3aed' },
              { name: 'Revisor',               role: 'Web',       username: null, avatar: null,                                   color: '#059669' },
              { name: 'Paulo Vitor Sato',        role: 'Android',   username: null, avatar: '/trilha-react-native/img/sato.webp', color: '#d97706' },
              { name: 'Revisor',       role: 'iOS',          username: null,             color: '#d97706' },
            ].map(({ name, role, username, avatar, color }, i) => (
              <div
                key={role}
                className={styles.contributorCard}
                style={{ animationDelay: `${1.3 + i * 0.1}s` }}
              >
                <img
                  src={avatar
                    ? avatar
                    : username
                      ? `https://github.com/${username}.png?size=120`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=1e2030&color=888&rounded=true`}
                  alt={name}
                  className={styles.contributorAvatar}
                  style={{ borderColor: color, boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 20%, transparent)` }}
                />
                <span className={styles.contributorName}>{name}</span>
                <span className={styles.contributorRole} style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>{role}</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </Layout>
  );
}
