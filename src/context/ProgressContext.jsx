import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'rn-trail-progress';

const defaultCtx = {
  progress: {},
  markComplete: () => {},
  toggleComplete: () => {},
  isComplete: () => false,
  getTrailCount: () => 0,
};

const CTX = createContext(defaultCtx);

function load() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    setProgress(load());
    const sync = () => setProgress(load());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const markComplete = useCallback((path) => {
    const normalized = path.replace(/\/$/, '');
    setProgress(prev => {
      if (prev[normalized]) return prev;
      const next = { ...prev, [normalized]: true };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleComplete = useCallback((path) => {
    const normalized = (path ?? '').replace(/\/$/, '');
    setProgress(prev => {
      const next = { ...prev };
      if (next[normalized]) {
        delete next[normalized];
      } else {
        next[normalized] = true;
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isComplete = useCallback((path) => {
    const normalized = (path ?? '').replace(/\/$/, '');
    return !!progress[normalized];
  }, [progress]);

  const getTrailCount = useCallback((trailKey) =>
    Object.keys(progress).filter(k => k.includes(trailKey)).length,
    [progress]
  );

  const value = useMemo(
    () => ({ progress, markComplete, toggleComplete, isComplete, getTrailCount }),
    [progress, markComplete, toggleComplete, isComplete, getTrailCount]
  );

  return <CTX.Provider value={value}>{children}</CTX.Provider>;
}

export function useProgress() {
  return useContext(CTX);
}
