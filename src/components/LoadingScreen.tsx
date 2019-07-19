import React from 'react';
import PropTypes from 'prop-types';
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

class LoadingScreen extends React.Component<Props, {}> {
  render() {
    const { step, numSteps, progress, max, title } = this.props.progress;
    const percentTotal = Math.round((100 * step) / numSteps);
    const percentCurrent = Math.round((100 * progress) / max);

    return (
      <Modal visible title="Loading 3D model ..." footer={null} closable={false}>
        <FlexDiv>
          <Progress percent={percentCurrent} successPercent={percentTotal} type="circle" />
          {title}
        </FlexDiv>
      </Modal>
    );
  }
}

export default LoadingScreen;
