// TODO is this ideal?
import React from 'react';
import { connect } from 'react-redux';
import { Model3DViewer, CacheObject } from '@cognite/gearbox';
import { THREE, Cognite3DViewer, Cognite3DModel } from '@cognite/3d-viewer';
import { Slider, message } from 'antd';
import { Dispatch, bindActionCreators } from 'redux';
import { Asset } from '@cognite/sdk';
import { SliderValue } from 'antd/lib/slider';
import Model3DLoadingDialog, { ProgressObject } from './Model3DLoadingDialog';
import {
  fetchMappingsFromNodeId,
  selectAssetMappings,
  fetchMappingsFromAssetId,
  AssetMappingState,
} from '../modules/assetmappings';
import { selectFilteredAssets } from '../modules/filters';
import { RootState } from '../reducers/index';
import { ExtendedAsset } from '../modules/assets';

import { fetchNode } from '../modules/threed';
import { sdk } from '../index';
import { trackUsage } from '../utils/metrics';

declare global {
  interface Window {
    viewer: Cognite3DViewer;
    model: Cognite3DModel;
    THREE: any;
  }
}

type Props = {
  modelId: number;
  revisionId: number;
  cache?: CacheObject;
  nodeId?: number;
  onAssetIdChange: (assetId: number) => void;
  onNodeIdChange: (assetId: number) => void;
  doFetchMappingsFromNodeId: typeof fetchMappingsFromNodeId;
  doFetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
  doFetchNode: typeof fetchNode;
  assetMappings: AssetMappingState;
  filteredSearch: { items: ExtendedAsset[] };
};

type State = {
  progress?: ProgressObject;
  forceReload: boolean;
};

class Model3D extends React.Component<Props, State> {
  viewer?: Cognite3DViewer = undefined;

  hasWarnedAboutNode: { [key: string]: boolean } = {};

  readonly state: Readonly<State> = { forceReload: false };

  currentColoredNodes: number[] = [];

  model?: Cognite3DModel = undefined;

