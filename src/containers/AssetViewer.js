import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { AssetMeta, Model3DViewer } from '@cognite/gearbox';
import { Spin } from 'antd';
import * as THREE from 'three';
import mixpanel from 'mixpanel-browser';
import * as sdk from '@cognite/sdk';
import { selectAssets, Assets } from '../modules/assets';
import AssetDrawer from './AssetDrawer';
import LoadingScreen from '../components/LoadingScreen';

import {
  getMappingsFromAssetId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

class AssetViewer extends React.Component {
  state = {
    nodeId: undefined,
    modelId: 2495544803289093,
    revisionId: 3041181389296996,
  };

  componentDidMount() {
    this.getAssetMappingsForAssetId();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.assetId !== this.props.assetId) {
      const asset = this.getAsset();
      mixpanel.context.track('Asset.changed', { asset });
      this.getAssetMappingsForAssetId();
    }

    if (prevState.nodeId !== this.state.nodeId) {
      this.getBoundingBoxForNodeId(this.state.nodeId);
    }

    if (prevProps.assetMappings !== this.props.assetMappings) {
      this.updateNodeIdFromMappings();
    }
  }

  async getBoundingBoxForNodeId(nodeId) {
    this.setState({ boundingBox: undefined });
    const result = await sdk.ThreeD.listNodes(
      this.state.modelId,
      this.state.revisionId,
      { nodeId }
    );
    if (result.items.length === 0) {
      return;
    }

    const node = result.items[0];
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(...node.boundingBox.min),
      new THREE.Vector3(...node.boundingBox.max)
    );
    boundingBox.expandByVector(new THREE.Vector3(10, 10, 0));
    boundingBox.min.z -= 2;
    boundingBox.max.z += 2;
    this.setState({ boundingBox });
  }

  getAsset() {
    const { assets, assetId } = this.props;
    let asset;
    if (assets.all) {
      const filteredAssets = assets.all.filter(a => a.id === assetId);
      if (filteredAssets.length > 0) {
        [asset] = filteredAssets;
      }
    }
    return asset;
  }

  on3DProgress = progress => {
    this.setState({ progress });
  };

  on3DComplete = () => {
    this.setState({ progress: undefined });
  };

  on3DClick = nodeId => {};

  on3DReady = (viewer, model, revision) => {
    const { nodeId } = this.state;
    this.viewer = viewer;
    this.model = model;
    model.selectNode(nodeId);
    const boundingBox = model.getBoundingBox(nodeId);
    viewer.fitCameraToBoundingBox(boundingBox, 0);
  };

  getAssetMappingsForAssetId() {
    const { assetId, doGetMappingsFromAssetId } = this.props;
    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];
    const nodeId = this.updateNodeIdFromMappings();

    if (nodeId == null || assetMappings.length === 0) {
      doGetMappingsFromAssetId(
        this.state.modelId,
        this.state.revisionId,
        assetId
      );
    }
  }

  updateNodeIdFromMappings() {
    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];

    const matchedMappings = assetMappings
      .filter(m => m.assetId === this.props.assetId)
      .sort((a, b) => a.subtreeSize - b.subtreeSize);

    const nodeId =
      matchedMappings.length > 0 ? matchedMappings[0].nodeId : undefined;
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState({ nodeId });
    return nodeId;
  }

  render() {
    const asset = this.getAsset();
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        {this.props.view === '3d' && this.state.boundingBox != null && (
          <div style={{ height: '100%', paddingRight: 400 }}>
            <>
              {this.state.progress && (
                <LoadingScreen progress={this.state.progress} />
              )}
              <Model3DViewer
                modelId={this.state.modelId}
                revisionId={this.state.revisionId}
                boundingBox={this.state.boundingBox}
                onClick={this.on3DClick}
                onReady={this.on3DReady}
                onProgress={this.on3DProgress}
                onComplete={this.on3DComplete}
              />
            </>
          </div>
        )}
        {asset != null && <AssetDrawer loading asset={asset} />}
      </div>
    );
  }
}

AssetViewer.propTypes = {
  assetId: PropTypes.number.isRequired,
  assets: Assets.isRequired,
  view: PropTypes.string.isRequired,
  assetMappings: AssetMappings,
  doGetMappingsFromAssetId: PropTypes.func.isRequired,
};

AssetViewer.defaultProps = {
  assetMappings: {},
};

const mapStateToProps = state => {
  return {
    assets: selectAssets(state),
    assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doGetMappingsFromAssetId: (...args) =>
    dispatch(getMappingsFromAssetId(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
