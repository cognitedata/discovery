import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { SVGViewer, Model3DViewer } from '@cognite/gearbox';
import * as THREE from 'three';
import mixpanel from 'mixpanel-browser';
import * as sdk from '@cognite/sdk';
import { getAsset, selectAssets, Assets } from '../modules/assets';
import AssetDrawer from './AssetDrawer';
import LoadingScreen from '../components/LoadingScreen';
import PNIDViewer from './PNIDViewer';

import {
  findAssetIdFromMappings,
  getMappingsFromAssetId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

const cache = {};
let isSelectingSoon = false;

const getTextFromMetadataNode = node =>
  (node.textContent || '').replace(/\s/g, '');

class AssetViewer extends React.Component {
  state = {
    nodeId: undefined,
    modelId: 2495544803289093,
    revisionId: 3041181389296996,
  };

  componentDidMount() {
    this.getAssetMappingsForAssetId();
    if (this.state.nodeId) {
      this.select3DNode(this.state.nodeId);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const asset = this.getAsset();
    if (this.props.assetId && !asset) {
      this.props.doGetAsset(this.props.assetId);
    }

    if (prevProps.assetId !== this.props.assetId) {
      mixpanel.context.track('Asset.changed', { asset });
      this.getAssetMappingsForAssetId();
    }

    if (
      this.state.nodeId &&
      this.model &&
      !this.model._selectedNodes.has(this.state.nodeId) &&
      !isSelectingSoon
    ) {
      isSelectingSoon = true;
      setTimeout(() => {
        this.select3DNode(this.state.nodeId);
        isSelectingSoon = false;
      }, 100);
    }

    if (prevState.nodeId !== this.state.nodeId) {
      if (this.model) {
        this.model.deselectAllNodes();
      }
      if (this.state.nodeId !== undefined) {
        if (this.model && this.model._getTreeIndex(this.state.nodeId) != null) {
          this.select3DNode(this.state.nodeId, true);
        } else {
          this.getBoundingBoxForNodeId(this.state.nodeId);
        }
      }
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

  on3DClick = nodeId => {
    this.getAssetMappingsForNodeId(nodeId);
  };

  on3DReady = (viewer, model, revision) => {
    const { nodeId } = this.state;
    this.viewer = viewer;
    this.model = model;
    window.viewer = viewer;
    window.model = model;
    this.select3DNode(nodeId, false);
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

  getAssetMappingsForNodeId = async nodeId => {
    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];

    const filteredMappings = assetMappings.filter(
      mapping => mapping.nodeId === nodeId
    );
    if (filteredMappings.length === 0) {
      const result = await sdk.ThreeD.listAssetMappings(
        this.state.modelId,
        this.state.revisionId,
        { nodeId }
      );
      const assetId = findAssetIdFromMappings(nodeId, result.items);
      if (assetId != null) {
        this.props.onAssetIdChange(assetId);
      }
    } else {
      const { assetId } = filteredMappings[0];
      this.props.onAssetIdChange(assetId);
    }
  };

  select3DNode = (nodeId, animate) => {
    this.model.deselectAllNodes();
    this.model.selectNode(nodeId);
    const boundingBox = this.model.getBoundingBox(nodeId);
    const duration = animate ? 500 : 0;
    if (boundingBox.isEmpty()) {
      this.viewer.fitCameraToModel(this.model, duration);
    } else {
      this.viewer.fitCameraToBoundingBox(boundingBox, duration);
    }
  };

  onPNIDClick = item => {
    console.log('Clicked ', item);
  };

  searchAndSelectAssetName = async name => {
    const result = await sdk.Assets.search({ name });
    const exactMatches = result.items.filter(asset => asset.name === name);
    if (exactMatches.length > 0) {
      const assetId = exactMatches[0].id;
      this.props.onAssetIdChange(assetId);
    }
  };

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
                // boundingBox={this.state.boundingBox}
                onClick={this.on3DClick}
                onReady={this.on3DReady}
                onProgress={this.on3DProgress}
                onComplete={this.on3DComplete}
                cache={cache}
              />
            </>
          </div>
        )}
        {this.props.view === 'PNID' && (
          <div style={{ height: '100%', paddingRight: 400, paddingTop: 50 }}>
            <SVGViewer
              documentId={8910925076675219}
              title="Title"
              description="Description"
              isCurrentAsset={metadata => {
                if (asset) {
                  return getTextFromMetadataNode(metadata) === asset.name;
                }
              }}
              handleItemClick={item => {
                window.item = item;
                const name = window.item.children[0].children[0].innerHTML;
                this.searchAndSelectAssetName(name);
              }}
            />
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
  onAssetIdChange: PropTypes.func.isRequired,
  doGetMappingsFromAssetId: PropTypes.func.isRequired,
  doGetAsset: PropTypes.func.isRequired,
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
  doGetAsset: (...args) => dispatch(getAsset(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
