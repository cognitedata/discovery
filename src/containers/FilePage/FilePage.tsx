import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, notification } from 'antd';
import styled from 'styled-components';
import { push, goBack } from 'connected-react-router';
import FilePreview from 'containers/FileExplorer/FilePreview/FilePreview';
import { RootState } from '../../reducers/index';
import LoadingWrapper from '../../components/LoadingWrapper';
import FileSidebar from './FileSidebar';
import { selectFiles, FilesState, fetchFile } from '../../modules/files';
import { trackUsage } from '../../utils/metrics';
import { sdk } from '../../index';

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
  push: typeof push;
  goBack: typeof goBack;
} & OrigProps;

type State = {};

class FilePage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
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

  downloadFile = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }
    const blob = await response.blob();
    return blob;
  };

  onBackClicked = () => {
    this.props.push(`/${this.props.match.params.tenant}/search/files`);
  };

  onGoToAssetClicked = (id: number) => {
    this.props.push(`/${this.tenant}/asset/${id}`);
  };

  onDeleteFileClicked = async () => {
    trackUsage('FilePreview.Delete', { id: this.file.id });
    await sdk.files.delete([{ id: this.file.id }]);
    notification.success({ message: `Successfully Deleted ${this.file.name}` });
    this.props.goBack();
  };

  onDownloadClicked = async () => {
    trackUsage('FilePreview.DownloadFile', { filedId: this.file.id });
    const [url] = await sdk.files.getDownloadUrls([{ id: this.file.id }]);
    const blob = await this.downloadFile(url.downloadUrl);
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
            />
            <FileView>
              <FilePreview
                fileId={this.file.id}
                deleteFile={this.onDeleteFileClicked}
                onViewDetails={console.log}
              />
            </FileView>
          </Wrapper>
        ) : (
          <LoadingWrapper>
            <p>Loading Timeseries...</p>
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
  bindActionCreators({ push, fetchFile, goBack }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(FilePage);
