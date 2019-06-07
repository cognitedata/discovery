import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import mixpanel from 'mixpanel-browser';
import Model3D from '../components/Model3D';
import PNIDViewer from '../components/PNIDViewer';
import { fetchAsset, selectAssets, Assets } from '../modules/assets';
import AssetDrawer from './AssetDrawer';
import {
  getMappingsFromAssetId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

class AssetViewer extends React.Component {
  cache = {};

  state = {
    modelId: 2495544803289093,
    revisionId: 3041181389296996,
    documentId: 8910925076675219,
  };

  componentDidUpdate(prevProps) {
    const asset = this.getAsset();
    if (this.props.assetId && !asset) {
      this.props.doFetchAsset(this.props.assetId);
    }

    if (prevProps.assetId !== this.props.assetId) {
      mixpanel.context.track('Asset.changed', { asset });
    }
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

  getNodeIdForAssetId(assetId) {
    console.log('this.props.assetMappings: ', this.props.assetMappings);
    if (this.props.assetMappings.byAssetId[assetId]) {
      const mapping = this.props.assetMappings.byAssetId[assetId];
      return mapping.nodeId;
    }

    this.props.doGetMappingsFromAssetId(
      this.state.modelId,
      this.state.revisionId,
      assetId
    );

    return null;
  }

  render3D() {
    const asset = this.getAsset();
    let nodeId;
    if (asset) {
      nodeId = this.getNodeIdForAssetId(asset.id);
    }
    return (
      <div style={{ height: '100%', paddingRight: 400 }}>
        <Model3D
          modelId={this.state.modelId}
          revisionId={this.state.revisionId}
          asset={this.asset}
          nodeId={nodeId}
          onAssetIdChange={this.props.onAssetIdChange}
          cache={this.cache}
        />
      </div>
    );
  }

  renderPNID() {
    const asset = this.getAsset();
    return (
      <PNIDViewer
        documentId={this.state.documentId}
        asset={asset}
        onAssetIdChange={this.props.onAssetIdChange}
      />
    );
  }

  render() {
    const asset = this.getAsset();
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        {this.props.view === '3d' && this.render3D()}
        {this.props.view === 'PNID' && this.renderPNID()}
        {asset != null && <AssetDrawer loading asset={asset} />}
      </div>
    );
  }
}

AssetViewer.propTypes = {
  assetId: PropTypes.number.isRequired,
  assets: Assets.isRequired,
  view: PropTypes.string.isRequired,
  onAssetIdChange: PropTypes.func.isRequired,
  doFetchAsset: PropTypes.func.isRequired,
  doGetMappingsFromAssetId: PropTypes.func.isRequired,
  assetMappings: AssetMappings,
};

AssetViewer.defaultProps = {
  assetMappings: { byNodeId: {}, byAssetId: {} },
};

const mapStateToProps = state => {
  return {
    assets: selectAssets(state),
    assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doFetchAsset: (...args) => dispatch(fetchAsset(...args)),
  doGetMappingsFromAssetId: (...args) =>
    dispatch(getMappingsFromAssetId(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
