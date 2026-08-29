'use client';

import { useEffect } from 'react';
import { useWidgetSDK, useMaxHeight } from '@nitrostack/widgets';

interface SceneData {
  chapterId: number;
  imageUrl: string;
}

export default function SceneBackdrop() {
  const { getToolOutput } = useWidgetSDK();
  const maxHeight = useMaxHeight();
  const data = getToolOutput<SceneData>();

  if (!data) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: maxHeight ? `${maxHeight}px` : '400px',
      zIndex: -1, // Push it behind the chat UI
      overflow: 'hidden',
      fontFamily: 'var(--font-display)',
      backgroundImage: `url(/${data.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(to top, var(--stone-900) 0%, transparent 60%)',
      }} />
      <h2 style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        color: 'var(--gold-500)',
        fontSize: '32px',
        margin: 0,
        textShadow: '0 2px 10px rgba(0,0,0,0.8)'
      }}>
        Chapter {data.chapterId}
      </h2>
    </div>
  );
}
