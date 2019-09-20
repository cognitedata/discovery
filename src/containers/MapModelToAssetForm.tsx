import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Select, Input, Divider, Card, Button, message, Spin } from 'antd';
import { Asset } from '@cognite/sdk';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from '../modules/threed';
import { selectAssets, AssetsState, createNewAsset } from '../modules/assets';
import { RootState } from '../reducers/index';
import { selectApp, AppState } from '../modules/app';
import { sdk } from '../index';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  createNewAsset: typeof createNewAsset;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = {
  fetching: boolean;
  assetId?: number;
  assetName?: string;
  searchResults: Asset[];
};

class MapModelToAssetForm extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    fetching: false,
    searchResults: Object.values(this.props.assets.all).filter(
      el => el.rootId === el.id
    ),
  };

  addMapping = () => {
    const { assetId, assetName } = this.state;
    const { modelId, revisionId } = this.props.app;
    if (assetName && assetName.length > 0) {
      this.props.createNewAsset(
        { name: assetName },
        {
          modelId,
          revisionId,
        }
      );
    } else if (assetId) {
      this.props.setRevisionRepresentAsset(modelId!, revisionId!, assetId);
    } else {
      message.error('You need to select or provide name for a new asset.');
    }
  };

  doSearch = async (query: string) => {
    // TODO filter already assigned ones!
    if (query.length > 0) {
      this.setState({ fetching: true });
      const results = await sdk.assets.search({
        search: { name: query, description: query },
        filter: {
          root: true,
        },
        limit: 1000,
      });
      this.setState({
        searchResults: results.slice(0, results.length),
        fetching: false,
      });
    }
  };

  render() {
    const { assetId, assetName, fetching, searchResults } = this.state;
    return (
      <Card>
        <h3>Map 3D Model to an Asset</h3>
        <p>Map to an existing Root Asset</p>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Select existing asset"
          value={assetId}
          notFoundContent={fetching ? <Spin size="small" /> : null}
          onSearch={this.doSearch}
          filterOption={false}
          onChange={(id: any) => this.setState({ assetId: Number(id) })}
        >
          {searchResults.map(asset => (
            <Select.Option key={asset.id} value={asset.id}>
              {asset.name}
            </Select.Option>
          ))}
        </Select>
        <Divider>OR</Divider>
        <p>
          Add and map to a <strong>new</strong> Root Asset
        </p>
        <Input
          placeholder="New Asset Name"
          value={assetName}
          onChange={e => this.setState({ assetName: e.target.value })}
        />
        <Button onClick={this.addMapping} style={{ marginTop: '12px' }}>
          Confirm Mapping
        </Button>
      </Card>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
      setRevisionRepresentAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
