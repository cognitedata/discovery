import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { Modal, Button } from 'antd';

import { TimeseriesSearch } from '@cognite/gearbox';
import { Timeseries} from '@cognite/sdk';

class AddTimeseries extends React.Component {
  state = {
    assetId: null,
  };

  onTimeserieSelectionChange = (newTimeseriesIds, selectedTimeseries) => {
    console.log('Selected ', newTimeseriesIds);  
  }

  addToAsset = () => {
    
  }

  timeseriesFilter = (timeseries) => {
    return timeseries.assetId == null;
  }

  render() {
    return (
      <Modal
        visible={true}
        title="Title"
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
  const { assetId } = ownProps;
  return {
    assetId: Number(assetId),
  }
}

const mapDispatchToProps = (dispatch) => ({
  // onSubmitComment: (...args) => dispatch(submitComment(...args)),
})

export default connect(mapStateToProps, mapDispatchToProps)(AddTimeseries);
