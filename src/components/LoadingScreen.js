import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Progress, Tooltip } from 'antd';
import styled from 'styled-components';

const FlexDiv = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
`;

class LoadingScreen extends React.Component {
  state = {};

  render() {
    const { step, numSteps, progress, max, title } = this.props.progress;
    const percentTotal = Math.round((100 * step) / numSteps);
    const percentCurrent = Math.round((100 * progress) / max);

    return (
      <Modal
        visible
        title="Loading 3D model ..."
        footer={null}
        closable={false}
      >
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
  }
}

LoadingScreen.propTypes = {
  progress: PropTypes.shape({
    step: PropTypes.number.isRequired,
    numSteps: PropTypes.number.isRequired,
    progress: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
};

export default LoadingScreen;
