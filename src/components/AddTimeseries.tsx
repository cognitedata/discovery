// TODO this is a container
import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button } from 'antd';

import { TimeseriesSearch } from '@cognite/gearbox';
import { addTimeseriesToAsset } from '../modules/timeseries';
import { Timeseries } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { Dispatch, bindActionCreators } from 'redux';

type OrigProps = {
  assetId: string | number;
  timeseries: Timeseries[];
};

type Props = {
  assetId: number;
  timeseries: Timeseries[];
  doAddTimeseriesToAsset: typeof addTimeseriesToAsset;
  onClose: (e: any) => void;
};

type State = {
  selectedTimeseriesIds?: any[];
};

class AddTimeseries extends React.Component<Props, State> {
  onTimeserieSelectionChange = (newTimeseriesIds: number[]) => {
    this.setState({ selectedTimeseriesIds: newTimeseriesIds });
  };

  addToAsset = () => {
    if (this.state.selectedTimeseriesIds && this.state.selectedTimeseriesIds.length > 0) {
      this.props.doAddTimeseriesToAsset(this.state.selectedTimeseriesIds, this.props.assetId);
    }
  };

  timeseriesFilter = (timeseries: Timeseries) => {
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
          </Button>
        ]}
      >
        <TimeseriesSearch
          hideSelected
          onTimeserieSelectionChange={this.onTimeserieSelectionChange}
          filterRule={this.timeseriesFilter}
        />
      </Modal>
    );
  }
}

const mapStateToProps = (_: RootState, ownProps: OrigProps) => {
  const { assetId, timeseries } = ownProps;
  return {
    assetId: Number(assetId),
    timeseries
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doAddTimeseriesToAsset: addTimeseriesToAsset
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTimeseries);
