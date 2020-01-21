import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { Button, Tabs, message, notification } from 'antd';
import Table, { ColumnProps } from 'antd/lib/table';
import { push } from 'connected-react-router';
import debounce from 'lodash/debounce';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import { FilesMetadata } from '@cognite/sdk';
import AddOrEditAssetModal from 'containers/Modals/AddOrEditAssetModal';
import AddOrEditTimseriesModal from 'containers/Modals/AddOrEditTimseriesModal';
import FileUploadModal from '../Modals/FileUploadModal';
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
import { ThreeDState, ThreeDModel } from '../../modules/threed';
import {
  addTimeseriesToState,
  TimeseriesState,
} from '../../modules/timeseries';
import { addFilesToState, FilesState } from '../../modules/files';
import SearchBar from './SearchBar';

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

export type SearchPageTabKeys = 'assets' | 'timeseries' | 'files' | 'threed';

const TabValues: { [key in SearchPageTabKeys]: string } = {
  assets: 'Assets',
  timeseries: 'Timeseries',
  files: 'Files',
  threed: '3D Models',
};
const UploadString: { [key in SearchPageTabKeys]: string } = {
  assets: 'Create Asset',
  timeseries: 'Create Timeseries',
  files: 'Upload a File',
  threed: 'Upload a 3D Model',
};

