import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { ProgressProvider, useProgress } from '../context/ProgressContext';

const GRADIENTS = {
  'trilha-masterclass': { from: '#d4a017', to: '#00d4ff' },
  'trilha-web':         { from: '#059669', to: '#0ea5e9' },
  'trilha-nativo':      { from: '#d97706', to: '#ea580c' },
};
const DEFAULT = { from: '#2563eb', to: '#7c3aed' };

function gradientFromPath(pathname) {
  for (const [key, grad] of Object.entries(GRADIENTS)) {
    if (pathname.includes(key)) return grad;
  }
  return DEFAULT;
}

function GoToTop() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();
  const { from, to } = gradientFromPath(pathname);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Go to top"
      className={`go-to-top${visible ? ' go-to-top--visible' : ''}`}
      style={{ '--btn-from': from, '--btn-to': to }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

const DOC_PATH_RE = /\/(docs|trilha-|introducao|trilha-masterclass|trilha-web|trilha-android|trilha-ios|trilha-nativo)/;

function ScrollTracker() {
  const { pathname } = useLocation();
  const { markComplete, isComplete } = useProgress();
  const [showToast, setShowToast] = useState(false);
  const firedForPath = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!DOC_PATH_RE.test(pathname)) return;

    const onScroll = () => {
      if (firedForPath.current === pathname) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > window.innerHeight + 50 && total - scrolled < 300) {
        const wasComplete = isComplete(pathname);
        markComplete(pathname);
        if (!wasComplete) {
          firedForPath.current = pathname;
          setShowToast(true);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setShowToast(false), 3000);
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, markComplete, isComplete]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      className={`progress-toast${showToast ? ' progress-toast--visible' : ''}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Lesson complete
    </div>
  );
}

export default function Root({ children }) {
  return (
    <ProgressProvider>
      {children}
      <GoToTop />
      <ScrollTracker />
    </ProgressProvider>
  );
}
