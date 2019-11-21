import React from 'react';
import { Tag, Badge } from 'antd';

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

export const BetaTag = ({ style }: { style?: React.CSSProperties }) => (
  <Tag
    color="#FFBB00"
    style={{
      marginRight: '4px',
      ...(style || {}),
    }}
  >
    Beta
  </Tag>
);
export const BetaBadge = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ marginRight: '16px', display: 'inline-flex' }}>
    <Badge
      color="#FFBB00"
      count={
        <span
          style={{
            fontSize: 8,
            borderRadius: 2,
            backgroundColor: '#FFBB00',
            padding: '2px 3px',
            zIndex: 1,
            color: '#FFF',
          }}
        >
          BETA
        </span>
      }
    >
      {children}
    </Badge>
  </div>
);

export default BetaWarning;
