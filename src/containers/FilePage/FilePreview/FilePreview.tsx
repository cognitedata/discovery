import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import {
  Button,
  Pagination,
  message,
  Popover,
  notification,
  Icon,
  Table,
} from 'antd';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import Placeholder from 'components/Placeholder';
import { ThreeDState } from 'modules/threed';
import { AssetsState } from 'modules/assets';
import { RootState } from 'reducers/index';
import { sdk } from 'utils/SDK';
import { trackUsage } from 'utils/Metrics';
import LoadingWrapper from 'components/LoadingWrapper';
import { fetchFile, updateFile } from 'modules/files';
import AssetSelect from 'components/AssetSelect';
import {
  canReadFiles,
  canEditFiles,
  canReadAssets,
} from 'utils/PermissionsUtils';
import PNIDViewer from './PNIDViewer';
import {
  convertPDFtoPNID,
  detectAssetsInDocument,
  getMIMEType,
} from '../FileUtils';
import ImageDetectionPreview from './ImagePreview/ImageDetectionPreview';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export type FileType = 'all' | 'images' | 'documents' | 'pnid';

const Wrapper = styled.div`
  display: flex;
  position: relative;
  flex-direction: row;
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
  height: 100%;
  && {
    position: relative;
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

const DetectedAssetsResultWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 300px;

  && .current {
    background-color: #dfdfdf;
  }

  .header {
    display: flex;
    padding: 12px 24px;
    align-items: center;
    p {
      flex: 1;
      margin-bottom: 0px;
    }
  }
`;

type OrigProps = {
  fileId: number;
  onAssetClicked: (id: number) => void;
  onFileClicked: (id: number) => void;
};

type Props = {
  file?: FilesMetadata;
  assetId?: number;
  assets: AssetsState;
  threed: ThreeDState;
  fetchFile: typeof fetchFile;
  updateFile: typeof updateFile;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  pnidSelectedAssetId?: number;
  detectionSelectedAssetId?: number;
  convertToPDFVisible: boolean;
  detectAssetsVisible: boolean;
  runningPnID: boolean;
  runningDetectAssets: boolean;
  pdfState: { numPages: number; page: number; isError: boolean };
  detectedAssetsResult?: { name: string; page: number }[];
};

