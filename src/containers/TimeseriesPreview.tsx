import React from 'react';
import { Modal, Button, Cascader, message } from 'antd';
import { TimeseriesChartMeta } from '@cognite/gearbox';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { selectTimeseries, TimeseriesState } from '../modules/timeseries';
import { RootState } from '../reducers/index';
import { selectApp, AppState, setTimeseriesId } from '../modules/app';
import { selectAssets, ExtendedAsset } from '../modules/assets';
import {
  selectDatakit,
  DataKitState,
  addToDataKit,
  createDataKit,
} from '../modules/datakit';

type Props = {
  assets: { [key: number]: ExtendedAsset };
  datakit: DataKitState;
  timeseries: TimeseriesState;
  app: AppState;
  addToDataKit: typeof addToDataKit;
  createDataKit: typeof createDataKit;
  setTimeseriesId: typeof setTimeseriesId;
};

class TimeseriesPreview extends React.PureComponent<Props, {}> {
  render() {
    const {
      datakit,
      timeseries: { timeseriesData },
      app: { timeseriesId, datakit: currentDataKit },
      assets,
    } = this.props;
    let timeseries: GetTimeSeriesMetadataDTO | undefined;
    if (timeseriesId) {
      timeseries = timeseriesData[timeseriesId];
    }

    const options = [
      {
        value: currentDataKit,
        label: `Current Kit: ${currentDataKit}`,
        children: [
          {
            value: 'input',
            label: 'Add As Input',
          },
          {
            value: 'output',
            label: 'Add As Output',
          },
        ],
      },
      ...Object.keys(datakit)
        .filter(el => el !== currentDataKit)
        .map(name => ({
          value: name,
          label: `Kit: ${name}`,
          children: [
            {
              value: 'input',
              label: 'Add As Input',
            },
            {
              value: 'output',
              label: 'Add As Output',
            },
          ],
        })),
    ];
    options.push({
      value: 'new',
      label: `NEW Kit`,
      children: [
        {
          value: 'input',
          label: 'Add As Input',
        },
        {
          value: 'output',
          label: 'Add As Output',
        },
      ],
    });
    return (
      <Modal
        visible={timeseriesId !== undefined}
        width={1000}
        title={timeseries ? timeseries.name! : 'Loading...'}
        onCancel={() => this.props.setTimeseriesId(undefined)}
        footer={[null, null]}
      >
        <Cascader
          options={options}
          onChange={values => {
            let asset;
            if (timeseries && timeseries.assetId) {
              asset = assets[timeseries.assetId];
            }
            if (values[0] === 'new') {
              this.props.createDataKit({
                timeseriesId: timeseriesId!,
                output: values[1] === 'output',
                assetId: timeseries && timeseries.assetId,
                assetName: asset ? asset.name : undefined,
                timeseriesName: timeseries && timeseries.name,
              });
            } else {
              this.props.addToDataKit(
                values[0],
                timeseriesId!,
                values[1] === 'output',
                {
                  assetId: timeseries && timeseries.assetId,
                  assetName: asset ? asset.name : undefined,
                  timeseriesName: timeseries && timeseries.name,
                }
              );
            }
            message.success('Added to Data Kit');
          }}
        >
          <Button>Add to Data Kit</Button>
        </Cascader>
        {timeseries && <TimeseriesChartMeta timeseriesId={timeseries.id} />}
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: selectAssets(state).all,
    datakit: selectDatakit(state),
    timeseries: selectTimeseries(state),
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    { setTimeseriesId, addToDataKit, createDataKit },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TimeseriesPreview);
