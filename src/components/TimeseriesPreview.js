import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'antd';
import { TimeseriesChart } from '@cognite/gearbox';

class TimeseriesPreview extends React.PureComponent {
  render() {
    return (
      <Modal
        visible
        title={this.props.timeseries.name}
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <TimeseriesChart
          timeseriesIds={[this.props.timeseries.id]}
          contextChart
          zoomable
        />
      </Modal>
    );
  }
}

TimeseriesPreview.propTypes = {
  timeseries: PropTypes.exact({
    id: PropTypes.number,
    name: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TimeseriesPreview;
