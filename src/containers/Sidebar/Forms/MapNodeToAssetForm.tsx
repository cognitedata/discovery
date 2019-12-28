import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import debounce from 'lodash/debounce';
import { Select, Input, Card, Button, message, Spin, Tabs } from 'antd';
import { Asset } from '@cognite/sdk';
import AssetSelect from 'components/AssetSelect';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from 'modules/threed';
import { selectAssets, AssetsState, createNewAsset } from 'modules/assets';
import { RootState } from 'reducers/index';
import { sdk } from 'index';
import { createAssetNodeMapping } from 'modules/assetmappings';
import { selectAppState, AppState } from 'modules/app';
import { trackSearchUsage } from 'utils/metrics';

const { Option } = Select;

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  createNewAsset: typeof createNewAsset;
  createAssetNodeMapping: typeof createAssetNodeMapping;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = {
  rootAssetId?: number;
  parentAssetId?: number;
  assetId?: number;
  assetName?: string;
  searchResults: Asset[];
  fetching: boolean;
};

class MapNodeToAssetForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.doSearch = debounce(this.doSearch, 700);

    this.state = {
      rootAssetId: props.app.rootAssetId,
      searchResults: Object.values(props.assets.all).filter(
        el => !props.app.rootAssetId || el.rootId === props.app.rootAssetId
      ),
      fetching: false,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (
      !this.state.rootAssetId &&
      this.props.app.rootAssetId &&
      prevProps.app.rootAssetId !== this.props.app.rootAssetId
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ rootAssetId: this.props.app.rootAssetId });
    }
  }

  doSearch = async (query: string) => {
    const { rootAssetId } = this.state;
    if (!rootAssetId) {
      return;
    }
    trackSearchUsage('MapNodeToAsset', 'Asset', {
      query,
    });
    this.setState({ fetching: true });
    const results = await sdk.assets.search({
      ...(query.length > 0 && { search: { name: query } }),
      filter: {
        rootIds: [{ id: rootAssetId }],
      },
      limit: 1000,
    });
    this.setState({
      searchResults: results.slice(0, results.length),
      fetching: false,
    });
  };

  addMapping = () => {
    const {
      assetId,
      assetName,
      parentAssetId,
      rootAssetId: selectedRootAssetId,
    } = this.state;
    const { modelId, revisionId, nodeId, rootAssetId } = this.props.app;
    if (!selectedRootAssetId) {
      message.error('A root asset must first be selected!');
      return;
    }
    if (selectedRootAssetId !== rootAssetId) {
      this.props.setRevisionRepresentAsset(
        modelId!,
        revisionId!,
        selectedRootAssetId
      );
    }
    if (assetName && assetName.length > 0 && parentAssetId) {
      this.props.createNewAsset(
        { name: assetName, parentId: parentAssetId },
        {
          modelId,
          revisionId,
          nodeId,
        }
      );
    } else if (assetId) {
      this.props.createAssetNodeMapping(
        modelId!,
        revisionId!,
        nodeId!,
        assetId
      );
    } else {
      message.error('You need to select or provide name for a new asset.');
    }
  };

  render() {
    const {
      assetId,
      assetName,
      fetching,
      searchResults,
      parentAssetId,
      rootAssetId,
    } = this.state;
    return (
      <Card>
        <h3>Map Node to an Asset</h3>
        <p>Root Asset</p>
        <AssetSelect
          rootOnly
          style={{ width: '100%' }}
          disabled={!!this.props.app.rootAssetId}
          selectedAssetIds={rootAssetId ? [rootAssetId] : []}
          onAssetSelected={ids =>
            this.setState({ rootAssetId: ids[0] }, () => this.doSearch(''))
          }
        />
        <Tabs defaultActiveKey="existing">
          <Tabs.TabPane tab="Existing Asset" key="existing">
            <p>Map to an existing Asset</p>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Select existing asset"
              value={assetId}
              disabled={this.state.rootAssetId === undefined}
              notFoundContent={fetching ? <Spin size="small" /> : null}
              onChange={(id: any) => this.setState({ assetId: Number(id) })}
              onSearch={this.doSearch}
              filterOption={false}
            >
              {searchResults.map(asset => {
                return (
                  <Option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.id})
                  </Option>
                );
              })}
            </Select>
          </Tabs.TabPane>
          <Tabs.TabPane tab="New Asset" key="new">
            <p>
              Add and map to a <strong>new</strong> Asset
            </p>
            <span>Parent Node</span>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Select existing asset as Parent"
              value={parentAssetId}
              disabled={this.state.rootAssetId === undefined}
              notFoundContent={fetching ? <Spin size="small" /> : null}
              onChange={(id: any) =>
                this.setState({ parentAssetId: Number(id) })
              }
              onSearch={this.doSearch}
              filterOption={false}
            >
              {searchResults.map(asset => (
                <Select.Option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.id})
                </Select.Option>
              ))}
            </Select>
            <span>Name</span>
            <Input
              placeholder="New Asset Name"
              value={assetName}
              disabled={this.state.rootAssetId === undefined}
              onChange={e => this.setState({ assetName: e.target.value })}
            />
          </Tabs.TabPane>
        </Tabs>
        <Button onClick={this.addMapping} style={{ marginTop: '12px' }}>
          Confirm Mapping
        </Button>
      </Card>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      createNewAsset,
      setRevisionRepresentAsset,
      createAssetNodeMapping,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(MapNodeToAssetForm);
