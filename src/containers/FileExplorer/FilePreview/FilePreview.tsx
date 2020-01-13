import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Pagination, Tabs, Spin, message } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import Placeholder from 'components/Placeholder';
import { selectThreeD, ThreeDState } from 'modules/threed';
import { selectAssets, AssetsState } from 'modules/assets';
import { RootState } from 'reducers/index';
import { sdk } from 'index';
import { trackUsage } from 'utils/metrics';
import LoadingWrapper from 'components/LoadingWrapper';
import { FileExplorerTabsType } from '../FileExplorer';
import PNIDViewer from '../PNIDViewer';
import FilePreviewDocumentTab from './FilePreviewDocumentTab';
import ImageAnnotator from './ImageAnnotator';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { selectFiles, fetchFile } from '../../../modules/files';
import { BetaBadge } from '../../../components/BetaWarning';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const { TabPane } = Tabs;

const Wrapper = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-repeat: no-repeat;
  background-size: contain;

  && .current {
    background-color: #dfdfdf;
  }
  img {
    height: 100%;
    width: 100%;
  }
`;

const StyledPDFViewer = styled(Document)`
  flex: 1;
  height: 0;
  && {
    overflow: scroll;
    display: flex;
    background: #fafafa;
    align-items: center;
  }

  .react-pdf__message {
    height: 100%;
    width: 100%;
    background: #fff;
    display: flex;
    align-items: center;
  }

  .react-pdf__Page {
    margin: 0 auto;
  }

  .react-pdf__Page__canvas {
    padding: 40px;
  }
`;

const DocumentPagination = styled(Pagination)`
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  bottom: 34px;
  && {
    background: #fff;
    border-radius: 50px;
    padding: 12px 24px;
    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.1);
  }
`;

const PDFContextButton = styled.div`
  position: absolute;
  right: 32px;
  top: 34px;
  && > * {
    margin-left: 16px;
    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.1);
  }
`;

type OrigProps = {
  fileId: number;
  onAssetClicked: (id: number) => void;
  onFileClicked: (id: number) => void;
};

type Props = {
  assetId?: number;
  assets: AssetsState;
  threed: ThreeDState;
  fetchFile: typeof fetchFile;
  file?: FilesMetadata;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  pdfState: { numPages: number; page: number; isError: boolean };
};

class FilePreview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.fetchFileUrl = debounce(this.fetchFileUrl, 200);
    this.state = {
      pdfState: {
        numPages: 0,
        page: 1,
        isError: false,
      },
    };
  }

  componentDidMount() {
    if (!this.props.file) {
      this.props.fetchFile(this.props.fileId);
    }
    this.fetchFileUrl();
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.file) {
      this.props.fetchFile(this.props.fileId);
    }
    if (this.props.fileId !== prevProps.fileId) {
      this.fetchFileUrl();
    }
  }

  get type(): FileExplorerTabsType {
    const { mimeType } = this.props.file!;
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
    this.setState(
      {
        filePreviewUrl: undefined,
      },
      async () => {
        const { fileId } = this.props;
        const [url] = await sdk.files.getDownloadUrls([{ id: fileId }]);
        this.setState({
          filePreviewUrl: url.downloadUrl,
        });
      }
    );
  };

  downloadFile = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }
    const blob = await response.blob();
    return blob;
  };

  renderFileDetailsPane = () => {
    const { file } = this.props;
    if (!file) {
      return <Spin />;
    }
    const { pdfState } = this.state;
    const { name, source, mimeType, createdTime, metadata, id } = file;
    return (
      <>
        <h1>Name: {name}</h1>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Information" key="1">
            <p>Source: {source}</p>
            <p>Type: {mimeType}</p>
            <p>ID: {id}</p>
            <p>Created Date: {moment(createdTime).format('DD/MM/YYYY')}</p>
            <pre>{JSON.stringify(metadata, null, 2)}</pre>
          </TabPane>
          {this.type === 'documents' && (
            <TabPane tab={<BetaBadge>Utilities</BetaBadge>} key="2">
              <FilePreviewDocumentTab
                selectedDocument={file}
                downloadFile={this.downloadFile}
                isPnIDParsingAllowed={pdfState.numPages === 1}
                currentPage={pdfState.page}
                setPage={page =>
                  this.setState({ pdfState: { ...pdfState, page } })
                }
              />
            </TabPane>
          )}
        </Tabs>
      </>
    );
  };

  renderPDF = () => {
    const { filePreviewUrl, pdfState } = this.state;

    if (pdfState.isError) {
      return (
        <>
          <p>Unable to Load PDF.</p>
          <Button download href={filePreviewUrl} target="_blank">
            Download File
          </Button>
        </>
      );
    }

    return (
      <>
        <StyledPDFViewer
          file={filePreviewUrl}
          loading={
            <div style={{ flex: 1, alignItems: 'center', alignSelf: 'center' }}>
              <LoadingWrapper>
                <p>Loading File...</p>
              </LoadingWrapper>
            </div>
          }
          noData={
            <div style={{ flex: 1, alignItems: 'center', alignSelf: 'center' }}>
              <Placeholder componentName="No PDF Specified" />
            </div>
          }
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
          onLoadError={async () => {
            trackUsage('FilePreview.PDFLoadingFailed', {
              fileId: this.props.fileId,
            });
            await this.fetchFileUrl();
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
        <DocumentPagination
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
          showQuickJumper
          size="small"
        />
        <PDFContextButton>
          <Button shape="round" onClick={() => message.info('Coming Soon...')}>
            Convert to P&ID
          </Button>
          <Button shape="round" onClick={() => message.info('Coming Soon...')}>
            Detect Asset
          </Button>
        </PDFContextButton>
      </>
    );
  };

  renderImage = () => {
    if (this.state.filePreviewUrl) {
      return (
        <ImageAnnotator
          file={this.props.file!}
          filePreviewUrl={this.state.filePreviewUrl!}
        />
      );
    }

    return (
      <LoadingWrapper>
        <p>Loading Image...</p>
      </LoadingWrapper>
    );
  };

  renderPnID = () => {
    return (
      <PNIDViewer
        assetId={this.props.assetId}
        selectedDocument={this.props.file!}
        onAssetClicked={this.props.onAssetClicked}
        onFileClicked={this.props.onFileClicked}
      />
    );
  };

  renderContent = () => {
    switch (this.type) {
      case 'images':
        return this.renderImage();
      case 'documents':
        return this.renderPDF();
      case 'pnid':
        return this.renderPnID();
      default:
        return (
          <Placeholder
            text="Unable to Preview File"
            componentName={this.props.file!.name}
          />
        );
    }
  };

  render() {
    const { file } = this.props;

    if (!file) {
      return <Spin />;
    }

    return <Wrapper>{this.renderContent()}</Wrapper>;
  }
}

const mapStateToProps = (state: RootState, props: OrigProps) => {
  return {
    threed: selectThreeD(state),
    assets: selectAssets(state),
    file: selectFiles(state).files[props.fileId],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchFile,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(FilePreview);
