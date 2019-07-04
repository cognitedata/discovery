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

function animateCamera(position, target, viewer, duration = 1000) {
  const { _camera: camera } = viewer;

  if (duration == null) {
    const distance = position.distanceTo(camera.position);
    duration = distance * 125; // 250ms per unit distance
    duration = clamp(duration, 600, 2500); // min duration 600ms and 2500ms as max duration
  }

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const distanceToTarget = target.distanceTo(camera.position);
  const scaledDirection = raycaster.ray.direction
    .clone()
    .multiplyScalar(distanceToTarget);
  const startTarget = raycaster.ray.origin.clone().add(scaledDirection);

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
  tween
    .to(to, duration)
    .easing(TWEEN.Easing.Circular.Out)
    .onUpdate(() => {
      tmpPosition.set(from.x, from.y, from.z);
      tmpTarget.set(from.targetX, from.targetY, from.targetZ);

      viewer.setCameraPosition(tmpPosition);
      viewer.setCameraTarget(tmpTarget);
    })
    .start();
}

function fitCameraToBoundingBox(box, viewer, duration) {
  const boundingSphere = new THREE.Sphere();
  box.getBoundingSphere(boundingSphere);
  const target = boundingSphere.center;

  const distance = Math.max(
    2.0 * viewer._getSmallestMeanObjectSize(), // this is the smallest value controls.minDistance can have
    boundingSphere.radius * 4
  ); // distance from target

  const direction = new THREE.Vector3(0, 1, 0.7);
  direction.normalize();

  const position = new THREE.Vector3();
  position
    .copy(direction)
    .multiplyScalar(distance)
    .add(target);
  animateCamera(position, target, viewer, duration);
}

class Model3D extends React.Component {
  state = {};

  currentColoredNodes = [];

  cache = {};

  componentDidMount() {}

  componentDidUpdate(prevProps) {
    if (prevProps.result !== this.props.result && this.state.model) {
      this.updateSearchResult();
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

    this.updateSearchResult();
  };

  onClick = () => {};

  onReady = (viewer, model) => {
    this.setState({
      model,
      viewer,
    });

    window.viewer = viewer;
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
      const target = center.clone();

      center.z += 3;
      center.y += 10;
      const position = center.clone();

      animateCamera(position, target, viewer);
    } else {
      fitCameraToBoundingBox(boundingBox, viewer);
    }

    // Set slicing to show the result
    const plane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      boundingBox.max.y + 0.5
    );
    viewer.setSlicingPlanes([plane]);
  };

  iterateNodeSubtree = (treeIndex, subtreeSize, action) => {
    for (let i = treeIndex; i < treeIndex + subtreeSize; i++) {
      const nodeId = this.state.model._getNodeId(i);
      if (nodeId != null) {
        action(nodeId);
      }
    }
  };

  updateSearchResult() {
    const threed = this.props.result.filter(result => result.kind === '3d');

    if (threed.length > 0) {
      this.state.model.deselectAllNodes();

      this.colorNodes(threed[0].mappings);
      this.fitCameraToNodes(threed[0].mappings);
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
};

Model3D.defaultProps = {
  cache: undefined,
};

const mapStateToProps = state => {
  return {
    result: selectResult(state).items,
  };
};

const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Model3D);
