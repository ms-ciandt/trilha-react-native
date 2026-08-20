import React from 'react';
import styles from './TimeBadges.module.css';

function formatMinutes(min) {
  if (!min || min <= 0) return null;
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function GlassesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="15" r="4" />
      <circle cx="18" cy="15" r="4" />
      <path d="M2 15h4m12 0h4" />
      <path d="M10 15a2 2 0 0 1 4 0" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TimeBadges({ readMin, videoMin, hasVideo }) {
  const readLabel  = formatMinutes(readMin);
  const videoLabel = hasVideo ? formatMinutes(videoMin) : null;

  if (!readLabel && !videoLabel) return null;

  return (
    <div className={styles.badges}>
      {readLabel && (
        <span className={styles.badge}>
          <GlassesIcon />
          {readLabel} read
        </span>
      )}
      {videoLabel && (
        <span className={`${styles.badge} ${styles.badgeVideo}`}>
          <EyeIcon />
          {videoLabel} watch
        </span>
      )}
    </div>
  );
}

export function CourseStats({ readMin, videoMin }) {
  const readLabel  = formatMinutes(readMin);
  const videoLabel = formatMinutes(videoMin);

  return (
    <div className={styles.courseStats}>
      {readLabel && (
        <span className={styles.statItem}>
          <GlassesIcon />
          <span>{readLabel} reading</span>
        </span>
      )}
      {videoLabel && (
        <span className={styles.statItem}>
          <EyeIcon />
          <span>{videoLabel} watching</span>
        </span>
      )}
    </div>
  );
}
