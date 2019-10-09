import React from 'react';
import { Progress } from 'antd';
import styled from 'styled-components';

const FlexDiv = styled.div`
  display: flex;
  padding: 16px;
  background-color: #fff;
  align-items: center;
  justify-content: space-between;
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 100;
`;

export type ProgressObject = {
  step: number;
  numSteps: number;
  progress: number;
  max: number;
  title: string;
};

type Props = {
  progress: ProgressObject;
};

const LoadingScreen = ({ progress: progressObject }: Props) => {
  const { step, numSteps, progress, max, title } = progressObject;
  const percentTotal = Math.round((100 * step) / numSteps);
  const percentCurrent = Math.round((100 * progress) / max);
  return (
    <FlexDiv>
      <Progress
        width={80}
        percent={percentCurrent}
        successPercent={percentTotal}
        type="circle"
      />
      <span style={{ marginLeft: '12px' }}>{title}</span>
    </FlexDiv>
  );
};

export default LoadingScreen;
