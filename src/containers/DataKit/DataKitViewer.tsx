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
    const { datakit, datakitName, assets, timeseries } = this.props;
    const { input } = datakit[datakitName];
    return (
      <>
        <pre>{JSON.stringify(datakit[datakitName], null, 2)}</pre>
        <Table
          dataSource={input.map(el => ({
            ...el,
            ...timeseries[el.timeseriesId],
          }))}
          rowKey="name"
          columns={[
            {
              title: 'Name',
              key: 'name',
              render: item => {
                const ts = timeseries[item.timeseriesId];
                return <span>{ts ? ts.name : '...'}</span>;
              },
            },
            {
              title: 'Description',
              key: 'description',
              render: item => {
                const ts = timeseries[item.timeseriesId];
                return <span>{ts ? ts.description : '...'}</span>;
              },
            },
            {
              title: 'Unit',
              key: 'unit',
              render: item => {
                const ts = timeseries[item.timeseriesId];
                return <span>{ts ? ts.unit : '...'}</span>;
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
              render: item => {
                const ts = timeseries[item.timeseriesId];
                if (!ts) {
                  return <span>...</span>;
                }
                if (!ts.assetId) {
                  return <span>None</span>;
                }
                return (
                  <span>
                    {assets[ts.assetId] ? assets[ts.assetId].name : ts.assetId}
                  </span>
                );
              },
            },
            {
              dataIndex: 'name',
              key: 'actions',
              title: 'Actions',
              render: (name, row) => {
                return (
                  <>
                    <Button
                      onClick={() => {
                        this.props.updateDataKit(datakitName, {
                          ...datakit[datakitName],
                          input: input.filter(
                            el => el.timeseriesId !== row.timeseriesId
                          ),
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </>
                );
              },
            },
          ]}
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
