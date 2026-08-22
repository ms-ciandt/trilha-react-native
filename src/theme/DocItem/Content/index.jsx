import React from 'react';
import Content from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { TimeBadges } from '@site/src/components/TimeBadges';
import contentTimesData from '@site/src/data/content-times.json';

const contentTimes = contentTimesData?.byDoc ?? {};

export default function DocItemContent(props) {
  const { metadata } = useDoc();

  // EN:   "@site/docs/trilha-android/modulo-fundamentos/01-javascript.md"
  // PT-BR: "@site/i18n/pt/docusaurus-plugin-content-docs/current/trilha-android/modulo-fundamentos/01-javascript.md"
  const rawSource = metadata?.source ?? '';
  const relPath =
    rawSource.replace('@site/docs/', '') !== rawSource
      ? rawSource.replace('@site/docs/', '')
      : rawSource.replace(/^@site\/i18n\/[^/]+\/docusaurus-plugin-content-docs\/current\//, '');
  const times = relPath ? contentTimes[relPath] : null;

  return (
    <>
      {times && (
        <TimeBadges
          readMin={times.readMin}
          videoMin={times.videoMin}
          hasVideo={times.hasVideo}
        />
      )}
      <Content {...props} />
    </>
  );
}
