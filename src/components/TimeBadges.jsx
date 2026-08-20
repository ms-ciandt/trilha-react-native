import React from 'react';
import styles from './TimeBadges.module.css';

function fmt(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const ReadIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function TimeBadges({ readMin, videoMin, hasVideo }) {
  return (
    <div className={styles.badges}>
      <span className={styles.badge}>
        <ReadIcon />
        {fmt(readMin)} read
      </span>
      {hasVideo && videoMin > 0 && (
        <span className={styles.badge}>
          <PlayIcon />
          {fmt(videoMin)} watch
        </span>
      )}
    </div>
  );
}