class FilePreview extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.fetchFileUrl = debounce(this.fetchFileUrl, 200);
    this.state = {
      detectAssetsVisible: false,
      convertToPDFVisible: false,
      runningPnID: false,
      runningDetectAssets: false,
      pdfState: {
        numPages: 0,
        page: 1,
        isError: false,
      },
    };
  }

  componentDidMount() {
    trackUsage('FilePage.FilePreview.Load', {
      id: this.props.fileId,
    });
    if (!this.props.file) {
      this.props.fetchFile(this.props.fileId);
    } else {
      this.showMimeTypeCheck();
    }
    this.fetchFileUrl();
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.file) {
      this.props.fetchFile(this.props.fileId);
    } else if (
      (!prevProps.file && this.props.file) ||
      (prevProps.file && prevProps.file.id !== this.props.file.id)
    ) {
      this.showMimeTypeCheck();
    }
    if (this.props.fileId !== prevProps.fileId) {
      this.fetchFileUrl();
    }
  }

  get type(): FileType {
    const { mimeType } = this.props.file!;
    const extension = this.props.file!.name.split('.').pop() || '';
    // check by name
    if (['png', 'jpg', 'jpeg'].indexOf(extension.toLowerCase()) !== -1) {
      return 'images';
    }
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
      mimeType.toLowerCase().indexOf('jpg') !== -1 ||
      mimeType.toLowerCase().indexOf('jpeg') !== -1
    ) {
      return 'images';
    }
    return 'all';
  }

  fetchFileUrl = async () => {
    if (canReadFiles()) {
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
    }
  };

  showMimeTypeCheck = async () => {
    if (this.props.file) {
      const { name, mimeType, id } = this.props.file;
      const detectedMimeType = getMIMEType(name);
      if (
        detectedMimeType &&
        mimeType !== detectedMimeType &&
        canEditFiles(false)
      ) {
        notification.open({
          message: 'Fix Mime Type',
          description: `The current file type is ${mimeType}, however, based on the name, the file should be typed as ${detectedMimeType}`,
          btn: (
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                await this.props.updateFile({
                  id,
                  update: { mimeType: { set: detectedMimeType } },
                });
                notification.close('fix-mimetype');
              }}
            >
              Confirm Change
            </Button>
          ),
          key: 'fix-mimetype',
        });
      }
    }
  };

  handlePnIDPopover = (visible: boolean) => {
    trackUsage('FilePage.FilePreview.P&IDPopover', {
      visible,
    });
    if (this.state.pdfState.numPages !== 1) {
      message.info(
        'Sorry, this feature is only avilable for Single Page PDFs.'
      );
      return;
    }
    if (this.state.runningPnID) {
      message.info('Sorry, only 1 parsing job is allowed at a time!');
      return;
    }
    this.setState({ convertToPDFVisible: visible });
  };

  handleDetectAssetsPopover = (visible: boolean) => {
    trackUsage('FilePage.FilePreview.DetectAssetPopover', {
      visible,
    });
    if (this.state.runningDetectAssets) {
      message.info('Sorry, only asset detection job allowed at a time!');
      return;
    }
    this.setState({ detectAssetsVisible: visible });
  };

  onConvertToPnIDClicked = async () => {
    trackUsage('FilePage.FilePreview.ConvertToP&ID', {
      id: this.props.fileId,
    });
    const CONVERT_PNID_NOTIF_KEY = 'convert-pnid';
    const { pnidSelectedAssetId } = this.state;
    if (this.props.file && pnidSelectedAssetId) {
      const notifConfig = {
        key: CONVERT_PNID_NOTIF_KEY,
        icon: <Icon type="loading" />,
        duration: 0,
        message: 'Convert to Interactive P&ID',
        description: 'Preparing...',
      };
      notification.open(notifConfig);
      this.setState({ runningPnID: true, convertToPDFVisible: false });
      convertPDFtoPNID(this.props.file, pnidSelectedAssetId, {
        callbackProgress: (progress: string) => {
          notification.open({ ...notifConfig, description: progress });
        },
        callbackResult: (file: FilesMetadata) => {
          notification.open({
            ...notifConfig,
            icon: (
              <Icon
                type="check-circle"
                theme="twoTone"
                twoToneColor="#52c41a"
              />
            ),
            duration: 4.5,
            description: 'Completed',
          });
          this.props.onFileClicked(file.id);
          this.setState({ runningPnID: false });
        },
        callbackError: (error: any) => {
          notification.open({
            ...notifConfig,
            icon: (
              <Icon type="warning" theme="twoTone" twoToneColor="#eb2f96" />
            ),
            description: error,
            duration: 4.5,
          });
          this.setState({ runningPnID: false });
        },
      });
    } else {
      message.info('Please select an asset first!');
    }
  };

  onDetectAssetsClicked = async () => {
    trackUsage('FilePage.FilePreview.DetectAsset', {
      id: this.props.fileId,
    });
    const DETECT_ASSETS_NOTIF_KEY = 'detect-assets';
    const { detectionSelectedAssetId } = this.state;
    if (this.props.file) {
      const notifConfig = {
        key: DETECT_ASSETS_NOTIF_KEY,
        icon: <Icon type="loading" />,
        duration: 0,
        message: 'Detecting Assets',
        description: 'Preparing...',
      };
      notification.open(notifConfig);
      this.setState({ runningDetectAssets: true, detectAssetsVisible: false });
      detectAssetsInDocument(
        this.props.file,
        {
          callbackProgress: (progress: string) => {
            notification.open({ ...notifConfig, description: progress });
          },
          callbackResult: results => {
            notification.open({
              ...notifConfig,
              icon: (
                <Icon
                  type="check-circle"
                  theme="twoTone"
                  twoToneColor="#52c41a"
                />
              ),
              duration: 4.5,
              description: 'Completed',
            });
            this.setState({
              runningDetectAssets: false,
              detectedAssetsResult: results,
            });
          },
          callbackError: (error: any) => {
            notification.open({
              ...notifConfig,
              icon: (
                <Icon type="warning" theme="twoTone" twoToneColor="#eb2f96" />
              ),
              description: error,
              duration: 4.5,
            });
            this.setState({ runningDetectAssets: false });
          },
        },
        detectionSelectedAssetId
      );
    } else {
      message.info('Please select an asset first!');
    }
  };

  renderDocumentAssetDetection = () => {
    const { detectedAssetsResult, pdfState } = this.state;
    if (!detectedAssetsResult || !pdfState) {
      return null;
    }
    return (
      <DetectedAssetsResultWrapper>
        <div className="header">
          <p>Detected Assets</p>
          <Button
            onClick={() => this.setState({ detectedAssetsResult: undefined })}
          >
            <Icon type="close-circle" />
            Close
          </Button>
        </div>
        <div style={{ flex: 1, marginTop: '12px', overflow: 'auto' }}>
          <Table
            onRow={item => ({
              onClick: () =>
                this.setState({ pdfState: { ...pdfState, page: item.page } }),
            })}
            pagination={false}
            rowClassName={item =>
              item.page === pdfState.page ? 'current' : ''
            }
            columns={[
              {
                key: 'name',
                title: 'Asset Name',
                render: item => (
                  <Button
                    onClick={async ev => {
                      ev.stopPropagation();
                      const [asset] = await sdk.assets.search({
                        search: { name: item.name },
                        limit: 1,
                      });
                      if (asset) {
                        trackUsage(
                          'FilePage.FilePreview.DetectAsset.ViewAsset',
                          {
                            id: this.props.fileId,
                            assetId: asset.id,
                          }
                        );
                        this.props.onAssetClicked(asset.id);
                      }
                    }}
                  >
                    {item.name}
                    <Icon type="arrow-right" />
                  </Button>
                ),
              },
              {
                key: 'page',
                title: 'Page',
                dataIndex: 'page',
              },
            ]}
            dataSource={detectedAssetsResult}
          />
        </div>
      </DetectedAssetsResultWrapper>
    );
  };

  renderConvertPnIDButton = () => {
    const {
      pdfState,
      convertToPDFVisible,
      pnidSelectedAssetId,
      runningPnID,
    } = this.state;
    return (
      <Popover
        title="Convert to Interactive P&ID"
        content={
          <>
            <p>Detect assets under the following asset</p>
            <div>
              <AssetSelect
                rootOnly
                style={{ marginRight: '12px', width: '300px' }}
                selectedAssetIds={
                  pnidSelectedAssetId ? [pnidSelectedAssetId] : []
                }
                onAssetSelected={ids =>
                  this.setState({ pnidSelectedAssetId: ids[0] })
                }
              />
              <Button
                disabled={!pnidSelectedAssetId}
                onClick={this.onConvertToPnIDClicked}
              >
                Convert
              </Button>
            </div>
          </>
        }
        trigger="click"
        visible={convertToPDFVisible}
        onVisibleChange={this.handlePnIDPopover}
      >
        <Button
          shape="round"
          disabled={pdfState.numPages !== 1 || !canEditFiles(false)}
          loading={runningPnID}
        >
          Convert to Interactive P&ID
        </Button>
      </Popover>
    );
  };

  renderDetectAssetsButton = () => {
    const {
      detectAssetsVisible,
      detectionSelectedAssetId,
      runningDetectAssets,
    } = this.state;
    return (
      <Popover
        title="Detect Assets in Document"
        content={
          <>
            <p>Detect assets under the following asset</p>
            <div>
              <AssetSelect
                rootOnly
                style={{ marginRight: '12px', width: '300px' }}
                selectedAssetIds={
                  detectionSelectedAssetId ? [detectionSelectedAssetId] : []
                }
                onAssetSelected={ids =>
                  this.setState({ detectionSelectedAssetId: ids[0] })
                }
              />
              <Button
                disabled={!canReadAssets(false)}
                onClick={this.onDetectAssetsClicked}
              >
                Detect Assets
              </Button>
            </div>
          </>
        }
        trigger="click"
        visible={detectAssetsVisible}
        onVisibleChange={this.handleDetectAssetsPopover}
      >
        <Button shape="round" loading={runningDetectAssets}>
          Detect Assets
        </Button>
      </Popover>
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
          <PDFContextButton>
            {this.renderConvertPnIDButton()}
            {this.renderDetectAssetsButton()}
          </PDFContextButton>
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
        </StyledPDFViewer>
        {this.renderDocumentAssetDetection()}
      </>
    );
  };

  renderImage = () => {
    if (this.state.filePreviewUrl && this.props.file) {
      return (
        <ImageDetectionPreview
          file={this.props.file}
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
      return (
        <LoadingWrapper>
          <p>Loading File...</p>
        </LoadingWrapper>
      );
    }

    return <Wrapper>{this.renderContent()}</Wrapper>;
  }
}

const mapStateToProps = (state: RootState, props: OrigProps) => {
  return {
    threed: state.threed,
    assets: state.assets,
    file: state.files.items[props.fileId],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchFile,
      updateFile,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(FilePreview);
