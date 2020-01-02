import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { Input, Icon, Button, Tabs } from 'antd';
import Table, { ColumnProps } from 'antd/lib/table';
import { push } from 'connected-react-router';
import debounce from 'lodash/debounce';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import { sdk } from '../../index';
import { trackUsage } from '../../utils/metrics';
import { addAssetsToState, AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import {
  SearchState,
  setSearchLoading,
  setAssetsTable,
  setTimeseriesTable,
  setFilesTable,
  setThreeDTable,
} from '../../modules/search';
import { ThreeDState, fetchModels } from '../../modules/threed';
import {
  addTimeseriesToState,
  TimeseriesState,
} from '../../modules/timeseries';
import { addFilesToState, FilesState } from '../../modules/files';

const SearchWrapper = styled.div`
  display: flex;
  padding: 40px 55px;

  .ant-input-affix-wrapper {
    flex: 1;
    line-height: 16px;
    max-width: 600px;
    margin-right: 24px;
  }
  .ant-btn-background-ghost.ant-btn-primary {
    color: #000;
    border-color: #000;
  }
`;

const TabWrapper = styled.div`
  .ant-tabs-nav {
    margin-left: 55px;
  }
  .ant-tabs-bar {
    margin-bottom: 0px;
  }
`;

const ResultWrapper = styled.div`
  padding: 26px 56px;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 0;
`;

type TabKeys = 'assets' | 'timeseries' | 'files' | 'threed';

const TabValues: { [key in TabKeys]: string } = {
  assets: 'Assets',
  timeseries: 'Timeseries',
  files: 'Files',
  threed: '3D Models',
};
const UploadString: { [key in TabKeys]: string } = {
  assets: 'Create Asset',
  timeseries: 'Create Timeseries',
  files: 'Upload a File',
  threed: 'Upload a 3D Model',
};

type OrigProps = {
  match: {
    params: {
      tab: TabKeys;
      tenant: string;
    };
  };
};

type Props = {
  assets: AssetsState;
  timeseries: TimeseriesState;
  files: FilesState;
  threed: ThreeDState;
  search: SearchState;
  push: typeof push;
  fetchModels: typeof fetchModels;
  addAssetsToState: typeof addAssetsToState;
  setAssetsTable: typeof setAssetsTable;
  setSearchLoading: typeof setSearchLoading;
  setTimeseriesTable: typeof setTimeseriesTable;
  setFilesTable: typeof setFilesTable;
  setThreeDTable: typeof setThreeDTable;
  addTimeseriesToState: typeof addTimeseriesToState;
  addFilesToState: typeof addFilesToState;
} & OrigProps;

type State = { query: string };

class SearchPage extends React.Component<Props, State> {
  searchIndex = 0;

  doDebouncedSearch: any;

  constructor(props: Props) {
    super(props);

    this.doDebouncedSearch = debounce(this.doSearch, 700);
    this.state = { query: '' };
  }

  componentDidMount() {
    this.doSearch();
    this.props.fetchModels();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.match.params.tab) {
      if (prevProps.match.params.tab !== this.tab) {
        this.doSearch();
      }
    } else if (this.tab !== 'assets') {
      this.doSearch();
    }
  }

  get tab(): TabKeys {
    return this.props.match.params.tab || 'assets';
  }

  get columns(): ColumnProps<any>[] {
    switch (this.tab) {
      default:
        return [
          {
            title: 'Name',
            key: 'name',
            dataIndex: 'name',
          },
          {
            title: 'Description',
            key: 'description',
            dataIndex: 'description',
          },
          {
            title: 'Last Modified',
            key: 'last-modified',
            render: item => {
              return moment(item.updatedTime).format('YYYY-MM-DD hh:mm');
            },
          },
        ];
    }
  }

  get tableData(): any[] {
    const { search, assets, timeseries, files, threed } = this.props;
    switch (this.tab) {
      case 'assets':
        return search.assetsTable.map(id => assets.all[id]);
      case 'timeseries':
        return search.timeseriesTable.map(id => timeseries.timeseriesData[id]);
      case 'files':
        return search.filesTable.map(id => files.files[id]);
      case 'threed':
        return search.threeDTable.map(id => threed.models[id]);
    }
    return [];
  }

  doSearch = async () => {
    this.searchIndex += 1;
    const index = this.searchIndex;
    const { query } = this.state;
    this.props.setSearchLoading();
    trackUsage('SearchPage.search', {
      query,
      tab: this.tab,
    });
    switch (this.tab) {
      case 'assets': {
        const items = await sdk.assets.search({
          ...(query.length > 0 && { search: { query } }),
          limit: 1000,
        });
        this.props.addAssetsToState(items);
        if (this.searchIndex === index) {
          this.props.setAssetsTable(items.map(el => el.id));
          this.searchIndex = 0;
        }
        break;
      }
      case 'timeseries': {
        const items = await sdk.timeseries.search({
          ...(query.length > 0 && { search: { query } }),
          limit: 1000,
        });
        this.props.addTimeseriesToState(items);
        if (this.searchIndex === index) {
          this.props.setTimeseriesTable(items.map(el => el.id));
          this.searchIndex = 0;
        }
        break;
      }
      case 'files': {
        const items = await sdk.files.search({
          ...(query.length > 0 && { search: { name: query } }),
          limit: 1000,
        });
        this.props.addFilesToState(items);
        if (this.searchIndex === index) {
          this.props.setFilesTable(items.map(el => el.id));
          this.searchIndex = 0;
        }
        break;
      }
      case 'threed': {
        const { loading, models } = this.props.threed;
        if (loading) {
          setTimeout(this.doSearch, 1000);
          return;
        }
        const items = Object.keys(models)
          .filter(
            key =>
              query.length === 0 ||
              models[key].name.toLowerCase().indexOf(query.toLowerCase()) > -1
          )
          .map(el => Number(el));
        if (this.searchIndex === index) {
          this.props.setThreeDTable(items);
          this.searchIndex = 0;
        }
        break;
      }
    }
  };

  render() {
    const { query } = this.state;
    const { search } = this.props;
    return (
      <>
        <SearchWrapper>
          <Input
            prefix={<Icon type="search" />}
            placeholder="Search for resources"
            value={query}
            onChange={ev =>
              this.setState({ query: ev.target.value }, this.doDebouncedSearch)
            }
          />
          <Button ghost icon="sliders" type="primary">
            Filters
          </Button>
        </SearchWrapper>
        <TabWrapper>
          <Tabs
            onChange={(tab: string) => {
              this.props.push(
                `/${this.props.match.params.tenant}/search/${tab}`
              );
              this.doSearch();
            }}
          >
            {Object.keys(TabValues).map(key => (
              <Tabs.TabPane
                key={key}
                tab={TabValues[key as TabKeys]}
              ></Tabs.TabPane>
            ))}
          </Tabs>
        </TabWrapper>
        <ResultWrapper>
          <VerticallyCenteredRow>
            <div className="left">
              <p />
            </div>
            <div className="right">
              <Button icon="plus" type="primary">
                {UploadString[this.tab]}
              </Button>
            </div>
          </VerticallyCenteredRow>
          <FlexTableWrapper>
            <Table
              columns={this.columns}
              scroll={{ y: true }}
              pagination={{
                position: 'bottom',
                showQuickJumper: true,
                showSizeChanger: true,
              }}
              loading={search.loading}
              dataSource={this.tableData}
              onRow={(row: any) => ({
                onClick: () => {
                  switch (this.tab) {
                    case 'assets':
                      this.props.push(
                        `/${this.props.match.params.tenant}/asset/${row.id}`
                      );
                      break;
                  }
                },
              })}
            />
          </FlexTableWrapper>
        </ResultWrapper>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: state.assets,
    timeseries: state.timeseries,
    files: state.files,
    threed: state.threed,
    search: state.search,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      push,
      addAssetsToState,
      setSearchLoading,
      setAssetsTable,
      setTimeseriesTable,
      setFilesTable,
      setThreeDTable,
      addTimeseriesToState,
      addFilesToState,
      fetchModels,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);
