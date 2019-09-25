// TODO is this ideal?
import React from 'react';
import { connect } from 'react-redux';
import { Model3DViewer, CacheObject, Callback } from '@cognite/gearbox';
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
  assetId: number;
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
  nodeId?: number;
  progress?: ProgressObject;
  forceReload: boolean;
};

class Model3D extends React.Component<Props, State> {
  static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    nodeId: undefined,
    cache: undefined,
  };

  hasWarnedAboutNode: { [key: string]: boolean } = {};

  readonly state: Readonly<State> = { forceReload: false };

  currentColoredNodes: number[] = [];

  model?: Cognite3DModel = undefined;

  viewer?: Cognite3DViewer = undefined;

  componentDidMount() {
    if (this.props.nodeId) {
      this.setState({ nodeId: this.props.nodeId });
      this.props.doFetchNode(
        this.props.modelId,
        this.props.revisionId,
        this.props.nodeId
      );
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.nodeId !== this.props.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeId: undefined });
    }

    if (prevState.nodeId !== this.state.nodeId && this.state.nodeId) {
      // If a user clicks on a 3d node
      const assetId = this.getAssetIdForNodeId(this.state.nodeId);
      if (assetId) {
        this.props.onAssetIdChange(assetId);
      } else {
        this.props.onNodeIdChange(this.state.nodeId);
      }
    }

    if (prevProps.assetMappings !== this.props.assetMappings) {
      if (this.state.nodeId && this.state.nodeId !== this.props.nodeId) {
        const assetId = this.getAssetIdForNodeId(this.state.nodeId);
        if (assetId) {
          this.props.onAssetIdChange(assetId);
        } else if (!this.hasWarnedAboutNode[this.state.nodeId]) {
          message.info('Did not find any asset associated to this 3D object.');
          setTimeout(() => {
            this.hasWarnedAboutNode[this.state.nodeId!] = true;
          }, 10);
        }
      }
    }

    if (prevProps.nodeId !== this.props.nodeId) {
      this.props.doFetchNode(
        this.props.modelId,
        this.props.revisionId,
        this.props.nodeId!
      );
      if (this.model) {
        this.selectNode(this.props.nodeId!, true, 1500);
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
    this.setState({ progress: undefined });
    let { nodeId } = this.props;
    if (this.state.nodeId) {
      ({ nodeId } = this.state);
    }

    if (nodeId) {
      this.selectNode(nodeId, true, 0);
    }

    if (!this.model) {
      return;
    }
    // TODO, this is not valid...
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    this.model!._treeIndexNodeIdMap.forEach(id => {
      this.model!.setNodeColor(id, 170, 170, 170);
    });
  };

  onClick = (nodeId: number) => {
    this.setState({ nodeId });
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
  };

  selectNode = async (
    nodeId: number,
    animate: boolean,
    duration: number = 500
  ) => {
    if (!this.model) {
      return;
    }
    this.model!.deselectAllNodes();
    if (nodeId == null) {
      return;
    }

    let mapping = this.props.assetMappings.byNodeId[nodeId];

    if (!mapping) {
      const nodes = await sdk.viewer3D.listRevealNodes3D(
        this.props.modelId,
        this.props.revisionId,
        {
          nodeId,
          depth: 0,
        }
      );
      [mapping] = nodes.items;
    }
    if (!mapping) {
      return;
    }

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

  iterateNodeSubtree = (nodeId: number, action: Callback) => {
    const mapping = this.props.assetMappings.byNodeId[nodeId];
    if (mapping) {
      for (
        let { treeIndex } = mapping;
        treeIndex < mapping.treeIndex + mapping.subtreeSize;
        treeIndex++
      ) {
        // TODO invalid function -> move into 3d-viewer
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        const id = this.model!._getNodeId(treeIndex);
        if (id != null) {
          action(id);
        }
      }

      // Did execute
      return true;
    }
    // Did not execute
    return false;
  };

  setSlicingForCurrentAsset = () => {
    const boundingBox = new THREE.Box3();
    this.iterateNodeSubtree(this.props.nodeId!, id => {
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

  colorSearchResult() {
    this.currentColoredNodes.forEach(nodeId => {
      this.iterateNodeSubtree(nodeId, id => {
        this.model!.setNodeColor(id, 100, 100, 100);
      });
    });

    this.currentColoredNodes = [];

    // Reset color on old ones
    this.props.filteredSearch.items.forEach(asset => {
      const mapping = this.props.assetMappings.byAssetId[asset.id];
      if (mapping) {
        const { nodeId } = mapping;
        const didColor = this.iterateNodeSubtree(nodeId, id => {
          this.model!.resetNodeColor(id);
        });

        if (didColor) {
          this.currentColoredNodes.push(nodeId);
        }
      }
    });
  }

  render() {
    if (this.state.forceReload) {
      this.setState({ forceReload: false });
      return null;
    }
    if (this.model) {
      this.colorSearchResult();
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Model3D);
