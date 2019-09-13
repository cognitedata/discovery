import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import {
  ExtendedAsset,
  fetchAsset,
  selectAssets,
  AssetsState,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { sdk } from '../../index';
import MapModelToAssetForm from '../MapModelToAssetForm';
import MapNodeToAssetForm from '../MapNodeToAssetForm';

type OrigProps = {
  asset: ExtendedAsset;
  modelId: number;
  revisionId: number;
  nodeId: number;
  onNodeIdChange: (nodeId?: number) => void;
  onAssetIdChange: (id?: number) => void;
};

type Props = {
  assets: AssetsState;
  threed: ThreeDState;
} & OrigProps;

type State = {};

class NodeDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

  get rootAssetLinkedToRevision() {
    const { modelId, revisionId } = this.props;
    const { representsAsset } = this.props.threed;
    return Number(
      Object.keys(representsAsset).find(
        assetId =>
          representsAsset[Number(assetId)].modelId === modelId &&
          representsAsset[Number(assetId)].revisionId === revisionId
      )
    );
  }

  selectParentClicked = async () => {
    const { modelId, revisionId, nodeId } = this.props;
    const parent = await sdk.revisions3D.list3DNodes(modelId, revisionId, {
      nodeId,
    });
    this.props.onNodeIdChange(parent.items[0].parentId);
  };

  unselectNodeClicked = () => {
    this.props.onNodeIdChange();
  };

  render() {
    const {
      modelId,
      revisionId,
      nodeId,
      threed: { models },
    } = this.props;
    if (
      !revisionId ||
      !modelId ||
      !models[modelId] ||
      !models[modelId].revisions
    ) {
      return null;
    }
    let rootAsset;
    if (this.rootAssetLinkedToRevision) {
      rootAsset = this.props.assets.all[this.rootAssetLinkedToRevision];
    }
    // if already connected to root asset and nodeID is null, dont show.
    if (rootAsset && !nodeId) {
      return null;
    }
    return (
      <>
        <h3>
          {rootAsset ? (
            <>
              <span>Unmapped Node</span>
              <Button onClick={this.unselectNodeClicked}>Unselect Node</Button>
            </>
          ) : (
            <span>Unmapped Model</span>
          )}
        </h3>
        {rootAsset ? (
          <>
            <Button onClick={this.selectParentClicked}>Select Parent</Button>
            <p>Model is Mapped to: {rootAsset ? rootAsset.name : 'N/A'}</p>
            <MapNodeToAssetForm
              nodeId={nodeId}
              onAssetIdChange={this.props.onAssetIdChange}
              rootAssetId={rootAsset.id}
              revisionId={revisionId}
              modelId={modelId}
            />
          </>
        ) : (
          <MapModelToAssetForm revisionId={revisionId} modelId={modelId} />
        )}
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchAsset: fetchAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NodeDrawer);
