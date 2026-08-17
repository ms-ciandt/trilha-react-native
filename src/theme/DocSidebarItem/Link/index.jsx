import React from 'react';
import OriginalDocSidebarItemLink from '@theme-original/DocSidebarItem/Link';
import { useProgress } from '../../../context/ProgressContext';

export default function DocSidebarItemLink(props) {
  const { isComplete } = useProgress();
  const href = props.item?.href ?? '';
  const done = isComplete(href);

  return (
    <div className={`sidebar-link-wrap${done ? ' sidebar-link-done' : ''}`}>
      {done && (
        <span className="sidebar-check" aria-hidden="true">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      <OriginalDocSidebarItemLink {...props} />
    </div>
  );
}
