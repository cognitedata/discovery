import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { Modal, Button } from 'antd';
import { addTimeseriesToAsset } from '../modules/timeseries';

import { TimeseriesSearch } from '@cognite/gearbox';
import { Timeseries} from '@cognite/sdk';

class AddTimeseries extends React.Component {
  state = {
    assetId: null,
  };

  onTimeserieSelectionChange = (newTimeseriesIds, selectedTimeseries) => {
    this.setState({ selectedTimeseriesIds: newTimeseriesIds });
  }

  addToAsset = () => {
    if (this.state.selectedTimeseriesIds && this.state.selectedTimeseriesIds.length > 0) {
      this.props.doAddTimeseriesToAsset(this.state.selectedTimeseriesIds, this.props.assetId);
    }
  }

  timeseriesFilter = (timeseries) => {
    return timeseries.assetId == null;
  }

  render() {
    return (
      <Modal
        visible={true}
        title="Contextualize timeseries"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.addToAsset}>
            Add to asset
          </Button>,
        ]}
      >
        <TimeseriesSearch 
          hideSelected={true}
          onTimeserieSelectionChange={this.onTimeserieSelectionChange}
          filterRule={this.timeseriesFilter}
        />
      </Modal>
    )
  }
}

AddTimeseries.propTypes = {
  assetId:  PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  timeseries: PropTypes.array.isRequired,
}

const mapStateToProps = (_, ownProps) => {
  const { assetId, timeseries } = ownProps;
  return {
    assetId: Number(assetId),
    timeseries,
  }
}

const mapDispatchToProps = (dispatch) => ({
  doAddTimeseriesToAsset: (...args) => dispatch(addTimeseriesToAsset(...args)),
})

export default connect(mapStateToProps, mapDispatchToProps)(AddTimeseries);
