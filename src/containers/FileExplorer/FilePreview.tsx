import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Divider, message, Spin, Table, Icon, Pagination } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
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

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  && .current {
    background-color: #dfdfdf;
  }
`;

const ItemPreview = styled.div`
  display: flex;
  flex: 1;
  margin-top: 12px;
  overflow: hidden;
  .content {
    flex: 2;
    overflow: auto;
  }
  .preview {
    flex: 1 400px;
    margin-right: 12px;
    min-width: 400px;
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

type OrigProps = {
  selectedDocument: FilesMetadataWithDownload;
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
  assetResults?: { page: number; name: string }[];

  pdfState: { numPages: number; page: number; isError: boolean };
};

class MapModelToAssetForm extends React.Component<Props, State> {
  state: Readonly<State> = {
    detectingAsset: false,
    pdfState: {
      numPages: 0,
      page: 1,
      isError: false,
    },
  };

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

  detectAssetClicked = async (fileId: number) => {
    this.setState({ detectingAsset: true });
    try {
      trackUsage('FilePreview.DetectAsset', { fileId });
      const response = await sdk.post(
        `/api/playground/projects/${sdk.project}/context/string-matcher/extract`,
        {
          data: {
            pdf_file_id: fileId,
          },
        }
      );
      const names = response.data.reduce(
        (prev: { page: number; name: string }[], data: string[], i: number) => {
          data.forEach(name => prev.push({ page: i + 1, name }));
          return prev;
        },
        [] as { page: number; name: string }[]
      );
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
            tip="Loading...."
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
        <p>Name: {name}</p>
        <p>Source: {source}</p>
        <p>Type: {mimeType}</p>
        <p>ID: {id}</p>
        <p>Created Date: {moment(createdTime).format('DD/MM/YYYY')}</p>
        <pre>{JSON.stringify(metadata, null, 2)}</pre>

        <Divider />
        <Button onClick={() => message.info('Coming soon...')}>
          Link to Asset
        </Button>
        <br />
        <br />
        <Button onClick={() => message.info('Coming soon...')}>
          Add Labels
        </Button>
        <Button onClick={() => message.info('Coming soon...')}>Add Type</Button>
        <Button onClick={() => message.info('Coming soon...')}>
          Add Metadata
        </Button>
        {this.type === 'documents' && (
          <>
            <Divider />
            <Button
              size="large"
              type="primary"
              onClick={() => this.detectAssetClicked(id)}
            >
              Detect Assets In Document
            </Button>
          </>
        )}
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

  render() {
    const { filePreviewUrl, detectingAsset } = this.state;

    return (
      <Wrapper>
        <div>
          <Button onClick={this.props.unselectDocument}>
            <Icon type="arrow-left" />
            BACK
          </Button>
        </div>
        <ItemPreview>
          {this.type === 'images' && (
            <div
              className="preview"
              style={{ backgroundImage: `url(${filePreviewUrl})` }}
            >
              {!filePreviewUrl && <p>Loading...</p>}
            </div>
          )}
          {this.type === 'documents' && this.renderPDF()}
          <div className="content">
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
