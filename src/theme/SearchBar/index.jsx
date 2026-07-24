import React, { useEffect, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function SearchBar() {
  const { siteConfig } = useDocusaurusContext();
  const base = siteConfig.baseUrl.replace(/\/$/, '');

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [shortcut, setShortcut] = useState('⌘K');
  const backdropRef = useRef(null);
  const containerRef = useRef(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.platform.includes('Mac')) {
      setShortcut('Ctrl+K');
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Load Pagefind once on first open
  useEffect(() => {
    if (!isOpen || status !== 'idle') return;
    setStatus('loading');

    const addLink = (href) => new Promise((res) => {
      if (document.querySelector(`link[href="${href}"]`)) { res(); return; }
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.onload = res;
      document.head.appendChild(l);
    });

    const addScript = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });

    const init = async () => {
      try {
        await addLink(`${base}/pagefind/pagefind-ui.css`);
        await addScript(`${base}/pagefind/pagefind-ui.js`);

        if (containerRef.current && window.PagefindUI) {
          new window.PagefindUI({
            element: containerRef.current,
            baseUrl: base,
            showImages: false,
            showSubResults: true,
            translations: {
              placeholder: 'Search the trail...',
              zero_results: 'No results for "[QUERY]"',
            },
          });
          setStatus('ready');
        }
      } catch {
        setStatus('error');
      }
    };

    init();
  }, [isOpen, status, base]);

  // Focus input when modal opens (ready or already initialized)
  useEffect(() => {
    if (!isOpen || status !== 'ready') return;
    setTimeout(() => {
      containerRef.current?.querySelector('input')?.focus();
    }, 60);
  }, [isOpen, status]);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) close();
  };

  // Modal stays in DOM so Pagefind UI survives open/close cycles
  return (
    <>
      <button
        className={styles.trigger}
        onClick={open}
        type="button"
        aria-label="Open search"
      >
        <SearchIcon />
        <span className={styles.label}>Search</span>
        <kbd className={styles.kbd}>{shortcut}</kbd>
      </button>

      <div
        ref={backdropRef}
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={handleBackdrop}
        aria-modal={isOpen ? 'true' : undefined}
        role={isOpen ? 'dialog' : undefined}
        aria-label="Search"
        aria-hidden={!isOpen}
      >
        <div className={styles.modal}>
          <div ref={containerRef} className={styles.pagefind} />
          {status === 'loading' && (
            <p className={styles.hint}>Loading search index...</p>
          )}
          {status === 'error' && (
            <p className={styles.hint}>
              Search index not built yet. Run{' '}
              <code>npm run build &amp;&amp; npm run serve</code> to test locally.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 8.5L13 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
