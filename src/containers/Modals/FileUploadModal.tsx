/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { UploadFileMetadataResponse, FilesMetadata } from '@cognite/sdk';
import { Table, Button, Modal } from 'antd';
import styled from 'styled-components';
import AssetSelect from 'components/AssetSelect';
import { ExtendedAsset } from '../../modules/assets';
import FileUploader from '../../components/FileUploader';
import { AppState } from '../../modules/app';
import { RootState } from '../../reducers/index';
import { canEditFiles } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';

const Wrapper = styled.div`
  .wrapper {
    margin-top: 16px;
  }
  button {
    margin-top: 6px;
  }

  && .ant-select-selection__clear {
    background: none;
    right: 34px;
  }

  .link-text {
    margin-top: 6px;
    margin-bottom: 2px;
  }
`;

type Props = {
  asset?: ExtendedAsset;
  onFileSelected: (file: UploadFileMetadataResponse) => void;
  onCancel: () => void;

  app: AppState;
};

type State = {
  hasPermission: boolean;
  showLinkToAsset: boolean;
  includeAssetIds?: number[];
  fileList: FilesMetadata[];
};

class FileUploadModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    trackUsage('FileUploadModal.Load', {});

    this.state = {
      fileList: [],
      includeAssetIds: props.asset ? [props.asset.id] : undefined,
      hasPermission: canEditFiles(false),
      showLinkToAsset: false,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset !== prevProps.asset) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        includeAssetIds: this.props.asset ? [this.props.asset.id] : undefined,
      });
    }
  }

  get columns() {
    return [
      { name: 'File Name', key: 'name', dataIndex: 'name' },
      { name: 'File Type', key: 'type', dataIndex: 'mimeType' },
      {
        name: 'Actions',
        key: 'actions',
        render: (file: UploadFileMetadataResponse) => (
          <Button onClick={() => this.props.onFileSelected(file)}>
            View File
          </Button>
        ),
      },
    ];
  }

  render() {
    const {
      showLinkToAsset,
      hasPermission,
      includeAssetIds,
      fileList,
    } = this.state;

    if (!hasPermission) {
      return (
        <p>Your current account is missing permissions to upload files.</p>
      );
    }

    return (
      <Modal
        visible
        onCancel={this.props.onCancel}
        title="Upload File"
        footer={null}
      >
        <Wrapper>
          <FileUploader
            onUploadSuccess={file => {
              trackUsage('FileUploadModal.UploadSuccess', { id: file.id });
              this.setState({ fileList: [...fileList, file] });
            }}
            onFileListChange={list =>
              this.setState({ showLinkToAsset: list.length !== 0 })
            }
            beforeUploadStart={() => {
              trackUsage('FileUploadModal.StartUpload', {});
              if (canEditFiles()) {
                this.setState({ fileList: [] });
              }
            }}
            assetIds={includeAssetIds}
          >
            <>
              {showLinkToAsset && (
                <div className="wrapper">
                  <p className="link-text">Link to Asset:</p>
                  <AssetSelect
                    style={{ width: '100%' }}
                    multiple
                    selectedAssetIds={includeAssetIds}
                    onAssetSelected={ids =>
                      this.setState({ includeAssetIds: ids })
                    }
                  />
                </div>
              )}
              {fileList.length !== 0 && (
                <Table
                  columns={this.columns}
                  rowKey="id"
                  dataSource={fileList}
                />
              )}
            </>
          </FileUploader>
        </Wrapper>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { app: state.app };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadModal);
