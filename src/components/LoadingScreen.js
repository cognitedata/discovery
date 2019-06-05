import React from 'react';
import { Modal, Progress, Tooltip } from 'antd';

class LoadingScreen extends React.Component {
  state = {};

  render() {
    return (
      <Modal visible footer={null} closable={false}>
        <Tooltip title="3 done / 3 in progress / 4 to do">
          <Progress percent={60} successPercent={70} type="circle" />
        </Tooltip>
      </Modal>
    );
  }
}

LoadingScreen.propTypes = {
  // assetId: PropTypes.number.isRequired,
  // onClose: PropTypes.func.isRequired,
  // doAddTimeseriesToAsset: PropTypes.func.isRequired,
};

export default LoadingScreen;
