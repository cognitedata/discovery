import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Asset } from '@cognite/sdk';
import { Select, Spin, Button } from 'antd';
import styled from 'styled-components';
import {
  ExtendedAsset,
  createNewAsset,
  selectAssets,
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
`;
type Props = {
  assetId?: number;
  asset?: ExtendedAsset;
};

type State = {
  includeAssetId: number | undefined;
  fetching: boolean;
  searchResults: Asset[];
};

class FileUploadTab extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      includeAssetId: props.assetId,
      fetching: false,
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
    const { includeAssetId, fetching, searchResults } = this.state;
    return (
      <Wrapper>
        <p className="link-text">Link to Asset:</p>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Search for an asset to link to"
          value={includeAssetId}
          notFoundContent={fetching ? <Spin size="small" /> : null}
          onChange={(id: any) => this.setState({ includeAssetId: Number(id) })}
          onSearch={this.doSearch}
          filterOption={false}
        >
          {searchResults.map(asset => (
            <Select.Option key={asset.id} value={asset.id}>
              {asset.name} ({asset.id})
            </Select.Option>
          ))}
        </Select>
        {this.props.assetId && <Button>Set as Current Asset</Button>}
        <div className="wrapper">
          <FileUploader
            onUploadSuccess={console.log}
            assetId={includeAssetId}
          />
        </div>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assetId: state.app.assetId,
    asset: state.app.assetId
      ? selectAssets(state).all[state.app.assetId]
      : undefined,
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
