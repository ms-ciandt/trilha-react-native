import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

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
      description="The next wave — one codebase, two platforms"
    >
      <main className={styles.main}>
        <GridBackground />

        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Trilha React Native</h1>
          <p className={styles.heroSubtitle}>
            The next wave — one codebase, two platforms
          </p>
        </header>

        <div className={styles.introWrapper}>
          <div className={styles.startHere} aria-hidden="true">
            <span className={styles.startHereLabel}>Start<br />here</span>
            <svg className={styles.startHereSvg} viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 50 2 C 50 50, 80 58, 86 50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 3" fill="none" />
              <path d="M 92 50 L 81 42 M 92 50 L 81 58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div className={styles.intro}>
            <div className={styles.introGlow} />
            <div className={styles.introLabel}>Introduction</div>
            <p className={styles.trackDesc}>
              History, architecture and New Architecture — essential context before choosing your track.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.introBtnStyle}`}
              to="/introducao/intro"
            >
              Start here
            </Link>
          </div>
        </div>

        <ForkArrows />

        <p className={styles.forkCaption}>Choose your background — two paths, one destination</p>

        <section className={styles.tracks}>
          <div className={`${styles.trackCard} ${styles.trackCardWeb}`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.cardGlow} />
            <div className={styles.cardBadge}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{marginRight: '4px', verticalAlign: 'middle'}}><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
              Web
            </div>
            <div className={styles.trackLabel}>Web Track</div>
            <p className={styles.trackDesc}>
              You come from React, HTML/CSS and JavaScript. Learn the differences of the mobile environment.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.trackBtnWeb}`}
              to="/trilha-web/modulo-fundamentos/adaptando-js-ts"
            >
              Start
            </Link>
          </div>

          <div className={`${styles.trackCard} ${styles.trackCardNativo}`} style={{ animationDelay: '0.25s' }}>
            <div className={styles.cardGlow} />
            <div className={styles.cardBadge}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{marginRight: '4px', verticalAlign: 'middle'}}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04l-.07.28zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <img src="/trilha-react-native/img/android-logo.svg" alt="Android" width="12" height="12" style={{marginRight: '5px', verticalAlign: 'middle', filter: 'invert(71%) sepia(62%) saturate(450%) hue-rotate(93deg) brightness(95%) contrast(90%)'}} />
              Native
            </div>
            <div className={styles.trackLabel}>Native Track</div>
            <p className={styles.trackDesc}>
              You come from Kotlin or Swift. Map your concepts to the JavaScript ecosystem.
            </p>
            <Link
              className={`${styles.trackBtn} ${styles.trackBtnNativo}`}
              to="/trilha-nativo/modulo-fundamentos/javascript-for-native-developers"
            >
              Start
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
            One codebase — native apps on iOS and Android
          </p>
          <div className={styles.levelBadge}>Beginner · Intermediate</div>
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
                Brownfield App · TurboModules · Fabric · Performance · CI/CD and more
              </p>
              <div className={styles.masterclassLevelBadge}>Advanced</div>
              <Link
                className={styles.masterclassBtn}
                to="/trilha-masterclass/modulo-00-overview/course-overview"
              >
                Access Masterclass
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.contributors}>
          <Link to="/about" className={styles.contributorsLabel}>Made by</Link>
          <div className={styles.contributorsList}>
            {[
              { username: 'AlimuraMatheus', name: 'Matheus Sales' },
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
          <span className={styles.contributorsLabel}>Reviewers</span>
          <div className={styles.contributorsList}>
            {[
              { name: 'Matheus Sales', role: 'React Native', username: 'AlimuraMatheus', color: '#00d4ff' },
              { name: 'Reviewer',      role: 'Web',          username: null,             color: '#059669' },
              { name: 'Reviewer',      role: 'Android',      username: null,             color: '#d97706' },
              { name: 'Reviewer',      role: 'iOS',          username: null,             color: '#d97706' },
            ].map(({ name, role, username, color }, i) => (
              <div
                key={role}
                className={styles.contributorCard}
                style={{ animationDelay: `${1.3 + i * 0.1}s` }}
              >
                <img
                  src={username
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
