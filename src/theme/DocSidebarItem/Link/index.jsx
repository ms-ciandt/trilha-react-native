import React from 'react';
import OriginalDocSidebarItemLink from '@theme-original/DocSidebarItem/Link';
import { useProgress } from '../../../context/ProgressContext';

export default function DocSidebarItemLink(props) {
  const { isComplete, toggleComplete } = useProgress();
  const href = props.item?.href ?? '';
  const done = isComplete(href);

  return (
    <div className={`sidebar-link-wrap${done ? ' sidebar-link-done' : ''}`}>
      <button
        className={`sidebar-checkbox${done ? ' sidebar-checkbox--checked' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleComplete(href);
        }}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {done && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <OriginalDocSidebarItemLink {...props} />
    </div>
  );
}
