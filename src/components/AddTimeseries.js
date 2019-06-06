import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Modal, Button, message } from 'antd';

import { TimeseriesSearch } from '@cognite/gearbox';
import { addTimeseriesToAsset } from '../modules/timeseries';

class AddTimeseries extends React.Component {
  state = {};

  onTimeserieSelectionChange = newTimeseriesIds => {
    this.setState({ selectedTimeseriesIds: newTimeseriesIds });
  };

  addToAsset = () => {
    if (
      this.state.selectedTimeseriesIds &&
      this.state.selectedTimeseriesIds.length > 0
    ) {
      this.props.doAddTimeseriesToAsset(
        this.state.selectedTimeseriesIds,
        this.props.assetId
      );
    }
    if (this.props.assetId === 7446334693628062) {
      this.setState({ showFoundMore: true });
    }
  };

  timeseriesFilter = timeseries => {
    return timeseries.assetId == null;
  };

  render() {
    return (
      <Modal
        visible
        title="Contextualize timeseries"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.addToAsset}>
            Add to asset
          </Button>,
        ]}
      >
        <Modal
          visible={this.state.showFoundMore}
          title="Possible mapping rule detected"
          onOk={() => {
            message.info('Mapped 954 timeseries to assets.');
            this.setState({ showFoundMore: false });
            this.props.onClose();
          }}
          onCancel={() => {
            this.setState({ showFoundMore: false });
            this.props.onClose();
          }}
        >
          Your previous map
          <br />
          <div style={{ backgroundColor: '#F2E7C7' }}>
            13FV1234 ← IA_13FV1234_pos_CurrValue.Pct.CV
          </div>
          <br />
          conforms to the general rule
          <br />
          <div style={{ backgroundColor: '#F2E7C7' }}>
            #X# ← IA_#X#_pos_CurrValue.Pct.CV
          </div>
          <br />
          This rule can be used to map 954 more time series in the Dataset.
          <br />
          <br />
          Do you want to apply it to all such cases?
        </Modal>

        <TimeseriesSearch
          hideSelected
          onTimeserieSelectionChange={this.onTimeserieSelectionChange}
          filterRule={this.timeseriesFilter}
        />
      </Modal>
    );
  }
}

AddTimeseries.propTypes = {
  assetId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  doAddTimeseriesToAsset: PropTypes.func.isRequired,
};

const mapStateToProps = (_, ownProps) => {
  const { assetId, timeseries } = ownProps;
  return {
    assetId: Number(assetId),
    timeseries,
  };
};

const mapDispatchToProps = dispatch => ({
  doAddTimeseriesToAsset: (...args) => dispatch(addTimeseriesToAsset(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTimeseries);
