import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';

class TimeseriesPreview extends React.PureComponent {
  render() {
    return (
      <Modal
        visible
        width={1000}
        title={this.props.timeseries.name}
        onCancel={this.props.onClose}
        footer={[null, null]}
      >
        <TimeseriesChartMeta timeseriesId={this.props.timeseries.id} />
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
