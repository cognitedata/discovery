import React from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: row;
  align-items: center;

  div {
    align-self: center;
    margin: 0 auto;
    text-align: center;
  }
  h3 {
    margin-top: 12px;
  }
`;

const LoadingWrapper = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Wrapper>
      <div>
        <Spin size="large" style={{ marginBottom: '12px' }} />
        {children}
      </div>
    </Wrapper>
  );
};

export default LoadingWrapper;
