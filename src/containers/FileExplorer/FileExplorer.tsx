import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Tabs, Input, Checkbox } from 'antd';
import { FilesMetadata, FilesSearchFilter } from '@cognite/sdk';
import styled from 'styled-components';
import debounce from 'lodash/debounce';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from '../../modules/threed';
import {
  selectAssets,
  AssetsState,
  createNewAsset,
  fetchAssets,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectAppState, AppState } from '../../modules/app';
import { sdk } from '../../index';
// import FilePreview from './FilePreview/FilePreview';
import { trackSearchUsage, trackUsage } from '../../utils/metrics';
import FileUploadTab from './FileUploadTab';
import ImageFilesTab from './ImageFilesTab';
import ListFilesTab from './ListFilesTab';
import { DetectionsAPI } from '../../utils/detectionApi';

const { TabPane } = Tabs;

export type FilesMetadataWithDownload = FilesMetadata & {
  downloadUrl?: string;
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
const FileList = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  .results {
    flex: 1;
    overflow: auto;
  }
`;

const StyledTabs = styled(Tabs)`
  && {
    margin-top: 12px;
    flex: 1;
  }
  && .ant-tabs-content {
    height: 100%;
  }
  && .ant-tabs-tabpane-active {
    height: 100%;
    overflow: auto;
  }
`;

export const FileExplorerTabs: { [key in FileExplorerTabsType]: string } = {
  all: 'All',
  images: 'Images',
  documents: 'Documents',
  pnid: 'Interactive P&IDs',
  upload: 'Upload',
};

export type FileExplorerTabsType =
  | 'all'
  | 'images'
  | 'documents'
  | 'upload'
  | 'pnid';

export const FileExplorerMimeTypes: {
  [key in FileExplorerTabsType]: string[];
} = {
  all: [],
  images: ['image/jpeg', 'image/png'],
  documents: ['application/pdf', 'pdf', 'PDF'],
  pnid: ['application/svg+xml', 'image/svg+xml', 'svg', 'SVG'],
  upload: [],
};

const RELOAD_SEARCH_TABS = ['all', 'images', 'documents', 'pnid'];

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  fetchAssets: typeof fetchAssets;
  createNewAsset: typeof createNewAsset;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = {
  tab: FileExplorerTabsType;
  current: number;
  fetching: boolean;
  searchAnnotation: boolean;
  currentOnly: boolean;
  query: string;
  searchResults: FilesMetadata[];
  selectedDocuments: FilesMetadataWithDownload[];
};

class FileExplorerComponent extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    query: '',
    tab: 'all',
    searchAnnotation: false,
    fetching: false,
    currentOnly: true,
    current: 0,
    searchResults: [],
    selectedDocuments: [],
  };

  currentQuery: number = 0;

  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 700);
  }

  componentDidMount() {
    this.doSearch();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevState.query !== this.state.query ||
      prevState.currentOnly !== this.state.currentOnly ||
      prevState.searchAnnotation !== this.state.searchAnnotation ||
      (prevState.tab !== this.state.tab &&
        RELOAD_SEARCH_TABS.includes(this.state.tab))
    ) {
      this.doSearch(this.state.query);
    }

    if (prevProps.app.assetId !== this.props.app.assetId) {
      this.doSearch(this.state.query);
    }
  }

  get currentDocument() {
    const { selectedDocuments } = this.state;
    return selectedDocuments.length > 0 ? selectedDocuments[0] : undefined;
  }

  doSearch = async (query?: string) => {
    const {
      assets: { all: assets },
      app: { assetId },
    } = this.props;
    const { currentOnly } = this.state;
    this.currentQuery += 1;
    const thisQuery = this.currentQuery;
    const { tab } = this.state;
    const config: FilesSearchFilter = {
      filter: {
        ...(RELOAD_SEARCH_TABS.includes(tab) &&
          FileExplorerMimeTypes[tab].length > 0 && {
            mimeType: FileExplorerMimeTypes[tab][0],
          }),
        ...(assetId && currentOnly && { assetIds: [assetId] }),
      },
      limit: 1000,
    };
    this.setState({ fetching: true, searchResults: [] });
    let results: FilesMetadata[] = [];
    // check if we should search annotation instead!
    if (query && this.state.searchAnnotation && tab === 'images') {
      const detectionApi = new DetectionsAPI(sdk);
      const detections = await detectionApi.search({
        search: {
          description: query,
        },
      });
      if (detections.length !== 0) {
        const ids = new Set<number>();
        detections
          .filter(el => el.fileExternalId)
          .forEach(el => ids.add(Number(el.fileExternalId)));
        const response = await sdk.files.retrieve(
          Array.from(ids).map(id => ({ id }))
        );
        results = response;
      }
      // standard query
    } else if (query && query.length > 0) {
      results = await sdk.files.search({
        search: { name: query },
        ...config,
      });
      const appendResults = [];
      for (let i = 1; i < FileExplorerMimeTypes[tab].length; i += 1) {
        appendResults.push(
          sdk.files.search({
            search: { name: query },
            ...config,
            filter: {
              ...config.filter,
              mimeType: FileExplorerMimeTypes[tab][i],
            },
          })
        );
      }
      (await Promise.all(appendResults)).forEach(arr => {
        results = results.concat(arr);
      });
    } else {
      results = (await sdk.files.list(config)).items;
      const appendResults = [];
      for (let i = 1; i < FileExplorerMimeTypes[tab].length; i += 1) {
        appendResults.push(
          sdk.files.list({
            ...config,
            filter: {
              ...config.filter,
              mimeType: FileExplorerMimeTypes[tab][i],
            },
          })
        );
      }
      (await Promise.all(appendResults)).forEach(arr => {
        results = results.concat(arr.items);
      });
    }
    if (thisQuery === this.currentQuery) {
      trackSearchUsage('FileExplorer', 'File', { query, tab });
      this.setState({
        current: 0,
        searchResults: results.slice(0, results.length),
        fetching: false,
      });
    }
    const extraAssets: Set<number> = results.reduce(
      (prev: Set<number>, el: FilesMetadata) => {
        if (el.assetIds && el.assetIds.length > 0) {
          el.assetIds.filter(id => !assets[id]).forEach(id => prev.add(id));
        }
        return prev;
      },
      new Set<number>()
    );

    if (extraAssets.size > 0) {
      this.props.fetchAssets(Array.from(extraAssets).map(el => ({ id: el })));
    }
  };

  onClickDocument = (document: FilesMetadata, index: number) => {
    const { current, tab } = this.state;
    this.setCurrentDocument(document);
    trackUsage('FileExplorer.SelectItem', {
      index: current * 20 + index,
      tab,
    });
  };

  onDeleteDocumentClicked = async (fileId: number) => {
    const { selectedDocuments } = this.state;
    trackUsage('FilePreview.Delete', { fileId });
    await sdk.files.delete([{ id: fileId }]);
    this.doSearch(this.state.query);
    this.setState({
      selectedDocuments: selectedDocuments.filter(
        document => document.id !== fileId
      ),
    });
  };

  setCurrentDocument = async (file: FilesMetadataWithDownload) => {
    const { selectedDocuments } = this.state;
    this.setState({
      selectedDocuments: [file, ...selectedDocuments],
    });
  };

  backToPreviousDocument = async () => {
    const { selectedDocuments } = this.state;
    this.setState({
      selectedDocuments: selectedDocuments.slice(1),
    });
  };

  setPage = (page: number) => {
    this.setState({ current: page });
  };

  render() {
    const { tab, query, searchResults, current, fetching } = this.state;
    const { assetId } = this.props.app;
    const { currentDocument } = this;
    if (currentDocument) {
      return null;
      // <FilePreview
      //   fileId={currentDocument.id}
      //   deleteFile={this.onDeleteDocumentClicked}
      // />
    }
    let list = <p>Invalid Tab</p>;

    switch (tab) {
      case 'all':
      case 'documents':
        list = (
          <ListFilesTab
            fetching={fetching}
            searchResults={searchResults}
            onClickDocument={this.onClickDocument}
            setPage={this.setPage}
            current={current}
          />
        );
        break;
      case 'pnid':
        list = (
          <ListFilesTab
            fetching={fetching}
            searchResults={searchResults.filter(
              file =>
                file.mimeType && file.mimeType.toLowerCase().includes('svg')
            )}
            onClickDocument={this.onClickDocument}
            setPage={this.setPage}
            current={current}
          />
        );
        break;
      case 'images':
        list = (
          <ImageFilesTab
            fetching={fetching}
            searchResults={searchResults}
            setPage={this.setPage}
            current={current}
            onClickDocument={this.onClickDocument}
          />
        );
        break;
      case 'upload':
        list = (
          <FileUploadTab
            onFileSelected={file => this.onClickDocument(file, 0)}
          />
        );
        break;
      default:
        list = <p>Invalid Tab</p>;
    }
    return (
      <Wrapper>
        <div className="search-row">
          <Input.Search
            placeholder="Filter"
            onChange={ev => this.setState({ query: ev.target.value })}
            value={query}
          />

          <Checkbox
            style={{ marginTop: '6px', marginBottom: '6px' }}
            checked={this.state.currentOnly && assetId !== undefined}
            onChange={ev => this.setState({ currentOnly: ev.target.checked })}
            disabled={assetId === undefined}
          >
            Only Documents Linked to Current Asset
          </Checkbox>
          {tab === 'images' && (
            <Checkbox
              style={{ marginTop: '6px', marginBottom: '6px' }}
              checked={this.state.searchAnnotation}
              onChange={ev =>
                this.setState({ searchAnnotation: ev.target.checked })
              }
            >
              Search based on Annotations
            </Checkbox>
          )}
        </div>
        <StyledTabs
          activeKey={tab}
          tabPosition="left"
          onChange={(selectedTab: string) => {
            trackUsage('FileExplorer.ChangeTab', { selectedTab });
            this.setState({
              tab: selectedTab as FileExplorerTabsType,
              searchResults: [],
              current: 0,
            });
          }}
        >
          {Object.keys(FileExplorerTabs).map((key: string) => (
            <TabPane
              forceRender
              tab={FileExplorerTabs[key as FileExplorerTabsType]}
              key={key as FileExplorerTabsType}
            >
              <FileList>{list}</FileList>
            </TabPane>
          ))}
        </StyledTabs>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
      fetchAssets,
      setRevisionRepresentAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FileExplorerComponent);
