import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Icon, Pagination, Tabs, Spin } from 'antd';
import moment from 'moment';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import EditFileModal from 'containers/Modals/EditFileModal';
import { selectThreeD, ThreeDState } from 'modules/threed';
import { selectAssets, AssetsState } from 'modules/assets';
import { RootState } from 'reducers/index';
import { selectApp, AppState, setAssetId } from 'modules/app';
import { sdk } from 'index';
import { trackUsage } from 'utils/metrics';
import { FileExplorerTabsType } from '../FileExplorer';
import PNIDViewer from '../PNIDViewer';
import FilePreviewDocumentTab from './FilePreviewDocumentTab';
import ImageAnnotator from './ImageAnnotator';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { selectFiles, fetchFile } from '../../../modules/files';

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
  fileId: number;
  selectDocument: (file: FilesMetadata) => void;
  deleteFile: (fileId: number) => void;
  unselectDocument: () => void;
};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
  fetchFile: typeof fetchFile;
  selectedFile?: FilesMetadata;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  hideSidebar: boolean;
  editFileVisible: boolean;
  pdfState: { numPages: number; page: number; isError: boolean };
};

class FilePreview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.fetchFileUrl = debounce(this.fetchFileUrl, 200);
    this.state = {
      editFileVisible: false,
      hideSidebar: false,
      pdfState: {
        numPages: 0,
        page: 1,
        isError: false,
      },
    };
  }

  componentDidMount() {
    if (!this.props.selectedFile) {
      this.props.fetchFile(this.props.fileId);
    }
    this.fetchFileUrl();
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.selectedFile) {
      this.props.fetchFile(this.props.fileId);
    }
    if (this.props.fileId !== prevProps.fileId) {
      this.fetchFileUrl();
    }
  }

  get type(): FileExplorerTabsType {
    const { mimeType } = this.props.selectedFile!;
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
    const { fileId, selectedFile } = this.props;
    trackUsage('FilePreview.DownloadFile', { filedId: fileId });
    const [url] = await sdk.files.getDownloadUrls([{ id: fileId }]);
    const blob = await this.downloadFile(url.downloadUrl);
    saveData(blob, selectedFile!.name); // saveAs is a part of FileSaver.js
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
    const { selectedFile } = this.props;
    if (!selectedFile) {
      return <Spin />;
    }
    const { pdfState, editFileVisible } = this.state;
    const { name, source, mimeType, createdTime, metadata, id } = selectedFile;
    return (
      <>
        {editFileVisible && (
          <EditFileModal
            file={selectedFile}
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
            <TabPane tab="Utilities" key="2">
              <FilePreviewDocumentTab
                selectedDocument={selectedFile}
                downloadFile={this.downloadFile}
                selectDocument={this.props.selectDocument}
                unselectDocument={this.props.unselectDocument}
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
          file={this.props.selectedFile!}
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
          selectedDocument={this.props.selectedFile!}
          unselectDocument={this.props.unselectDocument}
        />
      </div>
    );
  };

  render() {
    const { hideSidebar } = this.state;
    const { selectedFile } = this.props;

    if (!selectedFile) {
      return <Spin />;
    }

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
            {this.renderFileDetailsPane()}
          </div>
        </ItemPreview>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, props: OrigProps) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
    selectedFile: selectFiles(state).files[props.fileId],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setAssetId,
      fetchFile,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FilePreview);
