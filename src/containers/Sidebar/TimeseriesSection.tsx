import React from 'react';
import { connect } from 'react-redux';
import { List, Spin, Button, Icon, Popconfirm, Pagination } from 'antd';
import moment from 'moment';
import mixpanel from 'mixpanel-browser';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import {
  fetchTimeseries,
  selectTimeseries,
  removeAssetFromTimeseries,
  TimeseriesState,
} from '../../modules/timeseries';
import AddTimeseries from '../Modals/AddTimeseriesModal';
import TimeseriesPreview from '../../components/TimeseriesPreview';
import { selectAssets } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState } from '../../modules/app';

const ListItemContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 0;
  margin-right: 4px;

  && > p.title {
    color: #40a9ff;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  && > p.subtitle {
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-bottom: 0px;
    overflow: hidden;
  }
`;

type OrigProps = {};

type Props = {
  doFetchTimeseries: typeof fetchTimeseries;
  doRemoveAssetFromTimeseries: typeof removeAssetFromTimeseries;
  timeseries: TimeseriesState;
  app: AppState;
} & OrigProps;

type State = {
  showAddTimeseries: boolean;
  showTimeseries?: { id: number; name: string };
  timeseriesTablePage: number;
};

class AssetDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    showAddTimeseries: false,
    timeseriesTablePage: 0,
  };

  addTimeseriesClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    // @ts-ignore
    mixpanel.context.track('addTimeseries.click', {
      assetId: this.props.app.assetId,
    });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  };

  resetState = () => {
    this.setState({
      showAddTimeseries: false,
      timeseriesTablePage: 0,
    });
  };

  onModalClose = () => {
    this.setState({
      showAddTimeseries: false,
      showTimeseries: undefined,
    });
  };

  timeseriesOnClick = (timeseriesId: number, timeseriesName: string) => {
    this.setState({
      showTimeseries: { id: timeseriesId, name: timeseriesName },
    });
  };

  render() {
    const {
      timeseries: { items },
      app: { assetId },
    } = this.props;
    const {
      timeseriesTablePage,
      showAddTimeseries,
      showTimeseries,
    } = this.state;
    if (!items) {
      return <Spin />;
    }
    const timeseriesItems = items;
    return (
      <>
        {assetId != null && showAddTimeseries && (
          <AddTimeseries
            assetId={assetId}
            onClose={this.onModalClose}
            timeseries={timeseriesItems}
          />
        )}
        {showTimeseries != null && (
          <TimeseriesPreview
            timeseries={{ id: showTimeseries.id, name: showTimeseries.name }}
            onClose={this.onModalClose}
          />
        )}
        <Button type="primary" onClick={this.addTimeseriesClick}>
          Add
        </Button>
        <List
          itemLayout="horizontal"
          dataSource={
            timeseriesItems
              ? timeseriesItems.slice(
                  timeseriesTablePage * 10,
                  timeseriesTablePage * 10 + 10
                )
              : []
          }
          renderItem={ts => (
            <List.Item>
              <ListItemContent>
                <p
                  className="title"
                  onClick={() => this.timeseriesOnClick(ts.id, ts.name!)}
                  role="presentation"
                >
                  {ts.name}
                </p>
                <p className="subtitle">{`${ts.unit}, ${
                  ts.description
                }, ${moment(ts.createdTime).format('DD-MM-YYYY')}`}</p>
              </ListItemContent>
              <div>
                <Popconfirm
                  title="Are you sure？"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() =>
                    this.props.doRemoveAssetFromTimeseries(ts.id, assetId!)
                  }
                >
                  <Button type="danger">
                    <Icon type="delete" />
                  </Button>
                </Popconfirm>
              </div>
            </List.Item>
          )}
        />
        <Pagination
          simple
          current={timeseriesTablePage + 1}
          total={timeseriesItems ? timeseriesItems.length : 0}
          onChange={page => this.setState({ timeseriesTablePage: page - 1 })}
        />
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    assets: selectAssets(state),
    timeseries: selectTimeseries(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTimeseries: fetchTimeseries,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
