import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, notification, Modal } from 'antd';
import styled from 'styled-components';
import { push, goBack } from 'connected-react-router';
import FilePreview from './FilePreview';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import FileSidebar from './FileSidebar';
import {
  selectFiles,
  FilesState,
  fetchFile,
  deleteFile,
} from '../../modules/files';
import { trackUsage } from '../../utils/Metrics';
import { sdk } from '../../index';
import { downloadFile } from './FileUtils';
import { canReadFiles, canEditFiles } from '../../utils/PermissionsUtils';

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

const BackSection = styled.div`
  padding: 22px 26px;
  border-bottom: 1px solid #d9d9d9;
`;

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  height: 0;
`;

const FileView = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

type OrigProps = {
  match: {
    params: {
      itemId?: number;
      fileId: number;
      tenant: string;
    };
  };
};

type Props = {
  files: FilesState;
  fetchFile: typeof fetchFile;
  deleteFile: typeof deleteFile;
  push: typeof push;
  goBack: typeof goBack;
} & OrigProps;

type State = {};

class FilePage extends React.Component<Props, State> {
  postDeleted = false;

  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    trackUsage('FilePage.Load', {
      id: this.props.match.params.fileId,
    });
    canReadFiles();
    if (!this.file) {
      this.props.fetchFile(this.props.match.params.fileId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.match.params.fileId !== prevProps.match.params.fileId) {
      this.props.fetchFile(this.props.match.params.fileId);
    }
  }

  get tenant() {
    return this.props.match.params.tenant;
  }

  get file() {
    return this.props.files.files[this.props.match.params.fileId];
  }

  get itemId() {
    return this.props.match.params.itemId;
  }

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/files`);
  };

  onGoToAssetClicked = (id: number) => {
    trackUsage('FilePage.GoToAsset', {
      id: this.props.match.params.fileId,
      assetId: id,
    });
    this.props.push(`/${this.tenant}/asset/${id}/files/${this.file.id}`);
  };

  onDeleteClicked = async () => {
    if (!canEditFiles()) {
      return;
    }
    Modal.confirm({
      title: 'Do you want to delete this file?',
      content: 'This is a irreversible change',
      onOk: async () => {
        trackUsage('FilePage.DeleteFile', {
          id: this.props.match.params.fileId,
        });
        const { id, name } = this.file!;
        trackUsage('FilePreview.Delete', { id });
        this.postDeleted = true;
        await this.props.deleteFile(id);
        notification.success({
          message: `Successfully Deleted ${name}`,
        });
        this.props.goBack();
      },
      onCancel: () => {
        trackUsage('FilePage.DeleteFile', {
          id: this.props.match.params.fileId,
          cancel: true,
        });
      },
    });
  };

  onDownloadClicked = async () => {
    trackUsage('FilePage.DownloadFile', {
      id: this.props.match.params.fileId,
    });
    const [url] = await sdk.files.getDownloadUrls([{ id: this.file.id }]);
    const blob = await downloadFile(url.downloadUrl);
    saveData(blob, this.file.name);
  };

  render() {
    return (
      <>
        <BackSection>
          <Button type="link" icon="arrow-left" onClick={this.onBackClicked}>
            Back to Search Result
          </Button>
        </BackSection>
        {this.file ? (
          <Wrapper>
            <FileSidebar
              file={this.file}
              onGoToAssetClicked={this.onGoToAssetClicked}
              onDownloadClicked={this.onDownloadClicked}
              onDeleteClicked={this.onDeleteClicked}
            />
            <FileView>
              <FilePreview
                fileId={this.file.id}
                onAssetClicked={id => {
                  if (
                    this.file.mimeType &&
                    this.file.mimeType.includes('svg')
                  ) {
                    this.props.push(
                      `/${this.tenant}/asset/${id}/pnid/${this.file.id}`
                    );
                  } else {
                    this.props.push(
                      `/${this.tenant}/asset/${id}/files/${this.file.id}`
                    );
                  }
                }}
                onFileClicked={id =>
                  this.props.push(`/${this.tenant}/file/${id}`)
                }
              />
            </FileView>
          </Wrapper>
        ) : (
          <LoadingWrapper>
            <p>Loading File...</p>
          </LoadingWrapper>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    files: selectFiles(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchFile, goBack, deleteFile }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(FilePage);
