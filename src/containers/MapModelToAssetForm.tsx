import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Select, Input, Divider, Card, Button, message } from 'antd';
import { Asset } from '@cognite/sdk';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from '../modules/threed';
import { selectAssets, AssetsState, createNewAsset } from '../modules/assets';
import { RootState } from '../reducers/index';
import { selectApp, AppState } from '../modules/app';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  createNewAsset: typeof createNewAsset;
  setRevisionRepresentAsset: typeof setRevisionRepresentAsset;
} & OrigProps;

type State = {
  assetId?: number;
  assetName?: string;
  searchResults?: Asset[];
};

class MapModelToAssetForm extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

  get rootAssets() {
    return Object.values(this.props.assets.all).filter(
      el => el.rootId === el.id
    );
  }

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

  render() {
    const { assetId, assetName } = this.state;
    return (
      <Card>
        <h3>Map 3D Model to an Asset</h3>
        <p>Map to an existing Root Asset</p>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Select existing asset"
          value={assetId}
          onChange={(id: any) => this.setState({ assetId: Number(id) })}
          filterOption={(input, option) =>
            (option.props.children! as string)
              .toLowerCase()
              .indexOf(input.toLowerCase()) >= 0
          }
        >
          {this.rootAssets.map(asset => (
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
