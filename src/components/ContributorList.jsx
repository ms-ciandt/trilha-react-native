import React from 'react';

const avatarStyle = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  objectFit: 'cover',
  display: 'block',
};

const linkStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  color: 'inherit',
  fontSize: 13,
};

export default function ContributorList({ contributors }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 16 }}>
      {contributors.map(({ username, name }) => (
        <a
          key={username}
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          <img
            src={`https://github.com/${username}.png?size=80`}
            alt={name}
            style={avatarStyle}
          />
          <span>{name}</span>
        </a>
      ))}
    </div>
  );
}
