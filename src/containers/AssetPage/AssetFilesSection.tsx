import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button } from 'antd';
import { FilesMetadata } from '@cognite/sdk';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import FilePreview from 'containers/FilePage/FilePreview';
import LoadingWrapper from 'components/LoadingWrapper';
import LinkFileModal from 'containers/Modals/LinkFileModal';
import { sdk } from 'utils/SDK';
import { ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import {
  fetchFiles,
  selectFilesForAsset,
  fetchFile,
  addFilesToState,
  selectFileById,
} from '../../modules/files';
import ViewingDetailsNavBar from '../../components/ViewingDetailsNavBar';
import { canEditAssets, canEditFiles } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

const Wrapper = styled.div`
  height: 100%;
  padding: 24px 56px;
  display: flex;
  flex-direction: column;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }
`;

type OrigProps = {
  asset?: ExtendedAsset;
  mimeTypes?: string[];
  fileId?: number;
  onSelect: (id: number) => void;
  onNavigateToPage: (type: string, id: number) => void;
  onClearSelection: () => void;
};

type Props = {
  files: FilesMetadata[] | undefined;
  selectedFile: FilesMetadata | undefined;
  push: typeof push;
  fetchFiles: typeof fetchFiles;
  fetchFile: typeof fetchFile;
  addFilesToState: typeof addFilesToState;
} & OrigProps;

type State = { linkFileModal: boolean };

class AssetFileSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { linkFileModal: false };
  }

  componentDidMount() {
    if (this.props.asset) {
      this.props.fetchFiles(this.props.asset.id);
    }
    if (this.props.fileId && !this.props.selectedFile) {
      this.props.fetchFile(this.props.fileId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.asset &&
      (!prevProps.asset || this.props.asset.id !== prevProps.asset.id)
    ) {
      this.props.fetchFiles(this.props.asset.id);
    }
    if (
      this.props.fileId &&
      this.props.fileId !== prevProps.fileId &&
      !this.props.selectedFile
    ) {
      this.props.fetchFile(this.props.fileId);
    }
  }

  get columns(): ColumnProps<FilesMetadata>[] {
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
        render: item => {
          return moment(item.lastUpdatedTime).format('YYYY-MM-DD hh:mm');
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: item => {
          return (
            <>
              <Button
                onClick={e => {
                  e.stopPropagation();
                  this.onUnlinkClicked(item.id);
                }}
                disabled={!canEditFiles(false)}
                ghost
                type="danger"
              >
                Unlink
              </Button>
            </>
          );
        },
      },
    ];
  }

  get files() {
    const { files, mimeTypes } = this.props;
    if (files) {
      if (mimeTypes) {
        return files.filter(file =>
          mimeTypes.some(
            mimeType => file.mimeType && file.mimeType.indexOf(mimeType) > -1
          )
        );
      }
      return files;
    }
    return undefined;
  }

  onUnlinkClicked = async (fileId: number) => {
    trackUsage('AssetPage.FilesSection.Unlink', {
      fileId,
    });
    if (canEditAssets()) {
      const files = await sdk.files.update([
        {
          id: fileId,
          update: { assetIds: { remove: [this.props.asset!.id] } },
        },
      ]);

      this.props.addFilesToState(files);
    }
  };

  renderItem = () => {
    const { selectedFile, fileId } = this.props;
    if (fileId && selectedFile) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectedFile.name || 'File'}
            onButtonClicked={() => this.props.onNavigateToPage('file', fileId)}
            onBackClicked={this.props.onClearSelection}
          />
          <div
            style={{
              marginTop: '12px',
              flex: 1,
              height: 0,
            }}
          >
            <FilePreview
              assetId={this.props.asset ? this.props.asset.id : undefined}
              onAssetClicked={id => this.props.onNavigateToPage('asset', id)}
              onFileClicked={id => this.props.onSelect(id)}
              fileId={fileId}
            />
          </div>
        </>
      );
    }
    return (
      <>
        <ViewingDetailsNavBar
          name="File"
          description="Loading..."
          onButtonClicked={() => {}}
          onBackClicked={this.props.onClearSelection}
        />
        <LoadingWrapper>
          <p>Loading File</p>
        </LoadingWrapper>
      </>
    );
  };

  render() {
    const { linkFileModal } = this.state;
    if (this.props.fileId) {
      return this.renderItem();
    }
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <p />
          </div>
          <div className="right">
            <Button
              icon="plus"
              type="primary"
              disabled={!canEditFiles(false)}
              onClick={() => this.setState({ linkFileModal: true })}
            >
              Link Existing File
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={this.files}
            columns={this.columns}
            scroll={{ y: true, x: 600 }}
            pagination={{
              position: 'bottom',
              showQuickJumper: true,
              showSizeChanger: true,
            }}
            onRow={(row: any) => ({
              onClick: () => {
                this.props.onSelect(row.id);
              },
            })}
            loading={!this.files}
          />
        </FlexTableWrapper>
        {linkFileModal && (
          <LinkFileModal
            asset={this.props.asset!}
            fileIds={this.props.files!.map(el => el.id)}
            onClose={() => this.setState({ linkFileModal: false })}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    files: origProps.asset
      ? selectFilesForAsset(state, origProps.asset.id)
      : undefined,
    selectedFile: selectFileById(state, origProps.fileId),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    { push, fetchFiles, fetchFile, addFilesToState },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(AssetFileSection);
