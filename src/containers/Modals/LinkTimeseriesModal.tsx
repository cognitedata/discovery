import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button } from 'antd';

import { TimeseriesSearch } from '@cognite/gearbox';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { Dispatch, bindActionCreators } from 'redux';
import { addTimeseriesToState } from '../../modules/timeseries';
import { ExtendedAsset } from '../../modules/assets';
import { sdk } from '../../index';
import { canEditTimeseries } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

type OrigProps = {
  asset: ExtendedAsset;
  onClose: () => void;
};

type Props = {
  addTimeseriesToState: typeof addTimeseriesToState;
} & OrigProps;

type State = {
  selectedTimeseriesIds?: any[];
};

class LinktimeseriesModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    trackUsage('LinkTimeseriesModal.Load', {
      assetId: this.props.asset.id,
    });
    this.state = {};
  }

  onTimeserieSelectionChange = (newTimeseriesIds: number[]) => {
    this.setState({ selectedTimeseriesIds: newTimeseriesIds });
  };

  addToAsset = async () => {
    if (!canEditTimeseries()) {
      return;
    }
    if (
      this.state.selectedTimeseriesIds &&
      this.state.selectedTimeseriesIds.length > 0
    ) {
      const timeseries = await sdk.timeseries.update(
        this.state.selectedTimeseriesIds.map(id => ({
          id,
          update: {
            assetId: { set: this.props.asset.id },
          },
        }))
      );
      this.props.addTimeseriesToState(timeseries);
      this.props.onClose();
      trackUsage('LinkTimeseriesModal.LinkToFiles', {
        assetId: this.props.asset.id,
        mapped: this.state.selectedTimeseriesIds,
      });
    }
  };

  timeseriesFilter = (timeseries: GetTimeSeriesMetadataDTO) => {
    return !timeseries.assetId;
  };

  render() {
    return (
      <Modal
        visible
        title={`Link Asset (${this.props.asset.name}) to Timeseries`}
        onCancel={this.props.onClose}
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={this.addToAsset}
            disabled={!canEditTimeseries(false)}
          >
            Link to asset
          </Button>,
        ]}
      >
        <TimeseriesSearch
          hideSelected
          allowStrings
          styles={{ list: { maxHeight: '400px', overflow: 'auto' } }}
          onTimeserieSelectionChange={this.onTimeserieSelectionChange}
          filterRule={this.timeseriesFilter}
        />
      </Modal>
    );
  }
}

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      addTimeseriesToState,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LinktimeseriesModal);
