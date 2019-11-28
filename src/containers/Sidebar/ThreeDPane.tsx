import React from 'react';
import { connect } from 'react-redux';
import { Button, message, Descriptions, Divider, Popconfirm } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { THREE } from '@cognite/3d-viewer';
import { Asset } from '@cognite/sdk';
import moment from 'moment';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import { fetchAsset, selectAssets, AssetsState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { sdk } from '../../index';
import MapModelToAssetForm from './Forms/MapModelToAssetForm';
import MapNodeToAssetForm from './Forms/MapNodeToAssetForm';
import {
  resetAppState,
  AppState,
  selectApp,
  setModelAndRevisionAndNode,
  setAssetId,
} from '../../modules/app';
import ModelList from './ModelList';
import { trackUsage } from '../../utils/metrics';
import { deleteAssetNodeMapping } from '../../modules/assetmappings';

type OrigProps = {};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
  deleteAssetNodeMapping: typeof deleteAssetNodeMapping;
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
      app: { modelId, nodeId, rootAssetId, assetId, revisionId },
      threed: { currentNode },
      assets: { all },
      threed: { models },
    } = this.props;
    let rootAsset: Asset | undefined;
    if (rootAssetId) {
      rootAsset = all[rootAssetId];
    }
    let asset: Asset | undefined;
    if (assetId) {
      asset = all[assetId];
    }
    // if already connected to root asset and nodeID is null, dont show.
    const infoPane: any[] = [];
    if (nodeId && currentNode) {
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(...currentNode.boundingBox!.min),
        new THREE.Vector3(...currentNode.boundingBox!.max)
      );
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.max.clone().sub(boundingBox.min);
      infoPane.push(
        <div key="3d-node">
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
        </div>
      );
    }
    let form = null;
    let title = null;
    if (!modelId) {
      if (!rootAssetId) {
        title = 'All 3D Models';
        form = <ModelList />;
      } else {
        title = 'Map to a 3D Model';
        form = <ModelList />;
      }
    } else {
      const model = models[modelId];
      infoPane.push(
        <div key="3d-model">
          <h3>3D Model Info</h3>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Name">
              {model ? model.name : 'Loading...'}
            </Descriptions.Item>
            <Descriptions.Item label="Created Time">
              {model
                ? moment(model.createdTime).format('DD/MM/YYYY')
                : 'Loading...'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      );
      // If a Node is selected
      if (nodeId) {
        if (assetId) {
          title = `Mapped Node: ${
            all[assetId] ? all[assetId].name : 'Loading...'
          }`;
          form = (
            <Popconfirm
              title="Are you sure you want to unmap the 3D node?"
              onConfirm={() => {
                if (revisionId) {
                  this.props.deleteAssetNodeMapping(
                    modelId,
                    revisionId,
                    asset!.id
                  );
                  this.props.setAssetId(
                    rootAssetId!,
                    asset!.parentId || asset!.rootId
                  );
                } else {
                  message.info('Nothing to unmap');
                }
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button type="danger" disabled={!revisionId || !modelId}>
                Unmap 3D Node
              </Button>
            </Popconfirm>
          );
        } else {
          title = 'No Asset Linked to Node';
          form = (
            <>
              <Button onClick={this.selectParentClicked}>Select Parent</Button>
              <br />
              <br />
              <MapNodeToAssetForm />
            </>
          );
        }
      } else if (rootAssetId) {
        // If No Node with Root
        if (assetId === rootAssetId) {
          // If on root asset
          title = 'Click a Node to see linked Asset info';
        } else if (assetId) {
          // If No Node with Root and Asset
          title = 'No Node Linked to Asset';
        } else {
          // If No Node and No Asset with Root
          title = 'Select a 3D Node to see more information';
        }
      } else if (assetId) {
        // If No Node with Asset
        title = 'No Node Selected';
      } else {
        // If No Nothing just Model
        title = `No Asset linked to ${
          model ? model.name : 'Loading...'
        } right now`;
        form = <MapModelToAssetForm />;
      }
    }
    return (
      <>
        <h3>{title}</h3>
        {modelId && rootAsset && (
          <p>Model is Mapped to: {rootAsset ? rootAsset.name : 'N/A'}</p>
        )}
        {form}
        {infoPane.map(el => (
          <>
            <Divider />
            {el}
          </>
        ))}
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
      deleteAssetNodeMapping,
      setAssetId,
      resetAppState,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NodeDrawer);
