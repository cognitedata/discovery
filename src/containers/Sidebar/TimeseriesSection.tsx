import React from 'react';
import { connect } from 'react-redux';
import { List, Button, Icon, Popconfirm, Pagination, Input } from 'antd';
import moment from 'moment';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import debounce from 'lodash/debounce';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import {
  fetchTimeseriesForAssetId,
  selectTimeseries,
  removeAssetFromTimeseries,
  TimeseriesState,
} from '../../modules/timeseries';
import AddTimeseries from '../Modals/AddTimeseriesModal';
import { selectAssets } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState, setTimeseriesId } from '../../modules/app';
import { trackUsage } from '../../utils/metrics';
import { sdk } from '../..';

export const SidebarPaneListContent = styled.div`
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
  doFetchTimeseries: typeof fetchTimeseriesForAssetId;
  doRemoveAssetFromTimeseries: typeof removeAssetFromTimeseries;
  setTimeseriesId: typeof setTimeseriesId;
  timeseries: TimeseriesState;
  app: AppState;
} & OrigProps;

type State = {
  showAddTimeseries: boolean;
  timeseriesTablePage: number;
  currentFilterResults?: number[];
};

class TimeseriesSection extends React.Component<Props, State> {
  searchTimeseriesId = 0;

  constructor(props: Props) {
    super(props);

    this.searchTimeseries = debounce(this.searchTimeseries, 700);
    this.state = {
      showAddTimeseries: false,
      timeseriesTablePage: 0,
    };
  }

  searchTimeseries = async (query: string) => {
    const { assetId } = this.props.app;
    if (!query || query === '') {
      this.setState({ currentFilterResults: undefined });
    }
    this.searchTimeseriesId += 1;
    const id = this.searchTimeseriesId;
    const results = await sdk.post(
      `/api/playground/projects/${sdk.project}/timeseries/search`,
      {
        data: {
          filter: {
            ...(assetId && { assetIds: [assetId] }),
          },
          limit: 1000,
          search: { query },
        },
      }
    );
    if (this.searchTimeseriesId === id) {
      this.setState({
        currentFilterResults: results.data.items.map(
          (el: GetTimeSeriesMetadataDTO) => el.id
        ),
      });
      this.searchTimeseriesId = 0;
    }
  };

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

  render() {
    const {
      timeseries: { timeseriesData },
      app: { assetId },
    } = this.props;
    const {
      timeseriesTablePage,
      showAddTimeseries,
      currentFilterResults,
    } = this.state;
    const timeseriesItems = Object.values(timeseriesData).filter(
      el =>
        el.assetId === assetId &&
        (!currentFilterResults || currentFilterResults.includes(el.id))
    );
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
          onChange={ev => this.searchTimeseries(ev.target.value)}
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
              <SidebarPaneListContent>
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
              </SidebarPaneListContent>
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
      doFetchTimeseries: fetchTimeseriesForAssetId,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TimeseriesSection);
