import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Model3DViewer } from '@cognite/gearbox';
import { THREE } from '@cognite/3d-viewer';
import { message } from 'antd';
import * as sdk from '@cognite/sdk';
import LoadingScreen from './LoadingScreen';

import {
  fetchMappingsFromNodeId,
  selectAssetMappings,
  AssetMappings,
  fetchMappingsFromAssetId,
} from '../modules/assetmappings';
import { selectFilteredSearch, Filters } from '../modules/filters';

class Model3D extends React.Component {
  state = { hasWarnedAboutNode: {} };

  currentColoredNodes = [];

  cache = {};

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.nodeId !== this.props.nodeId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ nodeId: undefined });
    }

    if (prevState.nodeId !== this.state.nodeId && this.state.nodeId) {
      const assetId = this.getAssetIdForNodeId(this.state.nodeId);
      if (assetId) {
        this.props.onAssetIdChange(assetId);
      }
    }

    if (prevProps.assetMappings !== this.props.assetMappings) {
      if (this.state.nodeId && this.state.nodeId !== this.props.nodeId) {
        const assetId = this.getAssetIdForNodeId(this.state.nodeId);
        if (assetId) {
          this.props.onAssetIdChange(assetId);
        } else if (!this.state.hasWarnedAboutNode[this.state.nodeId]) {
          message.info('Did not find any asset associated to this 3D object.');
          setTimeout(() => {
            const { hasWarnedAboutNode } = this.state;
            hasWarnedAboutNode[this.state.nodeId] = true;
            this.setState({
              hasWarnedAboutNode,
            });
          }, 10);
        }
      }
    }

    if (prevProps.nodeId !== this.props.nodeId) {
      if (this.model) {
        this.selectNode(this.props.nodeId, true, 500);
      }
    }

    if (prevProps.filteredSearch !== this.props.filteredSearch) {
      let missing3D = this.props.filteredSearch.items.filter(
        asset => this.props.assetMappings.byAssetId[asset.id] === undefined
      );
      // Max 20 requests
      missing3D = missing3D.slice(0, Math.min(missing3D.length, 20));

      missing3D.forEach(asset => {
        this.props.doFetchMappingsFromAssetId(
          this.props.modelId,
          this.props.revisionId,
          asset.id
        );
      });
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

  getAssetIdForNodeId = nodeId => {
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

  onProgress = progress => {
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

    this.model._treeIndexNodeIdMap.forEach(id => {
      this.model.setNodeColor(id, 100, 100, 100);
    });
  };

  onClick = nodeId => {
    this.setState({ nodeId });
  };

  onReady = (viewer, model) => {
    this.viewer = viewer;
    this.model = model;
    // Temp disable screen space culling
    model._screenRatioLimit = 0.0;
    window.viewer = viewer;
    window.THREE = THREE;
    window.model = model;
  };

  selectNode = async (nodeId, animate, duration = 500) => {
    this.model.deselectAllNodes();
    if (nodeId == null) {
      return;
    }

    let mapping = this.props.assetMappings.byNodeId[nodeId];

    if (!mapping) {
      const nodes = await sdk.ThreeD.listNodes(
        this.props.modelId,
        this.props.revisionId,
        { nodeId, depth: 0 }
      );
      [mapping] = nodes.items;
    }

    const boundingBox = new THREE.Box3();
    // The node may not have geometries in the scene, so we need to
    // find all children and select them + compute bounding box
    for (
      let { treeIndex } = mapping;
      treeIndex < mapping.treeIndex + mapping.subtreeSize;
      treeIndex++
    ) {
      const thisNodeId = this.model._getNodeId(treeIndex);
      if (thisNodeId != null) {
        this.model.selectNode(thisNodeId);
        boundingBox.union(this.model.getBoundingBox(thisNodeId));
      }
    }

    if (animate) {
      this.viewer.fitCameraToBoundingBox(boundingBox, duration);
    }
  };

  iterateNodeSubtree = (nodeId, action) => {
    const mapping = this.props.assetMappings.byNodeId[nodeId];
    if (mapping) {
      for (
        let { treeIndex } = mapping;
        treeIndex < mapping.treeIndex + mapping.subtreeSize;
        treeIndex++
      ) {
        const id = this.model._getNodeId(treeIndex);
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

  colorSearchResult() {
    if (!this.model) {
      return;
    }

    this.currentColoredNodes.forEach(nodeId => {
      this.iterateNodeSubtree(nodeId, id => {
        this.model.setNodeColor(id, 100, 100, 100);
      });
    });

    this.currentColoredNodes = [];

    // Reset color on old ones
    this.props.filteredSearch.items.forEach(asset => {
      const mapping = this.props.assetMappings.byAssetId[asset.id];
      if (mapping) {
        const { nodeId } = mapping;
        const didColor = this.iterateNodeSubtree(nodeId, id => {
          this.model.resetNodeColor(id);
        });

        if (didColor) {
          this.currentColoredNodes.push(nodeId);
        }
      }
    });
  }

  render() {
    this.colorSearchResult();
    return (
      <>
        {this.state.progress && (
          <LoadingScreen progress={this.state.progress} />
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

Model3D.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  cache: PropTypes.object,
  nodeId: PropTypes.number,
  onAssetIdChange: PropTypes.func.isRequired,
  doFetchMappingsFromNodeId: PropTypes.func.isRequired,
  doFetchMappingsFromAssetId: PropTypes.func.isRequired,
  assetMappings: AssetMappings,
  filteredSearch: Filters.isRequired,
};

Model3D.defaultProps = {
  assetMappings: { byNodeId: {}, byAssetId: {} },
  nodeId: undefined,
  cache: undefined,
};

const mapStateToProps = state => {
  return {
    assetMappings: selectAssetMappings(state),
    filteredSearch: selectFilteredSearch(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doFetchMappingsFromNodeId: (...args) =>
    dispatch(fetchMappingsFromNodeId(...args)),
  doFetchMappingsFromAssetId: (...args) =>
    dispatch(fetchMappingsFromAssetId(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Model3D);
