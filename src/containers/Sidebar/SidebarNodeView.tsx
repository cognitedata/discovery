import React from 'react';
import { connect } from 'react-redux';
import { Button, message } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import { fetchAsset, selectAssets, AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { sdk } from '../../index';
import MapModelToAssetForm from '../MapModelToAssetForm';
import MapNodeToAssetForm from '../MapNodeToAssetForm';
import {
  resetAppState,
  AppState,
  selectApp,
  setModelAndRevisionAndNode,
} from '../../modules/app';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  resetAppState: typeof resetAppState;
} & OrigProps;

type State = {};

class NodeDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

  selectParentClicked = async () => {
    const { modelId, revisionId, nodeId } = this.props.app;
    const parent = await sdk.revisions3D.list3DNodes(modelId!, revisionId!, {
      nodeId,
    });
    if (parent.items.length > 0) {
      this.props.setModelAndRevisionAndNode(
        modelId!,
        revisionId!,
        parent.items[0].parentId
      );
    } else {
      message.error('Unable to select parent');
    }
  };

  unselectNodeClicked = () => {
    const { modelId, revisionId } = this.props.app;
    if (modelId && revisionId) {
      this.props.setModelAndRevisionAndNode(modelId!, revisionId!);
    } else {
      this.props.resetAppState();
    }
  };

  render() {
    const {
      app: { modelId, revisionId, nodeId, rootAssetId },
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
    if (rootAssetId) {
      rootAsset = this.props.assets.all[rootAssetId];
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
            <MapNodeToAssetForm />
          </>
        ) : (
          <MapModelToAssetForm />
        )}
      </>
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
      doFetchAsset: fetchAsset,
      setModelAndRevisionAndNode,
      resetAppState,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NodeDrawer);
