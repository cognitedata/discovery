/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset, UploadFileMetadataResponse } from '@cognite/sdk';
import { Select, Spin, Table, Button } from 'antd';
import styled from 'styled-components';
import {
  ExtendedAsset,
  createNewAsset,
  selectCurrentAsset,
} from '../../modules/assets';
import { RootState } from '../../reducers';
import FileUploader from '../../components/FileUploader';
import { trackSearchUsage } from '../../utils/metrics';
import { sdk } from '../../index';

const Wrapper = styled.div`
  .wrapper {
    margin-top: 16px;
  }
  button {
    margin-top: 6px;
  }

  .link-text {
    margin-top: 6px;
    margin-bottom: 2px;
  }
`;
type Props = {
  assetId?: number;
  asset?: ExtendedAsset;
  onFileSelected: (file: UploadFileMetadataResponse) => void;
};

type State = {
  includeAssetId: number | undefined;
  fetching: boolean;
  showLinkToAsset: boolean;
  fileList: UploadFileMetadataResponse[];
  searchResults: Asset[];
};

class FileUploadTab extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      includeAssetId: props.assetId,
      fetching: false,
      showLinkToAsset: false,
      fileList: [],
      searchResults: props.asset ? [props.asset] : [],
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset !== prevProps.asset) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        includeAssetId: this.props.assetId,
        fetching: false,
        searchResults: this.props.asset ? [this.props.asset] : [],
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
    trackSearchUsage('FileUploadTab', 'Asset', {
      query,
    });
    if (query.length > 0) {
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query },
        limit: 100,
      });
      this.setState({
        searchResults: results.slice(0, results.length),
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
    } = this.state;
    const { asset: currentAsset } = this.props;

    return (
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
                  onChange={(id: any) =>
                    this.setState({
                      includeAssetId: id ? Number(id) : undefined,
                    })
                  }
                  onSearch={this.doSearch}
                  filterOption={false}
                  allowClear
                  dropdownRender={menu => {
                    let items = fetching ? (
                      <div
                        onMouseDown={e => e.preventDefault()}
                        style={{
                          padding: '4px 8px',
                        }}
                      >
                        <Spin size="small" />
                      </div>
                    ) : (
                      menu
                    );
                    if (
                      searchResults.length === 0 ||
                      (currentAsset && searchResults[0].id === currentAsset.id)
                    ) {
                      items = (
                        <div
                          onMouseDown={e => e.preventDefault()}
                          style={{
                            padding: '4px 8px',
                          }}
                        >
                          <span>Try searching for assets</span>
                        </div>
                      );
                    }
                    return (
                      <div>
                        {currentAsset && (
                          <>
                            <div
                              style={{
                                padding: '4px 8px',
                                background: '#dedede',
                              }}
                              onMouseDown={e => e.preventDefault()}
                            >
                              <span>Current Asset</span>
                            </div>
                            <div
                              className={`ant-select-dropdown-menu-item ${includeAssetId ===
                                currentAsset.id &&
                                'ant-select-dropdown-menu-item-active ant-select-dropdown-menu-item-selected'}`}
                              onMouseDown={() =>
                                this.setState({
                                  includeAssetId: currentAsset.id,
                                })
                              }
                            >
                              <span>
                                {currentAsset.name} ({currentAsset.id})
                              </span>
                            </div>
                            <div
                              onMouseDown={e => e.preventDefault()}
                              style={{
                                padding: '4px 8px',
                                background: '#dedede',
                              }}
                            >
                              <span>Search Results</span>
                            </div>
                          </>
                        )}
                        {items}
                      </div>
                    );
                  }}
                >
                  {searchResults.map(asset => (
                    <Select.Option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.id})
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )}
            {fileList.length !== 0 && (
              <Table columns={this.columns} rowKey="id" dataSource={fileList} />
            )}
          </>
        </FileUploader>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assetId: state.app.assetId,
    asset: selectCurrentAsset(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FileUploadTab);
