import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Model3DViewer } from '@cognite/gearbox';
import { THREE } from '@cognite/3d-viewer';
import { Slider } from 'antd';
import LoadingScreen from './LoadingScreen';
import { selectResult } from '../modules/search';

class Model3D extends React.Component {
  state = {};

  currentColoredNodes = [];

  cache = {};

  componentDidMount() {}

  componentDidUpdate(prevProps, prevState) {
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

  selectNode = (mapping, animate, duration = 500) => {
    const boundingBox = new THREE.Box3();
    this.iterateNodeSubtree(mapping.treeIndex, mapping.subtreeSize, nodeId => {
      this.state.model.selectNode(nodeId);
      boundingBox.union(this.state.model.getBoundingBox(nodeId));
    });

    if (animate) {
      this.state.viewer.fitCameraToBoundingBox(boundingBox, duration);
    }
  };

  iterateNodeSubtree = (treeIndex, subtreeSize, action) => {
    for (let i = treeIndex; i < treeIndex + subtreeSize; i++) {
      const nodeId = this.state.model._getNodeId(i);
      if (nodeId != null) {
        action(nodeId);
      }
    }
  };

  setSlicingForCurrentAsset = () => {
    const boundingBox = new THREE.Box3();
    this.iterateNodeSubtree(this.props.nodeId, id => {
      boundingBox.union(this.state.model.getBoundingBox(id));
    });

    const plane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      boundingBox.max.y + 0.5
    );
    this.viewer.setSlicingPlanes([plane]);
  };

  onSliderChange = change => {
    const plane1 = new THREE.Plane(new THREE.Vector3(0, -1, 0), change[1]);
    const plane2 = new THREE.Plane(new THREE.Vector3(0, 1, 0), -change[0]);
    this.viewer.setSlicingPlanes([plane1, plane2]);
  };

  updateSearchResult() {
    const threed = this.props.result.filter(result => result.kind === '3d');

    if (threed.length > 0) {
      this.state.model.deselectAllNodes();

      this.colorNodes(threed[0].mappings);
      if (threed[0].mappings.length === 1) {
        this.selectNode(threed[0].mappings[0], true);
      }
    }
    // if (this.model) {
    //   this.selectNode(this.props.nodeId, true, 1500);
    // }
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
        <Slider
          vertical
          step={0.1}
          defaultValue={[495, 510]}
          range
          min={495}
          max={510}
          style={{
            position: 'absolute',
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
