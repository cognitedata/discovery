import React from 'react';
import { THREE, Cognite3DViewer, Cognite3DModel } from '@cognite/3d-viewer';
import { Slider } from 'antd';
import debounce from 'lodash/debounce';
import { Model3DViewer, CacheObject } from '@cognite/gearbox';
import { SliderValue } from 'antd/lib/slider';
import { sdk } from 'utils/SDK';
import Model3DLoadingDialog, { ProgressObject } from './Model3DLoadingDialog';

import { trackUsage } from '../utils/Metrics';

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
  nodeIds?: number[];
  onAssetIdChange: (assetId: number, nodeId: number) => void;
  onNodeIdChange: (nodeId: number) => void;
};

type State = {
  progress?: ProgressObject;
  forceReload: boolean;
};

class Model3D extends React.Component<Props, State> {
  viewer?: Cognite3DViewer = undefined;

  cache: CacheObject = {};

  hasWarnedAboutNode: { [key: string]: boolean } = {};

  readonly state: Readonly<State> = { forceReload: false };

  currentColoredNodes: number[] = [];

  model?: Cognite3DModel = undefined;

  public static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    nodeId: undefined,
  };

  constructor(props: Props) {
    super(props);

    this.selectNodeIds = debounce(this.selectNodeIds, 500);
  }

  componentDidMount() {
    this.selectNodeIds(this.props.nodeIds);
  }

  componentDidUpdate(prevProps: Props) {
    const { nodeIds } = this.props;

    if (prevProps.nodeIds !== nodeIds) {
      this.selectNodeIds(nodeIds);
    }

    if (prevProps.revisionId !== this.props.revisionId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ forceReload: true });
    }
  }

  getAssetIdForNodeId = async (nodeId: number) => {
    const {
      items: [mapping],
    } = await sdk.assetMappings3D.list(
      this.props.modelId,
      this.props.revisionId,
      { nodeId }
    );

    if (mapping) {
      return mapping.assetId;
    }
    return undefined;
  };

  onProgress = (progress: ProgressObject) => {
    this.setState({ progress });
  };

  onComplete = () => {
    trackUsage('3DViewer.Complete');
    this.setState({ progress: undefined });
  };

  onClick = async (nodeId: number) => {
    trackUsage('3DViewer.SelectNode', { nodeId });
    const assetId = await this.getAssetIdForNodeId(nodeId);
    if (assetId) {
      this.props.onAssetIdChange(assetId, nodeId);
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

    const { nodeIds } = this.props;

    if (!this.model) {
      return;
    }

    // TODO, this is not valid...
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    this.model!._treeIndexNodeIdMap.forEach(id => {
      this.model!.setNodeColor(id, 170, 170, 170);
    });

    this.selectNodeIds(nodeIds);
  };

  selectNodeIds = async (nodeIds?: number[]) => {
    if (this.model) {
      this.model.deselectAllNodes();
      if (nodeIds && nodeIds.length > 0) {
        const boundingBox = new THREE.Box3();
        await Promise.all(
          [...new Set(nodeIds)].map(async nodeId => {
            await this.selectNode(nodeId, boundingBox);
          })
        );
        this.viewer!.fitCameraToBoundingBox(boundingBox, 500);
      }
    }
  };

  selectNode = async (nodeId: number, boundingBox: THREE.Box3) => {
    if (!this.model) {
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
    const { min, max } = mapping.boundingBox;
    [min, max].forEach(point => {
      const pointThree = new THREE.Vector3(...point);
      const xform = pointThree.applyMatrix4(this.model!.matrix);
      boundingBox.expandByPoint(xform);
    });
    const nodeIds = await this.model.getSubtreeNodeIds(
      nodeId,
      mapping.subtreeSize
    );
    nodeIds.forEach(id => {
      this.model!.selectNode(id);
    });
    // // The node may not have geometries in the scene, so we need to
    // // find all children and select them + compute bounding box
    // for (
    //   let { treeIndex } = mapping;
    //   treeIndex < mapping.treeIndex + mapping.subtreeSize;
    //   treeIndex++
    // ) {
    //   // TODO, this is not allowed
    //   // @ts-ignore
    //   // eslint-disable-next-line no-underscore-dangle
    //   const thisNodeId = this.model!._getNodeId(treeIndex);
    //   if (thisNodeId) {
    //     this.model!.selectNode(thisNodeId);
    //     boundingBox.union(this.model!.getBoundingBox(thisNodeId));
    //   }
    // }
  };

  // setSlicingForCurrentAsset = () => {
  //   const boundingBox = new THREE.Box3();
  //   this.model!.iterateSubtree(this.props.nodeId!, id => {
  //     boundingBox.union(this.model!.getBoundingBox(id));
  //   });

  //   const plane = new THREE.Plane(
  //     new THREE.Vector3(0, -1, 0),
  //     boundingBox.max.y + 0.5
  //   );
  //   this.viewer!.setSlicingPlanes([plane]);
  // };

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

    // // Reset color on old ones
    // this.props.filteredSearch.items.forEach(asset => {
    //   const mapping = this.props.assetMappings.byAssetId[asset.id];
    //   if (mapping) {
    //     const { nodeId } = mapping;
    //     const didColor = this.model!.iterateSubtree(nodeId, id => {
    //       this.model!.resetNodeColor(id);
    //     });

    //     if (didColor) {
    //       this.currentColoredNodes.push(nodeId);
    //     }
    //   }
    // });
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
          cache={this.cache}
        />
      </>
    );
  }
}

export default Model3D;
