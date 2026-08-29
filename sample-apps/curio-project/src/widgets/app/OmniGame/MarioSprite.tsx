import React, { useState, useEffect } from 'react';

interface MarioSpriteProps {
  facingRight: boolean;
  isMoving: boolean;
  isJumping: boolean;
  width?: number;
  height?: number;
}

export default function MarioSprite({ facingRight, isMoving, isJumping, width = 52, height = 68 }: MarioSpriteProps) {
  const [animFrame, setAnimFrame] = useState(0);

  // Animate running legs when moving
  useEffect(() => {
    if (!isMoving || isJumping) {
      setAnimFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setAnimFrame(prev => (prev + 1) % 3);
    }, 110);
    return () => clearInterval(interval);
  }, [isMoving, isJumping]);

  // Color Palette - Classic Super Mario
  const Palette: { [key: string]: string } = {
    R: '#E52521', // Mario Red (Cap & Shirt)
    B: '#0028C8', // Mario Blue (Overalls)
    S: '#FFCC99', // Skin Tone
    D: '#5C2E0B', // Dark Brown (Hair, Mustache, Boots)
    Y: '#FCD116', // Yellow (Buttons)
    W: '#FFFFFF', // White
    G: '#000000', // Black outline
    '.': 'transparent'
  };

  // 12x16 Pixel Matrices
  // Standing Pose
  const STAND_GRID = [
    "....RRRRR...",
    "...RRRRRRRRR",
    "...DDDSSDS.",
    "..DSDSSSDSSS",
    "..DSDDDSSSSS",
    "..DDSSSSDDDD",
    "....SSSSSSS.",
    "...RRRBRR...",
    "..RRRRBRRRR.",
    ".RRRRBBBBBRR",
    ".SSRBBYBBRSS",
    ".SSBBBBBBBSS",
    ".SSBBBBBBBSS",
    "...BBB..BBB.",
    "..DDDD..DDDD",
    ".DDDD....DDDD"
  ];

  // Running Pose 1
  const RUN1_GRID = [
    "....RRRRR...",
    "...RRRRRRRRR",
    "...DDDSSDS.",
    "..DSDSSSDSSS",
    "..DSDDDSSSSS",
    "..DDSSSSDDDD",
    "....SSSSSSS.",
    "...RRRBRR...",
    "..RRRRBRRRR.",
    ".SSRRBBBBBRR",
    ".SSRBBYBBRSS",
    "..SSBBBBBBSS",
    "...BBBBBBB..",
    "..DDDD.BBB..",
    ".DDDD...DDDD",
    ".........DDDD"
  ];

  // Running Pose 2
  const RUN2_GRID = [
    "....RRRRR...",
    "...RRRRRRRRR",
    "...DDDSSDS.",
    "..DSDSSSDSSS",
    "..DSDDDSSSSS",
    "..DDSSSSDDDD",
    "....SSSSSSS.",
    "...RRRBRR...",
    "..RRRRBRRRR.",
    ".RRRRBBBBBRS",
    ".SSRBBYBBRSS",
    ".SSBBBBBBB..",
    "..BBBBBBB...",
    "..BBB.DDDD..",
    ".DDDD..DDDD.",
    "DDDD........"
  ];

  // Jumping Pose
  const JUMP_GRID = [
    ".....SS.....",
    "....SSRRRRR.",
    "...SSRRRRRRR",
    "...DDDSSDS..",
    "..DSDSSSDSSS",
    "..DSDDDSSSSS",
    "..DDSSSSDDDD",
    "....SSSSSSS.",
    "...RRRBRR...",
    "..RRRRBRRRR.",
    ".RRRRBBBBBRR",
    ".SSRBBYBBRSS",
    "..SSBBBBBBB.",
    "...BBBBBBB..",
    "..DDDD.DDDD.",
    ".DDDD...DDDD"
  ];

  let grid = STAND_GRID;
  if (isJumping) {
    grid = JUMP_GRID;
  } else if (isMoving) {
    grid = animFrame === 1 ? RUN1_GRID : (animFrame === 2 ? RUN2_GRID : STAND_GRID);
  }

  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div
      style={{
        width,
        height,
        transform: `scaleX(${facingRight ? 1 : -1})`,
        transition: 'transform 0.08s ease-in-out',
        display: 'inline-block',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
      }}
    >
      <svg
        viewBox={`0 0 ${cols} ${rows}`}
        style={{
          width: '100%',
          height: '100%',
          shapeRendering: 'crispEdges'
        }}
      >
        {grid.map((rowStr, rIdx) =>
          rowStr.split('').map((char, cIdx) => {
            const color = Palette[char] || 'transparent';
            if (color === 'transparent') return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill={color}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
