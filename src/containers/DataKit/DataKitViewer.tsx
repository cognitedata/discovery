import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Table, Button } from 'antd';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { RootState } from '../../reducers/index';
import {
  selectTimeseries,
  fetchTimeseriesByIds,
} from '../../modules/timeseries';
import { selectAssets, ExtendedAsset } from '../../modules/assets';

import {
  selectDatakit,
  updateDataKit,
  DataKitState,
} from '../../modules/datakit';

type Props = {
  assets: { [id: number]: ExtendedAsset };
  timeseries: { [id: number]: GetTimeSeriesMetadataDTO };
  datakit: DataKitState;
  datakitName: string;
  updateDataKit: typeof updateDataKit;
  fetchTimeseriesByIds: typeof fetchTimeseriesByIds;
};

type State = {};

type ExtendedGetTimeSeriesMetadataDTO = GetTimeSeriesMetadataDTO & {
  alias?: string;
  timeseriesId: number;
};

class DataKitViewer extends React.Component<Props, State> {
  state = {};

  componentDidMount() {
    this.fetchTimeseries();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.datakitName !== this.props.datakitName) {
      this.fetchTimeseries();
    }
  }

  tableColumns = (isInput: boolean) => {
    const { datakit, datakitName, assets } = this.props;
    const { input, output } = datakit[datakitName];

    return [
      {
        title: 'Name',
        key: 'name',
        render: (item: ExtendedGetTimeSeriesMetadataDTO) => {
          return <span>{item.name || 'Loading...'}</span>;
        },
      },
      {
        title: 'Description',
        key: 'description',
        render: (item: ExtendedGetTimeSeriesMetadataDTO) => {
          return <span>{item.description || 'N/A'}</span>;
        },
      },
      {
        title: 'Unit',
        key: 'unit',
        render: (item: ExtendedGetTimeSeriesMetadataDTO) => {
          return <span>{item.unit || 'N/A'}</span>;
        },
      },
      {
        dataIndex: 'alias',
        title: 'Alias',
        key: 'alias',
      },
      {
        title: 'Asset',
        key: 'asset',
        render: (item: ExtendedGetTimeSeriesMetadataDTO) => {
          if (!item.assetId) {
            return <span>None</span>;
          }
          return (
            <span>
              {assets[item.assetId] ? assets[item.assetId].name : item.assetId}
            </span>
          );
        },
      },
      {
        dataIndex: 'name',
        key: 'actions',
        title: 'Actions',
        render: (name: string, row: ExtendedGetTimeSeriesMetadataDTO) => {
          return (
            <>
              <Button
                onClick={() => {
                  this.props.updateDataKit(datakitName, {
                    ...datakit[datakitName],
                    ...(isInput && {
                      input: input.filter(
                        el => el.timeseriesId !== row.timeseriesId
                      ),
                    }),
                    ...(!isInput && {
                      output: output.filter(
                        el => el.timeseriesId !== row.timeseriesId
                      ),
                    }),
                  });
                }}
              >
                Delete
              </Button>
            </>
          );
        },
      },
    ];
  };

  fetchTimeseries = () => {
    const { timeseries } = this.props;
    const { input, output } = this.props.datakit[this.props.datakitName];
    this.props.fetchTimeseriesByIds(
      Array.from(
        input
          .concat(output)
          .filter(el => timeseries[el.timeseriesId] === undefined)
          .reduce(
            (prev: Set<number>, el) => prev.add(el.timeseriesId),
            new Set<number>()
          )
      )
    );
  };

  render() {
    const { datakit, datakitName, timeseries } = this.props;
    const { input, output } = datakit[datakitName];
    return (
      <>
        <pre>{JSON.stringify(datakit[datakitName], null, 2)}</pre>
        <h3>Input</h3>
        <Table
          dataSource={input.map(el => ({
            ...el,
            ...timeseries[el.timeseriesId],
          }))}
          rowKey="name"
          columns={this.tableColumns(true)}
        />
        <h3>Output</h3>
        <Table
          dataSource={output.map(el => ({
            ...el,
            ...timeseries[el.timeseriesId],
          }))}
          rowKey="name"
          columns={this.tableColumns(false)}
        />
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    datakit: selectDatakit(state),
    timeseries: selectTimeseries(state).timeseriesData,
    assets: selectAssets(state).all,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      updateDataKit,
      fetchTimeseriesByIds,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitViewer);
