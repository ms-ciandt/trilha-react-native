import React from 'react';
import Content from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import { TimeBadges } from '@site/src/components/TimeBadges';
import contentTimesData from '@site/src/data/content-times.json';

const contentTimes = contentTimesData?.byDoc ?? {};

export default function DocItemContent(props) {
  const { metadata } = useDoc();

  // metadata.source looks like "@site/docs/trilha-android/modulo-fundamentos/01-javascript.md"
  const relPath = metadata?.source?.replace('@site/docs/', '');
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
