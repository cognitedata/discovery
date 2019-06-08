import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Model3DViewer } from '@cognite/gearbox';
import { message } from 'antd';
import LoadingScreen from './LoadingScreen';
import { Asset } from '../modules/assets';
import {
  fetchMappingsFromNodeId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

class Model3D extends React.Component {
  state = { hasWarnedAboutNode: {} };

  cache = {};

  componentDidUpdate(prevProps, prevState) {
    if (prevState.nodeId !== this.state.nodeId && this.state.nodeId) {
      // this.selectNode(this.state.nodeId, true);

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
          message.info('Did not find asset associated to this 3D object.');
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
        this.model.deselectAllNodes();
      }

      if (this.model && this.model._getTreeIndex(this.props.nodeId) != null) {
        this.selectNode(this.props.nodeId, true);
      }
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
      this.selectNode(nodeId, false);
    }
  };

  onClick = nodeId => {
    this.setState({ nodeId });
  };

  onReady = (viewer, model) => {
    this.viewer = viewer;
    this.model = model;
    window.viewer = viewer;
    window.model = model;
  };

  selectNode = (nodeId, animate) => {
    this.model.deselectAllNodes();
    this.model.selectNode(nodeId);
    const boundingBox = this.model.getBoundingBox(nodeId);
    const duration = animate ? 500 : 0;
    this.viewer.fitCameraToBoundingBox(boundingBox, duration);
  };

  routerWillLeave() {
    return false;
  }

  render() {
    let assetId;
    if (this.props.asset) {
      assetId = assetId.id;
    }
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
          assetId={assetId}
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
  asset: Asset,
  nodeId: PropTypes.number,
  onAssetIdChange: PropTypes.func.isRequired,
  doFetchMappingsFromNodeId: PropTypes.func.isRequired,
  assetMappings: AssetMappings,
};

Model3D.defaultProps = {
  assetMappings: { byNodeId: {}, byAssetId: {} },
  asset: undefined,
  nodeId: undefined,
  cache: undefined,
};

const mapStateToProps = state => {
  return {
    assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doFetchMappingsFromNodeId: (...args) =>
    dispatch(fetchMappingsFromNodeId(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Model3D);
