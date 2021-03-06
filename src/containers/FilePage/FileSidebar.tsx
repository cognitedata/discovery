import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Button, Tabs, Descriptions, List } from 'antd';
import moment from 'moment';
import { FilesMetadata } from '@cognite/sdk';
import EditFileModal from 'containers/Modals/EditFileModal';
import { AssetIcon } from 'assets';
import { sdk } from 'utils/SDK';
import { RootState } from '../../reducers/index';
import { addFilesToState } from '../../modules/files';
import { canEditFiles } from '../../utils/PermissionsUtils';
import { trackUsage } from '../../utils/Metrics';
import {
  fetchAssets,
  selectAssetById,
  ExtendedAsset,
} from '../../modules/assets';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 360px;
  padding: 16px;
  border-right: 1px solid #d9d9d9;

  h1 {
    margin-top: 12px;
    margin-bottom: 0px;
  }

  .ant-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .ant-tabs-content {
    flex: 1;
    position: relative;
    height: 0;
  }

  .ant-tabs-tabpane {
    overflow: auto;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  margin-bottom: 20px;
  margin-top: 24px;

  && > * {
    margin-left: 16px;
  }
  && > *:nth-child(1) {
    margin-left: 0px;
  }
`;

type OrigProps = {
  file: FilesMetadata;
  onGoToAssetClicked: (id: number) => void;
  onDownloadClicked: () => void;
  onDeleteClicked: () => void;
};

type Props = {
  push: typeof push;
  fetchAssets: typeof fetchAssets;
  addFilesToState: typeof addFilesToState;
  assets: (ExtendedAsset | undefined)[];
} & OrigProps;

type State = { showEditModal: boolean };

class FileSidebar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { showEditModal: false };
  }

  componentDidMount() {
    if (this.props.file.assetIds) {
      this.props.fetchAssets(this.props.file.assetIds.map(id => ({ id })));
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.file.id !== this.props.file.id && this.props.file.assetIds) {
      this.props.fetchAssets(this.props.file.assetIds.map(id => ({ id })));
    }
    if (
      prevState.showEditModal &&
      prevState.showEditModal !== this.state.showEditModal &&
      this.props.file.assetIds
    ) {
      this.props.fetchAssets(this.props.file.assetIds.map(id => ({ id })));
    }
  }

  onUnlinkClicked = async (assetId: number) => {
    trackUsage('FilePage.FileSidebar.Unlink', {
      id: this.props.file.id,
      assetId,
    });
    const file = await sdk.files.update([
      { id: this.props.file.id, update: { assetIds: { remove: [assetId] } } },
    ]);

    this.props.addFilesToState(file);
  };

  render() {
    const { file } = this.props;
    const { showEditModal } = this.state;
    return (
      <Wrapper>
        <h1>{file.name}</h1>
        <ButtonRow>
          <Button
            type="primary"
            shape="round"
            disabled={!canEditFiles(false)}
            onClick={() => this.setState({ showEditModal: true })}
          >
            Edit
          </Button>
          <Button
            type="danger"
            shape="circle"
            icon="delete"
            disabled={!canEditFiles(false)}
            onClick={this.props.onDeleteClicked}
          />
          <Button
            type="default"
            shape="circle"
            icon="download"
            onClick={this.props.onDownloadClicked}
          />
        </ButtonRow>
        <Tabs size="small" tabBarGutter={6}>
          <Tabs.TabPane tab="Details" key="details">
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="External ID">
                {file.externalId}
              </Descriptions.Item>
              <Descriptions.Item label="Mime Type">
                {file.mimeType}
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                {file.source}
              </Descriptions.Item>
              <Descriptions.Item label="Is Uploaded">
                {file.uploaded ? 'true' : 'false'}
              </Descriptions.Item>
              <Descriptions.Item label="Created Time">
                {moment(file.createdTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Uploaded Time">
                {moment(file.uploadedTime).format('YYYY-MM-DD hh:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Linked Assets" key="assets">
            <>
              <Button
                disabled={!canEditFiles(false)}
                onClick={() => this.setState({ showEditModal: true })}
              >
                Link an asset
              </Button>
              <List
                dataSource={
                  file.assetIds
                    ? file.assetIds.map((id, i) => ({
                        name: this.props.assets[i]
                          ? this.props.assets[i]!.name
                          : 'Loading...',
                        id: id || i,
                      }))
                    : []
                }
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        ghost
                        type="danger"
                        disabled={!canEditFiles(false)}
                        onClick={() => this.onUnlinkClicked(item.id)}
                      >
                        Unlink
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Button
                          type="link"
                          onClick={() => this.props.onGoToAssetClicked(item.id)}
                        >
                          <img
                            src={AssetIcon}
                            alt=""
                            style={{ marginRight: '4px' }}
                          />
                          {item.name}
                        </Button>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Metadata" key="metadata">
            <pre>{JSON.stringify(file.metadata, null, 2)}</pre>
          </Tabs.TabPane>
        </Tabs>
        {showEditModal && (
          <EditFileModal
            file={this.props.file}
            onClose={() => this.setState({ showEditModal: false })}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState, origProps: OrigProps) => {
  return {
    assets: origProps.file.assetIds
      ? origProps.file.assetIds.map(id => selectAssetById(state, id))
      : [],
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAssets, addFilesToState }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(FileSidebar);
