import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button } from 'antd';

import { TimeseriesSearch } from '@cognite/gearbox';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { Dispatch, bindActionCreators } from 'redux';
import { addTimeseriesToAsset } from '../../modules/timeseries';
import { RootState } from '../../reducers/index';
import { selectAssets, ExtendedAsset } from '../../modules/assets';

type OrigProps = {
  assetId: string | number;
  timeseries: GetTimeSeriesMetadataDTO[];
};

type Props = {
  assetId: number;
  asset: ExtendedAsset;
  timeseries: GetTimeSeriesMetadataDTO[];
  doAddTimeseriesToAsset: typeof addTimeseriesToAsset;
  onClose: () => void;
};

type State = {
  selectedTimeseriesIds?: any[];
};

class AddTimeseries extends React.Component<Props, State> {
  onTimeserieSelectionChange = (newTimeseriesIds: number[]) => {
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
      this.props.onClose();
    }
  };

  timeseriesFilter = (timeseries: GetTimeSeriesMetadataDTO) => {
    return timeseries.assetId == null;
  };

  render() {
    return (
      <Modal
        visible
        title={`Link Asset (${this.props.asset.name}) to Timeseries`}
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.addToAsset}>
            Add to asset
          </Button>,
        ]}
      >
        <TimeseriesSearch
          hideSelected
          styles={{ list: { maxHeight: '400px', overflow: 'auto' } }}
          onTimeserieSelectionChange={this.onTimeserieSelectionChange}
          filterRule={this.timeseriesFilter}
        />
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: OrigProps) => {
  const { assetId, timeseries } = ownProps;
  return {
    assetId: Number(assetId),
    asset: selectAssets(state).all[assetId],
    timeseries,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doAddTimeseriesToAsset: addTimeseriesToAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTimeseries);
