import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Model3DViewer } from '@cognite/gearbox';
import { THREE, TWEEN } from '@cognite/3d-viewer';
import LoadingScreen from './LoadingScreen';
import { selectResult } from '../modules/search';

function clamp(val, min, max) {
  return Math.max(min, Math.min(val, max));
}

function animateCamera(position, target, viewer, boundingBox) {
  const { _camera: camera } = viewer;

  const distance = position.distanceTo(camera.position);
  let duration = distance * 125; // 250ms per unit distance
  duration = clamp(duration, 600, 1500); // min duration 600ms and 2500ms as max duration

  const startTarget = viewer.getCameraTarget();

  const from = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    targetX: startTarget.x,
    targetY: startTarget.y,
    targetZ: startTarget.z,
  };

  const to = {
    x: position.x,
    y: position.y,
    z: position.z,
    targetX: target.x,
    targetY: target.y,
    targetZ: target.z,
  };

  const tween = new TWEEN.Tween(from);

  const tmpTarget = new THREE.Vector3();
  const tmpPosition = new THREE.Vector3();
  const boundingBoxHeight = boundingBox.max.y - boundingBox.min.y;
  tween
    .to(to, duration)
    .easing(TWEEN.Easing.Circular.Out)
    .onUpdate(() => {
      tmpPosition.set(from.x, from.y, from.z);
      tmpTarget.set(from.targetX, from.targetY, from.targetZ);

      viewer.setCameraPosition(tmpPosition);
      viewer.setCameraTarget(tmpTarget);

      // center point plus half of bounding box height
      const y = tmpTarget.y + 0.5 * boundingBoxHeight;
      // Set slicing to show the result
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), y);
      viewer.setSlicingPlanes([plane]);
    })
    .start();
}

function fitCameraToBoundingBox(
  box,
  viewer,
  radiusFactor,
  direction = new THREE.Vector3(0, 1, 0.7)
) {
  const boundingSphere = new THREE.Sphere();
  box.getBoundingSphere(boundingSphere);
  const target = boundingSphere.center;

  const distance = Math.max(
    2.0 * viewer._getSmallestMeanObjectSize(), // this is the smallest value controls.minDistance can have
    boundingSphere.radius * radiusFactor
  ); // distance from target

  direction.normalize();

  const position = new THREE.Vector3();
  position
    .copy(direction)
    .multiplyScalar(distance)
    .add(target);
  animateCamera(position, target, viewer, box);
}

class Model3D extends React.Component {
  state = {};

  currentColoredNodes = [];

  cache = {};

  componentDidMount() {}

  componentDidUpdate(prevProps) {
    if (prevProps.result !== this.props.result && this.state.model) {
      this.updateSearchResult(true);
    }

    if (prevProps.hideMode !== this.props.hideMode && this.state.model) {
      this.updateSearchResult(false);
    }
  }

  onProgress = progress => {
    this.setState({ progress });
  };

  onComplete = () => {
    this.setState({ progress: undefined });

    this.state.model._treeIndexNodeIdMap.forEach(id => {
      this.state.model.setNodeColor(id, 170, 170, 170);
    });

    this.updateSearchResult(true);
  };

  onClick = () => {};

  onReady = (viewer, model) => {
    this.setState({
      model,
      viewer,
    });

    model._screenSpaceRatio = 0.01;
    window.viewer = viewer;
    viewer.disableKeyboardNavigation();
    window.THREE = THREE;
    window.model = model;
  };

  selectNode = mapping => {
    this.iterateNodeSubtree(mapping.treeIndex, mapping.subtreeSize, nodeId => {
      this.state.model.selectNode(nodeId);
    });
  };

  fitCameraToNodes = mappings => {
    if (mappings.length === 0) {
      return;
    }

    const { viewer } = this.state;

    const boundingBox = new THREE.Box3();
    mappings.forEach(mapping => {
      this.iterateNodeSubtree(
        mapping.treeIndex,
        mapping.subtreeSize,
        nodeId => {
          boundingBox.union(this.state.model.getBoundingBox(nodeId));
        }
      );
    });

    if (mappings.length > 1) {
      // We want to view it from above
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      const direction = new THREE.Vector3(0, 1, 0.3);
      fitCameraToBoundingBox(boundingBox, viewer, 2, direction);
    } else {
      fitCameraToBoundingBox(boundingBox, viewer, 4);
    }

    // // Set slicing to show the result
    // const plane = new THREE.Plane(
    //   new THREE.Vector3(0, -1, 0),
    //   boundingBox.max.y + 0.5
    // );
    // viewer.setSlicingPlanes([plane]);
  };

  iterateNodeSubtree = (treeIndex, subtreeSize, action) => {
    for (let i = treeIndex; i < treeIndex + subtreeSize; i++) {
      const nodeId = this.state.model._getNodeId(i);
      if (nodeId != null) {
        action(nodeId);
      }
    }
  };

  updateSearchResult(animate) {
    const threed = this.props.result.filter(result => result.kind === '3d');

    if (threed.length > 0) {
      this.state.model.deselectAllNodes();
      if (this.props.hideMode !== 0) {
        const ghost = this.props.hideMode === 1;
        this.state.model.hideAllNodes(ghost);
      } else {
        this.state.model.showAllNodes();
      }

      this.colorNodes(threed[0].mappings);

      if (animate) {
        this.fitCameraToNodes(threed[0].mappings);
      }
      if (threed[0].mappings.length === 1) {
        this.selectNode(threed[0].mappings[0], true);
      }
    }
  }

  colorNodes(mappings) {
    if (!this.state.model) {
      return;
    }

    this.currentColoredNodes.forEach(nodeId => {
      this.state.model.setNodeColor(nodeId, 170, 170, 170);
    });

    this.currentColoredNodes = [];
    mappings.forEach(mapping => {
      const { treeIndex, subtreeSize } = mapping;
      this.iterateNodeSubtree(treeIndex, subtreeSize, nodeId => {
        this.state.model.resetNodeColor(nodeId);
        this.state.model.showNode(nodeId);
        this.currentColoredNodes.push(nodeId);
      });
    });
  }

  render() {
    if (this.state.model) {
      // this.colorSearchResult();
      // this.setSlicingForCurrentAsset();
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
          enableKeyboardNavigation={false}
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
  // eslint-disable-next-line react/forbid-prop-types
  result: PropTypes.any.isRequired,
  hideMode: PropTypes.number.isRequired,
  keyboard3DEnabled: PropTypes.bool.isRequired,
};

Model3D.defaultProps = {
  cache: undefined,
};

const mapStateToProps = state => {
  return {
    result: selectResult(state),
  };
};

const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Model3D);
