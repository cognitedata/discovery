import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, message } from 'antd';
import { FilesMetadata } from '@cognite/sdk';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';
import FlexTableWrapper from 'components/FlexTableWrapper';
import FilePreview from 'containers/FileExplorer/FilePreview/FilePreview';
import LoadingWrapper from 'components/LoadingWrapper';
import { ExtendedAsset } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import {
  fetchFiles,
  selectFilesForAsset,
  selectFiles,
} from '../../modules/files';
import ViewingDetailsNavBar from '../../components/ViewingDetailsNavBar';

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
  onViewDetails: (type: string, id: number) => void;
  onClearSelection: () => void;
};

type Props = {
  files: FilesMetadata[] | undefined;
  selectFile: FilesMetadata | undefined;
  push: typeof push;
  fetchFiles: typeof fetchFiles;
} & OrigProps;

type State = {};

class AssetFileSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (this.props.asset) {
      this.props.fetchFiles(this.props.asset.id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.asset &&
      (!prevProps.asset || this.props.asset.id !== prevProps.asset.id)
    ) {
      this.props.fetchFiles(this.props.asset.id);
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
                onClick={() => this.onUnlinkClicked(item.id)}
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
        return files.filter(
          file => mimeTypes.indexOf(file.mimeType || '') !== -1
        );
      }
      return files;
    }
    return undefined;
  }

  onUnlinkClicked = (fileId: number) => {
    message.info(`Coming soon ${fileId}`);
  };

  renderItem = () => {
    const { selectFile, fileId } = this.props;
    if (fileId && selectFile) {
      return (
        <>
          <ViewingDetailsNavBar
            name={selectFile.name || 'Timeseries'}
            onButtonClicked={() => this.props.onViewDetails('file', fileId)}
            onBackClicked={this.props.onClearSelection}
          />
          <div
            style={{
              marginTop: '24px',
              flex: 1,
            }}
          >
            <FilePreview
              assetId={this.props.asset ? this.props.asset.id : undefined}
              onViewDetails={this.props.onViewDetails}
              fileId={fileId}
              deleteFile={() => {}}
            />
          </div>
        </>
      );
    }
    return (
      <>
        <ViewingDetailsNavBar
          name="Timeseries"
          description="Loading..."
          onButtonClicked={() => {}}
          onBackClicked={this.props.onClearSelection}
        />
        <LoadingWrapper>Loading Timeseries</LoadingWrapper>
      </>
    );
  };

  render() {
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
            <Button icon="plus" type="primary">
              Upload New File
            </Button>
          </div>
        </VerticallyCenteredRow>
        <FlexTableWrapper>
          <Table
            dataSource={this.files}
            columns={this.columns}
            scroll={{ y: true }}
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
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    files: origProps.asset
      ? selectFilesForAsset(state, origProps.asset.id)
      : undefined,
    selectFile: origProps.fileId
      ? selectFiles(state).files[origProps.fileId]
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchFiles }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(AssetFileSection);
