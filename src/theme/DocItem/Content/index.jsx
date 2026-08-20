import React from 'react';
import OriginalContent from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import TimeBadges from '@site/src/components/TimeBadges';
import contentTimes from '@site/src/data/content-times.json';

export default function DocItemContent(props) {
  const { metadata } = useDoc();
  const times = contentTimes.byDoc?.[metadata.id];
  return (
    <>
      {times && (
        <TimeBadges
          readMin={times.readMin}
          videoMin={times.videoMin}
          hasVideo={times.hasVideo}
        />
      )}
      <OriginalContent {...props} />
    </>
  );
}
