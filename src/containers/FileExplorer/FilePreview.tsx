import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, message, Spin, Table, Icon, Pagination, Tabs } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import { selectAssets, AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { selectApp, AppState, setAssetId } from '../../modules/app';
import { sdk } from '../../index';
import LoaderBPSvg from '../../assets/loader-bp.svg';
import {
  FilesMetadataWithDownload,
  FileExplorerTabsType,
} from './FileExplorer';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { trackUsage } from '../../utils/metrics';
import PNIDViewer from './PNIDViewer';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const { TabPane } = Tabs;

function saveData(blob: Blob, fileName: string) {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';

  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  && .current {
    background-color: #dfdfdf;
  }
`;

type ItemPreviewProps = {
  hideSidebar: string;
};
const ItemPreview = styled.div<ItemPreviewProps>`
  display: flex;
  flex: 1;
  margin-top: 12px;
  overflow: hidden;
  .content {
    border-left: 4px solid #dedede;
    padding-left: 12px;
    flex: ${props => (props.hideSidebar === 'true' ? '0' : '1 300px')};
    min-width: ${props => (props.hideSidebar === 'true' ? '0px' : '400px')};
    overflow: auto;
    position: relative;
    overflow: visible;
    width: 0;
    transition: 0.4s all;
  }
  .preview {
    flex: 3;
    margin-right: 12px;
    background-repeat: no-repeat;
    background-size: contain;
    display: flex;
    flex-direction: column;
  }
  .preview img {
    width: 100%;
  }
`;

const SpinWrapper = styled.div`
  flex: 1;
  display: flex;
  height: 100%;

  && > * {
    align-self: center;
    margin: 0 auto;
  }

  && img {
    width: 36px;
    height: 36px;
  }
`;

const StyledPDFViewer = styled(Document)`
  flex: 1;
  height: 0;
  && {
    overflow: scroll;
  }
`;

const HideButton = styled(Button)`
  && {
    background: #dedede;
    border: none;
    position: absolute;
    left: -21px;
    width: 18px !important;
    padding: 0;
    height: 60px;
    top: 12px;
    display: flex;
    border-radius: 0px;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    align-items: center;
  }

  &&:hover,
  &&:active,
  &&:focus {
    background: #dedede !important;
  }

  && > * {
    margin: 0 auto;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  && > * {
    margin-right: 12px;
    margin-top: 6px;
  }
`;

type OrigProps = {
  selectedDocument: FilesMetadataWithDownload;
  selectDocument: (file: FilesMetadata) => void;
  deleteFile: (fileId: number) => void;
  unselectDocument: () => void;
};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  detectingAsset: boolean;
  hideSidebar: boolean;
  assetResults?: { page: number; name: string }[];
  convertingToSvg?: string;
  selectedAssetId?: number;
  pdfState: { numPages: number; page: number; isError: boolean };
};

class MapModelToAssetForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.fetchFileUrl = debounce(this.fetchFileUrl, 200);
    this.state = {
      detectingAsset: false,
      hideSidebar: false,
      pdfState: {
        numPages: 0,
        page: 1,
        isError: false,
      },
    };
  }

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    if (
      (this.type === 'images' || this.type === 'documents') &&
      !this.state.filePreviewUrl
    ) {
      this.fetchFileUrl();
    }
  }

  get type(): FileExplorerTabsType {
    const { mimeType } = this.props.selectedDocument;
    if (!mimeType) {
      return 'all';
    }
    if (mimeType.toLowerCase().indexOf('pdf') !== -1) {
      return 'documents';
    }
    if (mimeType.toLowerCase().indexOf('svg') !== -1) {
      return 'pnid';
    }
    if (
      mimeType.toLowerCase().indexOf('png') !== -1 ||
      mimeType.toLowerCase().indexOf('jpeg') !== -1
    ) {
      return 'images';
    }
    return 'all';
  }

  fetchFileUrl = async () => {
    const { selectedDocument } = this.props;
    const [url] = await sdk.files.getDownloadUrls([
      { id: selectedDocument.id },
    ]);
    this.setState({
      filePreviewUrl: url.downloadUrl,
    });
  };

  onDownloadClicked = async () => {
    const { selectedDocument } = this.props;
    trackUsage('FilePreview.DownloadFile', { filedId: selectedDocument.id });
    const [url] = await sdk.files.getDownloadUrls([
      { id: selectedDocument.id },
    ]);
    const blob = await this.downloadFile(url.downloadUrl);
    saveData(blob, selectedDocument.name); // saveAs is a part of FileSaver.js
  };

  onDeleteClicked = async () => {
    const { selectedDocument } = this.props;
    this.props.deleteFile(selectedDocument.id);
  };

  downloadFile = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }
    const blob = await response.blob();
    return blob;
  };

  detectAssetClicked = async (fileId: number) => {
    this.setState({ detectingAsset: true });
    try {
      trackUsage('FilePreview.DetectAsset', { fileId });
      const response = await sdk.post(
        `/api/playground/projects/${sdk.project}/context/entity_extraction/extract`,
        {
          data: {
            fileId,
          },
        }
      );

      const names: { page: number; name: string }[] = [];
      response.data.items.forEach(
        (match: { entity: string; pages: number[] }) => {
          const name = match.entity;
          match.pages.forEach(page => {
            names.push({ page, name });
          });
        }
      );

      names.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.name.localeCompare(b.name);
      });

      this.setState({ assetResults: names });
    } catch (e) {
      message.error('Unable to process document, please try again');
      this.setState({ assetResults: undefined, detectingAsset: false });
    }
  };

  onAssetSelected = async (asset: { page: number; name: string }) => {
    trackUsage('FilePreview.DetectAsset.AssetSelected', { asset });
    const [result] = await sdk.assets.search({
      search: { name: asset.name },
    });
    this.props.setAssetId(result.rootId, result.id);
    this.setState(state => ({
      ...state,
      pdfState: {
        ...state.pdfState,
        page: asset.page,
      },
    }));
  };

  renderDocumentAssetDetection = () => {
    const { assetResults, pdfState } = this.state;
    if (!assetResults) {
      return (
        <SpinWrapper>
          <Spin
            indicator={<img src={LoaderBPSvg} alt="" />}
            tip="Extracting assets..."
          />
        </SpinWrapper>
      );
    }
    return (
      <Wrapper>
        <div>
          <Button
            onClick={() =>
              this.setState({ detectingAsset: false, assetResults: undefined })
            }
          >
            <Icon type="arrow-left" />
            Back To File Information
          </Button>
        </div>
        <div style={{ flex: 1, marginTop: '12px' }}>
          <Table
            onRowClick={this.onAssetSelected}
            pagination={false}
            rowClassName={item =>
              item.page === pdfState.page ? 'current' : ''
            }
            columns={[
              {
                key: 'name',
                title: 'Asset Name',
                dataIndex: 'name',
              },
              {
                key: 'page',
                title: 'Page in Document',
                dataIndex: 'page',
              },
            ]}
            dataSource={assetResults}
          />
        </div>
      </Wrapper>
    );
  };

  renderDefaultContentView = () => {
    const { selectedDocument } = this.props;
    const {
      name,
      source,
      mimeType,
      createdTime,
      metadata,
      id,
    } = selectedDocument;
    return (
      <>
        <h1>Name: {name}</h1>
        <ButtonRow>
          <Button onClick={this.onDownloadClicked}>Download File</Button>
          <Button onClick={this.onDeleteClicked}>Delete File</Button>
        </ButtonRow>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Information" key="1">
            <p>Source: {source}</p>
            <p>Type: {mimeType}</p>
            <p>ID: {id}</p>
            <p>Created Date: {moment(createdTime).format('DD/MM/YYYY')}</p>
            <pre>{JSON.stringify(metadata, null, 2)}</pre>
          </TabPane>
          {this.type === 'documents' && (
            <TabPane tab="Utilities" key="2">
              <h2>Detect Assets In Document</h2>
              <p>Find mentioned Assets in your document.</p>
              <Button
                size="large"
                type="primary"
                onClick={() => this.detectAssetClicked(id)}
              >
                Detect Assets
              </Button>
            </TabPane>
          )}
        </Tabs>
      </>
    );
  };

  renderPDF = () => {
    const { filePreviewUrl, pdfState } = this.state;

    if (!filePreviewUrl) {
      return (
        <div className="preview">
          <p>Loading...</p>
        </div>
      );
    }
    if (pdfState.isError) {
      return (
        <div className="preview">
          <p>Unable to Load PDF.</p>
          <Button download href={filePreviewUrl} target="_blank">
            Download File
          </Button>
        </div>
      );
    }

    return (
      <div className="preview">
        {filePreviewUrl ? (
          <>
            <StyledPDFViewer
              file={filePreviewUrl}
              onLoadSuccess={file => {
                trackUsage('FilePreview.PDFLoadingSuccess', {});
                this.setState({
                  pdfState: {
                    numPages: file.numPages,
                    page: 1,
                    isError: false,
                  },
                });
              }}
              onLoadError={() => {
                trackUsage('FilePreview.PDFLoadingFailed', {
                  fileId: this.props.selectedDocument.id,
                });
                this.setState({
                  pdfState: {
                    numPages: 0,
                    page: 1,
                    isError: true,
                  },
                });
              }}
            >
              <Page pageNumber={pdfState.page} />
            </StyledPDFViewer>
            <Pagination
              onChange={page => {
                this.setState(state => ({
                  ...state,
                  pdfState: {
                    ...state.pdfState,
                    page,
                  },
                }));
              }}
              current={pdfState.page}
              total={pdfState.numPages}
              pageSize={1}
            />
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    );
  };

  renderImage = () => {
    const { filePreviewUrl } = this.state;
    return (
      <div
        className="preview"
        style={{ backgroundImage: `url(${filePreviewUrl})` }}
      >
        {!filePreviewUrl && <p>Loading...</p>}
      </div>
    );
  };

  renderPnID = () => {
    return (
      <div className="preview">
        <PNIDViewer
          selectedDocument={this.props.selectedDocument}
          unselectDocument={this.props.unselectDocument}
        />
      </div>
    );
  };

  render() {
    const { detectingAsset, hideSidebar } = this.state;

    return (
      <Wrapper>
        <div>
          <Button onClick={this.props.unselectDocument}>
            <Icon type="arrow-left" />
            BACK
          </Button>
        </div>
        <ItemPreview hideSidebar={hideSidebar ? 'true' : 'false'}>
          {this.type === 'images' && this.renderImage()}
          {this.type === 'documents' && this.renderPDF()}
          {this.type === 'pnid' && this.renderPnID()}
          <div className="content">
            <HideButton
              onClick={() =>
                this.setState(state => ({
                  ...state,
                  hideSidebar: !state.hideSidebar,
                }))
              }
            >
              <Icon type={hideSidebar ? 'caret-left' : 'caret-right'} />
            </HideButton>
            {detectingAsset
              ? this.renderDocumentAssetDetection()
              : this.renderDefaultContentView()}
          </div>
        </ItemPreview>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setAssetId,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