type OrigProps = {
  match: {
    params: {
      tab: SearchPageTabKeys;
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
  addAssetsToState: typeof addAssetsToState;
  setAssetsTable: typeof setAssetsTable;
  setSearchLoading: typeof setSearchLoading;
  setTimeseriesTable: typeof setTimeseriesTable;
  setFilesTable: typeof setFilesTable;
  setThreeDTable: typeof setThreeDTable;
  addTimeseriesToState: typeof addTimeseriesToState;
  addFilesToState: typeof addFilesToState;
} & OrigProps;

type State = {
  showModal?: SearchPageTabKeys;
};

class SearchPage extends React.Component<Props, State> {
  searchIndex = 0;

  doDebouncedSearch: any;

  constructor(props: Props) {
    super(props);

    this.doDebouncedSearch = debounce(this.doSearch, 700);
    this.state = {};
  }

  componentDidMount() {
    if (this.props.search.loading) {
      this.doSearch();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.search.loading) {
      if (prevProps.match.params.tab) {
        if (prevProps.match.params.tab !== this.tab) {
          this.props.setSearchLoading();
        }
      } else if (this.tab !== 'assets') {
        this.props.setSearchLoading();
      }
    } else if (this.props.search.loading && !prevProps.search.loading) {
      this.doDebouncedSearch();
    }
  }

  get page() {
    const {
      assetsTable,
      timeseriesTable,
      filesTable,
      threeDTable,
    } = this.props.search;
    switch (this.tab) {
      case 'assets':
        return assetsTable.page;
      case 'files':
        return filesTable.page;
      case 'timeseries':
        return timeseriesTable.page;
      case 'threed':
      default:
        return threeDTable.page;
    }
  }

  get pageSize() {
    const {
      assetsTable,
      timeseriesTable,
      filesTable,
      threeDTable,
    } = this.props.search;
    switch (this.tab) {
      case 'assets':
        return assetsTable.pageSize;
      case 'files':
        return filesTable.pageSize;
      case 'timeseries':
        return timeseriesTable.pageSize;
      case 'threed':
      default:
        return threeDTable.pageSize;
    }
  }

  get tab(): SearchPageTabKeys {
    return this.props.match.params.tab || 'assets';
  }

  get columns(): ColumnProps<any>[] {
    switch (this.tab) {
      case 'assets':
      case 'timeseries':
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
            render: (item: FilesMetadata) => {
              return moment(item.lastUpdatedTime).format('YYYY-MM-DD hh:mm');
            },
          },
        ];
      case 'files':
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
            title: 'File Type',
            key: 'mimeType',
            dataIndex: 'mimeType',
          },
          {
            title: 'Last Modified',
            key: 'last-modified',
            render: (item: FilesMetadata) => {
              return moment(item.lastUpdatedTime).format('YYYY-MM-DD hh:mm');
            },
          },
        ];
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
        return search.assetsTable.items.map(id => assets.all[id]);
      case 'timeseries':
        return search.timeseriesTable.items.map(
          id => timeseries.timeseriesData[id]
        );
      case 'files':
        return search.filesTable.items.map(id => files.files[id]);
      case 'threed':
        return search.threeDTable.items.map(id => threed.models[id]);
    }
    return [];
  }

  doSearch = async () => {
    this.searchIndex += 1;
    const index = this.searchIndex;
    const {
      assetFilter,
      timeseriesFilter,
      fileFilter,
      assetsTable,
      timeseriesTable,
      filesTable,
      threeDTable,
      query,
    } = this.props.search;
    trackUsage('SearchPage.search', {
      assetFilter,
      timeseriesFilter,
      fileFilter,
      query,
      tab: this.tab,
    });
    switch (this.tab) {
      case 'assets': {
        const items = await sdk.assets.search({
          ...assetFilter,
          limit: 1000,
        });
        await this.props.addAssetsToState(items);
        if (this.searchIndex === index) {
          this.props.setAssetsTable({
            ...assetsTable,
            items: items.map(el => el.id),
            page: 0,
          });
          this.searchIndex = 0;
        }
        break;
      }
      case 'timeseries': {
        const items = await sdk.timeseries.search({
          ...timeseriesFilter,
          limit: 1000,
        });
        await this.props.addTimeseriesToState(items);
        if (this.searchIndex === index) {
          this.props.setTimeseriesTable({
            ...timeseriesTable,
            items: items.map(el => el.id),
            page: 0,
          });
          this.searchIndex = 0;
        }
        break;
      }
      case 'files': {
        const items = await sdk.files.search({
          ...fileFilter,
          limit: 1000,
        });
        await this.props.addFilesToState(items);
        if (this.searchIndex === index) {
          this.props.setFilesTable({
            ...filesTable,
            items: items.map(el => el.id),
            page: 0,
          });
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
          this.props.setThreeDTable({ ...threeDTable, items, page: 0 });
          this.searchIndex = 0;
        }
        break;
      }
    }
  };

  hideModal = () => {
    this.setState({ showModal: undefined });
  };

  renderModal = () => {
    const { showModal } = this.state;
    switch (showModal) {
      case 'files':
        return (
          <FileUploadModal
            onCancel={this.hideModal}
            onFileSelected={file => this.goToPage({ id: file.id })}
          />
        );
      case 'assets':
        return (
          <AddOrEditAssetModal
            onClose={asset => {
              if (asset) {
                this.goToPage({ id: asset.id });
              } else {
                this.hideModal();
              }
            }}
          />
        );
      case 'timeseries':
        return (
          <AddOrEditTimseriesModal
            onClose={timeseries => {
              if (timeseries) {
                this.goToPage({ id: timeseries.id });
              } else {
                this.hideModal();
              }
            }}
          />
        );
    }
    return null;
  };

  goToPage = (row: any) => {
    switch (this.tab) {
      case 'assets':
        this.props.push(`/${this.props.match.params.tenant}/asset/${row.id}`);
        break;
      case 'timeseries':
        this.props.push(
          `/${this.props.match.params.tenant}/timeseries/${row.id}`
        );
        break;
      case 'files':
        this.props.push(`/${this.props.match.params.tenant}/file/${row.id}`);
        break;
      case 'threed': {
        const model = row as ThreeDModel;
        if (model.revisions && model.revisions.length > 0) {
          this.props.push(
            `/${this.props.match.params.tenant}/threed/${model.id}/${model.revisions[0].id}`
          );
        } else {
          message.info('Unable to preview model');
        }
        break;
      }
    }
  };

  onShowAddResource = () => {
    if (this.tab === 'threed') {
      notification.info({
        message: 'Please upload 3D Model in Console',
        description: (
          <p>
            Go to{' '}
            <a
              href={`https://console.cognitedata.com/${this.props.match.params.tenant}/3d-models`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Console
            </a>{' '}
            and upload the 3D Model there!
          </p>
        ),
      });
    } else {
      this.setState({ showModal: this.tab });
    }
  };

  onPaginationChange = (page: number, pageSize?: number) => {
    const {
      assetsTable,
      timeseriesTable,
      filesTable,
      threeDTable,
    } = this.props.search;
    switch (this.tab) {
      case 'assets':
        this.props.setAssetsTable({
          ...assetsTable,
          page,
          pageSize: pageSize || 10,
        });
        return;
      case 'files':
        this.props.setFilesTable({
          ...filesTable,
          page,
          pageSize: pageSize || 10,
        });
        return;
      case 'timeseries':
        this.props.setTimeseriesTable({
          ...timeseriesTable,
          page,
          pageSize: pageSize || 10,
        });
        return;
      case 'threed':
        this.props.setThreeDTable({
          ...threeDTable,
          page,
          pageSize: pageSize || 10,
        });
    }
  };

  render() {
    const { search } = this.props;
    return (
      <>
        <SearchBar tab={this.tab} />
        <TabWrapper>
          <Tabs
            onChange={(tab: string) => {
              this.props.push(
                `/${this.props.match.params.tenant}/search/${tab}`
              );
              this.doSearch();
            }}
            activeKey={this.tab}
          >
            {Object.keys(TabValues).map(key => (
              <Tabs.TabPane
                key={key}
                tab={TabValues[key as SearchPageTabKeys]}
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
              <Button
                icon="plus"
                type="primary"
                onClick={this.onShowAddResource}
              >
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
                pageSize: this.pageSize,
                current: this.page,
                onChange: this.onPaginationChange,
              }}
              loading={search.loading}
              dataSource={this.tableData}
              onRow={(row: any) => ({
                onClick: () => {
                  this.goToPage(row);
                },
              })}
            />
          </FlexTableWrapper>
        </ResultWrapper>
        {this.renderModal()}
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
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);
