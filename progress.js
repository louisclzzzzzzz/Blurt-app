import React from  'react';

export const PixelProgressRing = ({
  value = 0,
  max = 100,
  segments = 12,
  accentColor = '#D8912E',
  highlightColor = '#F2A93C',
  shadowColor = '#8F5A15',
  offColor = '#5A4F42',
  size = 120,
  centerContent
}) => {
  const activeCount = Math.round((value / max) * segments);
  const radius = 38;
  const center = 50;
  const segW = 6;
  const segH = 14;

  const items = Array.from({ length: segments }).map((_, i) => {
    const isActive = i < activeCount;
    const angle = i * (360 / segments);
    const x = center - segW / 2;
    const y = center - radius - segH / 2;

    return (
      <g key={i} transform={`rotate(${angle} ${center} ${center})`} shapeRendering="crispEdges">
        <rect x={x} y={y} width={segW} height={segH} fill={isActive ? accentColor : offColor} />
        
        {isActive && (
          <>
            <rect x={x} y={y} width={segW - 1} height="1" fill={highlightColor} />
            <rect x={x} y={y} width="1" height={segH - 1} fill={highlightColor} />
            
            <rect x={x + 1} y={y + segH - 1} width={segW - 1} height="1" fill={shadowColor} />
            <rect x={x + segW - 1} y={y + 1} width="1" height={segH - 1} fill={shadowColor} />
          </>
        )}
      </g>
    );
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {items}
      </svg>
      
      {centerContent && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: '#E8D4B4',
          textShadow: '2px 2px 0px #221C16, -1px -1px 0px #221C16, 1px -1px 0px #221C16, -1px 1px 0px #221C16'
        }}>
          {centerContent}
        </div>
      )}
    </div>
  );
};