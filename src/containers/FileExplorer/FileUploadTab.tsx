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
      searchResults: [],
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset !== prevProps.asset) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        includeAssetId: this.props.assetId,
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
    trackSearchUsage('FileUploadTab', 'Asset', {
      query,
    });
    const { assetId } = this.props;
    if (query.length > 0) {
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query },
        limit: 100,
      });
      this.setState({
        searchResults: results
          .slice(0, results.length)
          .filter(el => el.id !== assetId),
        fetching: false,
      });
    }
  };

  renderResults = (menu: React.ReactNode) => {
    const { fetching, searchResults } = this.state;
    const { asset: currentAsset } = this.props;
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
    if (searchResults.length === 0) {
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
    } else if (currentAsset && searchResults[0].id === currentAsset.id) {
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
    return items;
  };

  render() {
    const {
      includeAssetId,
      fetching,
      searchResults,
      showLinkToAsset,
      fileList,
    } = this.state;
    const { asset: currentAsset, assetId: currentAssetId } = this.props;

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
                  onDropdownVisibleChange={console.log}
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
                        key={currentAssetId}
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
