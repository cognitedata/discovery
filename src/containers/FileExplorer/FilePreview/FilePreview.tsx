import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Pagination, Tabs, Spin } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import Placeholder from 'components/Placeholder';
import EditFileModal from 'containers/Modals/EditFileModal';
import { selectThreeD, ThreeDState } from 'modules/threed';
import { selectAssets, AssetsState } from 'modules/assets';
import { RootState } from 'reducers/index';
import { sdk } from 'index';
import { trackUsage } from 'utils/metrics';
import { FileExplorerTabsType } from '../FileExplorer';
import PNIDViewer from '../PNIDViewer';
import FilePreviewDocumentTab from './FilePreviewDocumentTab';
import ImageAnnotator from './ImageAnnotator';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { selectFiles, fetchFile } from '../../../modules/files';
import { BetaBadge } from '../../../components/BetaWarning';

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
  .preview {
    flex: 3;
    overflow: hidden;
    margin-right: 12px;
    background-repeat: no-repeat;
    background-size: contain;
    display: flex;
    flex-direction: column;
  }
  .preview img {
    height: 100%;
    width: 100%;
  }
  .preview .react-transform-component {
    height: 100%;
    overflow: scroll;
  }
`;

const StyledPDFViewer = styled(Document)`
  flex: 1;
  height: 0;
  && {
    overflow: scroll;
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
  fileId: number;
  deleteFile: (fileId: number) => void;
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
  editFileVisible: boolean;
  pdfState: { numPages: number; page: number; isError: boolean };
};

class FilePreview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.fetchFileUrl = debounce(this.fetchFileUrl, 200);
    this.state = {
      editFileVisible: false,
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

  onDownloadClicked = async () => {
    const { fileId, file } = this.props;
    trackUsage('FilePreview.DownloadFile', { filedId: fileId });
    const [url] = await sdk.files.getDownloadUrls([{ id: fileId }]);
    const blob = await this.downloadFile(url.downloadUrl);
    saveData(blob, file!.name); // saveAs is a part of FileSaver.js
  };

  onDeleteClicked = async () => {
    const { fileId } = this.props;
    this.props.deleteFile(fileId);
  };

  onEditClicked = async () => {
    this.setState({ editFileVisible: true });
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
    const { pdfState, editFileVisible } = this.state;
    const { name, source, mimeType, createdTime, metadata, id } = file;
    return (
      <>
        {editFileVisible && (
          <EditFileModal
            file={file}
            onClose={() => this.setState({ editFileVisible: false })}
          />
        )}
        <h1>Name: {name}</h1>
        <ButtonRow>
          <Button onClick={this.onDownloadClicked}>Download File</Button>
          <Button onClick={this.onEditClicked}>Edit File</Button>
          <Button
            type="danger"
            ghost
            icon="delete"
            onClick={this.onDeleteClicked}
          />
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
            <TabPane tab={<BetaBadge>Utilities</BetaBadge>} key="2">
              <FilePreviewDocumentTab
                selectedDocument={file}
                downloadFile={this.downloadFile}
                deleteFile={this.props.deleteFile}
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
    if (this.state.filePreviewUrl) {
      return (
        <ImageAnnotator
          file={this.props.file!}
          filePreviewUrl={this.state.filePreviewUrl!}
        />
      );
    }
    return null;
  };

  renderPnID = () => {
    return (
      <div className="preview">
        <PNIDViewer
          assetId={this.props.assetId}
          selectedDocument={this.props.file!}
          onAssetClicked={this.props.onAssetClicked}
          onFileClicked={this.props.onFileClicked}
        />
      </div>
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
