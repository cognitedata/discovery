import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Table, Button, Spin } from 'antd';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { RootState } from '../../reducers/index';
import {
  selectTimeseries,
  fetchTimeseriesByIds,
} from '../../modules/timeseries';
import { selectAssets, ExtendedAsset } from '../../modules/assets';
import {
  removeDataKit,
  selectDatakit,
  updateDataKit,
  DataKitState,
  DataKitItem,
} from '../../modules/datakit';
import { setAppDataKit } from '../../modules/app';

type Props = {
  assets: { [id: number]: ExtendedAsset };
  timeseries: { [id: number]: GetTimeSeriesMetadataDTO };
  datakit: DataKitState;
  datakitName: string;
  updateDataKit: typeof updateDataKit;
  removeDataKit: typeof removeDataKit;
  setAppDataKit: typeof setAppDataKit;
  fetchTimeseriesByIds: typeof fetchTimeseriesByIds;
};

type State = { datakitName: string };

type ExtendedGetTimeSeriesMetadataDTO = GetTimeSeriesMetadataDTO & DataKitItem;

class DataKitViewer extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { datakitName: props.datakitName };
  }

  componentDidMount() {
    this.fetchTimeseries();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.datakitName !== this.props.datakitName) {
      this.fetchTimeseries();
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        datakitName: this.props.datakitName,
      });
    }
  }

  tableColumns = (isInput: boolean) => {
    const { datakit, assets } = this.props;
    const { datakitName } = this.state;
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
          return (
            <span>
              {item.description
                ? item.description
                    .substr(0, 255)
                    .concat(item.description.length > 255 ? '...' : '')
                : 'N/A'}
            </span>
          );
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
                  const alias = prompt('Add an Alias', row.alias);
                  this.props.updateDataKit(datakitName, {
                    ...datakit[datakitName],
                    ...(isInput && {
                      input: input.map(el => {
                        if (el.timeseriesId === row.timeseriesId) {
                          return { ...el, alias: alias || undefined };
                        }
                        return el;
                      }),
                    }),
                    ...(!isInput && {
                      output: output.map(el => {
                        if (el.timeseriesId === row.timeseriesId) {
                          return { ...el, alias: alias || undefined };
                        }
                        return el;
                      }),
                    }),
                  });
                }}
              >
                Add Alias
              </Button>
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
    const { datakit, timeseries } = this.props;
    const { datakitName } = this.state;
    if (!datakit[datakitName]) {
      return <Spin />;
    }
    const { input, output, name } = datakit[datakitName];
    return (
      <div style={{ overflow: 'auto', flex: 1 }}>
        <h2>Data Kit: {name}</h2>
        <Button
          onClick={() => {
            const newName = prompt('New Name');
            if (newName) {
              this.props.updateDataKit(name, {
                ...datakit[name],
                name: newName,
              });
              this.setState({ datakitName: newName });
            }
          }}
        >
          Rename
        </Button>
        <h3>Inputs</h3>
        <Table
          dataSource={input.map(el => ({
            ...el,
            ...timeseries[el.timeseriesId],
          }))}
          rowKey="name"
          columns={this.tableColumns(true)}
        />
        <h3>Outputs</h3>
        <Table
          dataSource={output.map(el => ({
            ...el,
            ...timeseries[el.timeseriesId],
          }))}
          rowKey="name"
          columns={this.tableColumns(false)}
        />
        <pre>{JSON.stringify(datakit[datakitName], null, 2)}</pre>
      </div>
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
      removeDataKit,
      setAppDataKit,
      fetchTimeseriesByIds,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataKitViewer);
