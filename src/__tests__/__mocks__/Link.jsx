import React from 'react';

export default function Link({ to, href, children, className, ...rest }) {
  return (
    <a href={to || href} className={className} {...rest}>
      {children}
    </a>
  );
}
