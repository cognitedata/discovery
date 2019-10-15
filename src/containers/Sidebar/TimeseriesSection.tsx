import React from 'react';
import { connect } from 'react-redux';
import { List, Button, Icon, Popconfirm, Pagination, Input } from 'antd';
import moment from 'moment';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import debounce from 'lodash/debounce';
import {
  fetchTimeseries,
  selectTimeseries,
  removeAssetFromTimeseries,
  TimeseriesState,
  searchTimeseries,
} from '../../modules/timeseries';
import AddTimeseries from '../Modals/AddTimeseriesModal';
import { selectAssets } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState, setTimeseriesId } from '../../modules/app';
import { trackUsage } from '../../utils/metrics';

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
  setTimeseriesId: typeof setTimeseriesId;
  searchTimeseries: typeof searchTimeseries;
  timeseries: TimeseriesState;
  app: AppState;
} & OrigProps;

type State = {
  showAddTimeseries: boolean;
  timeseriesTablePage: number;
};

class TimeseriesSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 100);
    this.state = {
      showAddTimeseries: false,
      timeseriesTablePage: 0,
    };
  }

  addTimeseriesClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    trackUsage('TimeseriesSection.AddTimeseriesClicked', {
      assetId: this.props.app.assetId,
    });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  };

  resetState = () => {
    this.setState({
      timeseriesTablePage: 0,
    });
  };

  onModalClose = () => {
    this.setState({
      showAddTimeseries: false,
    });
  };

  timeseriesOnClick = (timeseriesId: number) => {
    trackUsage('TimeseriesSection.ViewTimeseries', {
      timeseriesId,
    });
    this.props.setTimeseriesId(timeseriesId);
  };

  doSearch = (query: string) => {
    const { assetId } = this.props.app;
    this.props.searchTimeseries(query, assetId);
  };

  render() {
    const {
      timeseries: { timeseriesData },
      app: { assetId },
    } = this.props;
    const { timeseriesTablePage, showAddTimeseries } = this.state;
    const timeseriesItems = Object.values(timeseriesData);
    return (
      <>
        {assetId != null && showAddTimeseries && (
          <AddTimeseries
            assetId={assetId}
            onClose={this.onModalClose}
            timeseries={timeseriesItems}
          />
        )}
        <Button type="primary" onClick={this.addTimeseriesClick}>
          Link Timeseries
        </Button>
        <Input
          placeholder="Find the timeseries most relevant to you"
          onChange={ev => this.doSearch(ev.target.value)}
          style={{ marginTop: '6px', marginBottom: '6px' }}
        />
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
                  onClick={() => this.timeseriesOnClick(ts.id)}
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
                    <Icon type="link" /> <span>Unlink</span>
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
          onChange={page => {
            this.setState({ timeseriesTablePage: page - 1 });
            trackUsage('TimeseriesSection.PaginationChange', { page });
          }}
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
      setTimeseriesId,
      searchTimeseries,
      doFetchTimeseries: fetchTimeseries,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TimeseriesSection);
