/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset, UploadFileMetadataResponse } from '@cognite/sdk';
import { Select, Spin, Table, Button, Modal } from 'antd';
import styled from 'styled-components';
import { ExtendedAsset } from '../../modules/assets';
import FileUploader from '../../components/FileUploader';
import { trackSearchUsage } from '../../utils/metrics';
import { sdk } from '../../index';
import { checkForAccessPermission } from '../../utils/utils';
import { selectAppState, AppState } from '../../modules/app';
import { RootState } from '../../reducers/index';

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
  includeAssetId: number | undefined;
  hasPermission: boolean;
  fetching: boolean;
  showLinkToAsset: boolean;
  fileList: UploadFileMetadataResponse[];
  searchResults: Asset[];
};

class FileUploadModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      includeAssetId: props.asset ? props.asset.id : undefined,
      fetching: false,
      hasPermission: checkForAccessPermission(
        props.app.groups,
        'filesAcl',
        'WRITE'
      ),
      showLinkToAsset: false,
      fileList: [],
      searchResults: [],
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset !== prevProps.asset) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        includeAssetId: this.props.asset ? this.props.asset.id : undefined,
        fetching: false,
        searchResults: [],
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

  doSearch = async (query: string) => {
    trackSearchUsage('FileUploadModal', 'Asset', {
      query,
    });
    const { asset } = this.props;
    if (query.length > 0) {
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query },
        limit: 100,
      });
      this.setState({
        searchResults: results
          .slice(0, results.length)
          .filter(el => !asset || el.id !== asset.id),
        fetching: false,
      });
    }
  };

  render() {
    const {
      includeAssetId,
      fetching,
      searchResults,
      showLinkToAsset,
      fileList,
      hasPermission,
    } = this.state;
    const { asset: currentAsset } = this.props;

    if (!hasPermission) {
      return (
        <p>Your current account is missing permissions to upload files.</p>
      );
    }

    const options = searchResults.map(asset => (
      <Select.Option key={asset.id} value={asset.id}>
        <span>{asset.name}</span>
        <span style={{ color: '#ababab', marginLeft: '4px' }}>
          ({asset.id})
        </span>
      </Select.Option>
    ));
    if (fetching) {
      options.push(
        <Select.Option key="loading" value="loading" disabled>
          <Spin size="small" />
        </Select.Option>
      );
    }
    if (options.length === 0) {
      options.push(
        <Select.Option key="add" value="add" disabled>
          <span>Try searching for an asset</span>
        </Select.Option>
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
              this.setState({ fileList: [...fileList, file] });
            }}
            onFileListChange={list =>
              this.setState({ showLinkToAsset: list.length !== 0 })
            }
            beforeUploadStart={() => this.setState({ fileList: [] })}
            assetId={includeAssetId}
          >
            <>
              {showLinkToAsset && (
                <div className="wrapper">
                  <p className="link-text">Link to Asset:</p>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="Search for an asset to link to"
                    value={includeAssetId}
                    notFoundContent={fetching ? <Spin size="small" /> : null}
                    onSelect={(id: any) =>
                      this.setState({
                        includeAssetId: id ? Number(id) : undefined,
                      })
                    }
                    onChange={(id: any) => {
                      if (!id) {
                        this.setState({
                          includeAssetId: undefined,
                        });
                      }
                    }}
                    onSearch={this.doSearch}
                    filterOption={false}
                    allowClear
                  >
                    {currentAsset && (
                      <Select.OptGroup label="Current Asset" key="current">
                        <Select.Option
                          key={currentAsset.id}
                          value={currentAsset.id}
                        >
                          <span>{currentAsset.name}</span>
                          <span style={{ color: '#ababab', marginLeft: '4px' }}>
                            ({currentAsset.id})
                          </span>
                        </Select.Option>
                      </Select.OptGroup>
                    )}
                    <Select.OptGroup label="Search Results" key="results">
                      {options}
                    </Select.OptGroup>
                  </Select>
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
  return { app: selectAppState(state) };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(FileUploadModal);
