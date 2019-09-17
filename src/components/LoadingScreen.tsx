import React from 'react';
import { Modal, Progress } from 'antd';
import styled from 'styled-components';

const FlexDiv = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
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
    <Modal visible title="Loading 3D model ..." footer={null} closable={false}>
      <FlexDiv>
        <Progress
          percent={percentCurrent}
          successPercent={percentTotal}
          type="circle"
        />
        {title}
      </FlexDiv>
    </Modal>
  );
};

export default LoadingScreen;