  public static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    nodeId: undefined,
    cache: undefined,
  };

  componentDidMount() {
    const { nodeId } = this.props;
    if (nodeId) {
      const assetId = this.getAssetIdForNodeId(nodeId);
      if (assetId) {
        this.props.onAssetIdChange(assetId);
      }
      this.props.doFetchNode(this.props.modelId, this.props.revisionId, nodeId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { nodeId } = this.props;

    if (!nodeId) {
      this.selectNode(undefined, true);
    }

    if (prevProps.assetMappings !== this.props.assetMappings) {
      if (nodeId && prevProps.nodeId !== nodeId) {
        const assetId = this.getAssetIdForNodeId(nodeId);
        if (assetId) {
          this.props.onAssetIdChange(assetId);
        } else if (!this.hasWarnedAboutNode[nodeId]) {
          message.info('Did not find any asset associated to this 3D object.');
          setTimeout(() => {
            this.hasWarnedAboutNode[nodeId] = true;
          }, 10);
        }
      }
    }

    if (nodeId && prevProps.nodeId !== nodeId) {
      this.props.doFetchNode(
        this.props.modelId,
        this.props.revisionId,
        this.props.nodeId!
      );
      if (this.model) {
        this.selectNode(nodeId, true);
      }
    }

    if (prevProps.filteredSearch !== this.props.filteredSearch) {
      const { assetMappings, filteredSearch, modelId, revisionId } = this.props;
      let missing3D = filteredSearch.items.filter(
        (asset: Asset) => assetMappings.byAssetId[asset.id] === undefined
      );
      // Max 20 requests
      missing3D = missing3D.slice(0, Math.min(missing3D.length, 20));

      missing3D.forEach(asset => {
        this.props.doFetchMappingsFromAssetId(modelId, revisionId, asset.id);
      });
    }

    if (prevProps.revisionId !== this.props.revisionId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ forceReload: true });
    }
  }

  // async getBoundingBoxForNodeId(nodeId) {
  //   this.setState({ boundingBox: undefined });
  //   const result = await sdk.ThreeD.listNodes(
  //     this.state.modelId,
  //     this.state.revisionId,
  //     { nodeId }
  //   );
  //   if (result.items.length === 0) {
  //     return;
  //   }

  //   const node = result.items[0];
  //   const boundingBox = new THREE.Box3(
  //     new THREE.Vector3(...node.boundingBox.min),
  //     new THREE.Vector3(...node.boundingBox.max)
  //   );
  //   boundingBox.expandByVector(new THREE.Vector3(10, 10, 0));
  //   boundingBox.min.z -= 2;
  //   boundingBox.max.z += 2;
  //   this.setState({ boundingBox });
  // }

  getAssetIdForNodeId = (nodeId: number) => {
    if (!nodeId) {
      return null;
    }

    if (this.props.assetMappings.byNodeId[nodeId]) {
      const mapping = this.props.assetMappings.byNodeId[nodeId];
      return mapping.assetId;
    }

    this.props.doFetchMappingsFromNodeId(
      this.props.modelId,
      this.props.revisionId,
      nodeId
    );

    return null;
  };

  onProgress = (progress: ProgressObject) => {
    this.setState({ progress });
  };

  onComplete = () => {
    trackUsage('3DViewer.Complete');
    this.setState({ progress: undefined });
  };

  onClick = (nodeId: number) => {
    trackUsage('3DViewer.SelectNode', { nodeId });
    const assetId = this.getAssetIdForNodeId(nodeId);
    if (assetId) {
      this.props.onNodeIdChange(nodeId);
      this.props.onAssetIdChange(assetId);
    } else {
      this.props.onNodeIdChange(nodeId);
    }
  };

  onReady = (viewer: Cognite3DViewer, model: Cognite3DModel) => {
    this.viewer = viewer;
    this.model = model;
    // Temp disable screen space culling
    // TODO, this is not allowed
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle,no-param-reassign
    model._screenRatioLimit = 0.0;
    window.viewer = viewer;
    window.THREE = THREE;
    window.model = model;
    trackUsage('3DViewer.Ready');

    const { nodeId } = this.props;

    if (!this.model) {
      return;
    }

    // TODO, this is not valid...
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    this.model!._treeIndexNodeIdMap.forEach(id => {
      this.model!.setNodeColor(id, 170, 170, 170);
    });

    if (nodeId) {
      this.selectNode(nodeId, true);
    }
  };

  selectNode = async (
    nodeId?: number,
    animate: boolean = true,
    duration: number = 500
  ) => {
    if (!this.model) {
      return;
    }
    this.model!.deselectAllNodes();
    if (!nodeId) {
      return;
    }

    const nodes = await sdk.viewer3D.listRevealNodes3D(
      this.props.modelId,
      this.props.revisionId,
      {
        nodeId,
        depth: 0,
      }
    );
    const [mapping] = nodes.items;
    if (!mapping) {
      return;
    }
    console.log(mapping);

    const boundingBox = new THREE.Box3();
    // The node may not have geometries in the scene, so we need to
    // find all children and select them + compute bounding box
    for (
      let { treeIndex } = mapping;
      treeIndex < mapping.treeIndex + mapping.subtreeSize;
      treeIndex++
    ) {
      // TODO, this is not allowed
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      const thisNodeId = this.model!._getNodeId(treeIndex);
      if (thisNodeId) {
        this.model!.selectNode(thisNodeId);
        boundingBox.union(this.model!.getBoundingBox(thisNodeId));
      }
    }

    if (animate) {
      this.viewer!.fitCameraToBoundingBox(boundingBox, duration);
    }
  };

  setSlicingForCurrentAsset = () => {
    const boundingBox = new THREE.Box3();
    this.model!.iterateSubtree(this.props.nodeId!, id => {
      boundingBox.union(this.model!.getBoundingBox(id));
    });

    const plane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      boundingBox.max.y + 0.5
    );
    this.viewer!.setSlicingPlanes([plane]);
  };

  onSliderChange = (change: SliderValue) => {
    const changes = change as [number, number];
    const plane1 = new THREE.Plane(new THREE.Vector3(0, -1, 0), changes[1]);
    const plane2 = new THREE.Plane(new THREE.Vector3(0, 1, 0), -changes[0]);
    this.viewer!.setSlicingPlanes([plane1, plane2]);
  };

  colorSearchResult = () => {
    this.currentColoredNodes.forEach(nodeId => {
      this.model!.iterateSubtree(nodeId, id => {
        this.model!.setNodeColor(id, 100, 100, 100);
      });
    });

    this.currentColoredNodes = [];

    // Reset color on old ones
    this.props.filteredSearch.items.forEach(asset => {
      const mapping = this.props.assetMappings.byAssetId[asset.id];
      if (mapping) {
        const { nodeId } = mapping;
        const didColor = this.model!.iterateSubtree(nodeId, id => {
          this.model!.resetNodeColor(id);
        });

        if (didColor) {
          this.currentColoredNodes.push(nodeId);
        }
      }
    });
  };

  renderSlider = () => {
    return (
      <Slider
        vertical
        step={0.1}
        defaultValue={[495, 510]}
        range
        min={495}
        max={510}
        style={{
          position: 'absolute',
          top: '40px',
          paddingLeft: 10,
          paddingTop: 10,
          height: '50%',
        }}
        onChange={this.onSliderChange}
      />
    );
  };

  render() {
    if (this.state.forceReload) {
      this.setState({ forceReload: false });
      return null;
    }
    if (this.model) {
      // this.colorSearchResult();
      // this.setSlicingForCurrentAsset();
    }
    return (
      <>
        {this.state.progress && (
          <Model3DLoadingDialog progress={this.state.progress} />
        )}
        <Model3DViewer
          modelId={this.props.modelId}
          revisionId={this.props.revisionId}
          onClick={this.onClick}
          onReady={this.onReady}
          onProgress={this.onProgress}
          onComplete={this.onComplete}
          cache={this.props.cache}
        />
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assetMappings: selectAssetMappings(state),
    filteredSearch: selectFilteredAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchMappingsFromNodeId: fetchMappingsFromNodeId,
      doFetchMappingsFromAssetId: fetchMappingsFromAssetId,
      doFetchNode: fetchNode,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Model3D);
