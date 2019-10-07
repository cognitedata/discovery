import React from 'react';
import { connect } from 'react-redux';
import { Button, message, Descriptions, Divider } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { THREE } from '@cognite/3d-viewer';
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
import ModelList from './ModelList';
import { trackUsage } from '../../utils/metrics';

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
    trackUsage('ThreeDPane.SelectParentClicked', {
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
    trackUsage('ThreeDPane.UnselectNodeClicked', {});
    const { modelId, revisionId } = this.props.app;
    if (modelId && revisionId) {
      this.props.setModelAndRevisionAndNode(modelId!, revisionId!);
    } else {
      this.props.resetAppState();
    }
  };

  render() {
    const {
      app: { modelId, nodeId, rootAssetId, assetId },
      threed: { currentNode },
      assets: { all },
      threed: { models },
    } = this.props;
    let rootAsset;
    if (rootAssetId) {
      rootAsset = all[rootAssetId];
    }
    // if already connected to root asset and nodeID is null, dont show.
    let infoPane = null;
    if (nodeId && currentNode) {
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(...currentNode.boundingBox!.min),
        new THREE.Vector3(...currentNode.boundingBox!.max)
      );
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.max.clone().sub(boundingBox.min);
      infoPane = (
        <>
          <h3>3D Node Info</h3>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Position">
              x: {center.x.toFixed(1)} m
              <br />
              y: {center.y.toFixed(1)} m
              <br />
              z: {center.z.toFixed(1)} m
              <br />
            </Descriptions.Item>
            <Descriptions.Item label="Size">
              Height: {size.z.toFixed(1)} m
              <br />
              Depth: {size.x.toFixed(1)} m
              <br />
              Width: {size.y.toFixed(1)} m
              <br />
            </Descriptions.Item>
          </Descriptions>
        </>
      );
    }
    let form = null;
    let title = null;
    if (!rootAssetId && !modelId) {
      title = 'All 3D Models';
      form = <ModelList />;
    } else if (rootAssetId && !modelId) {
      title = 'Map to a 3D Model';
      form = <ModelList />;
    } else if (rootAssetId && modelId && !nodeId) {
      title = 'No Node Selected';
    } else if (rootAssetId && modelId && nodeId && !assetId) {
      title = 'No Asset Linked to Node';
      form = (
        <>
          <Button onClick={this.selectParentClicked}>Select Parent</Button>
          <br />
          <br />
          <MapNodeToAssetForm />
        </>
      );
    } else if (rootAssetId && modelId && !nodeId && assetId) {
      title = 'No Node Linked to Asset';
    } else if (rootAssetId && modelId && nodeId && assetId) {
      title = `Mapped Node: ${all[assetId] ? all[assetId].name : 'Loading...'}`;
    } else if (!rootAssetId && modelId) {
      title = `No Asset linked to ${
        models[modelId] ? models[modelId].name : 'Loading...'
      } right now`;
      form = <MapModelToAssetForm />;
    }
    return (
      <>
        <h3>{title}</h3>
        {modelId && rootAsset && (
          <p>Model is Mapped to: {rootAsset ? rootAsset.name : 'N/A'}</p>
        )}
        {form}
        <Divider />
        {infoPane}
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
