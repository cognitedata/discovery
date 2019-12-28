import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Input, Card, Button, message, Tabs } from 'antd';
import AssetSelect from 'components/AssetSelect';
import {
  selectThreeD,
  ThreeDState,
  setRevisionRepresentAsset,
} from 'modules/threed';
import { selectAssets, AssetsState, createNewAsset } from 'modules/assets';
import { RootState } from 'reducers/index';
import { selectAppState, AppState } from 'modules/app';

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
};

class MapModelToAssetForm extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

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

        <Tabs defaultActiveKey="existing">
          <Tabs.TabPane tab="Existing Asset" key="existing">
            <p>Map to existing Root Asset</p>
            <AssetSelect
              rootOnly
              style={{ width: '100%' }}
              selectedAssetIds={assetId ? [assetId] : []}
              onAssetSelected={ids => this.setState({ assetId: ids[0] })}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="New Asset" key="new">
            <p>
              Add and map to a <strong>new</strong> Root Asset
            </p>
            <Input
              placeholder="New Asset Name"
              value={assetName}
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
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
