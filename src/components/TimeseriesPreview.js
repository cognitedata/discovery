import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Modal, Button } from 'antd';

import { Event } from '@cognite/sdk';
import { TimeseriesChart } from '@cognite/gearbox';

class TimeseriesPreview extends React.Component {
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

export default TimeseriesPreview;
