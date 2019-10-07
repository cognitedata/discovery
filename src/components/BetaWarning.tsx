import React from 'react';

const BetaWarning = () => (
  <div
    style={{
      position: 'absolute',
      height: '20px',
      width: '100%',
      top: 0,
      left: 0,
      background: 'yellow',
      zIndex: 100,
    }}
  >
    <span>BETA FEATURE, USE WITH CAUTION</span>
  </div>
);

export default BetaWarning;
