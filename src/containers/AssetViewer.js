import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import mixpanel from 'mixpanel-browser';
import styled from 'styled-components';
import Model3D from '../components/Model3D';
import PNIDViewer from '../components/PNIDViewer';
import { fetchAsset, selectAssets, Assets } from '../modules/assets';
import AssetDrawer from './AssetDrawer';
import {
  getMappingsFromAssetId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
`;

class AssetViewer extends React.Component {
  cache = {};

  state = {
    modelId: 2495544803289093,
    revisionId: 3041181389296996,
    documentId: 8910925076675219,
  };

  componentDidMount() {
    this.loadAssetIfMissing();
  }

  componentDidUpdate() {
    this.loadAssetIfMissing();
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

  loadAssetIfMissing() {
    const asset = this.getAsset();
    if (this.props.assetId && !asset) {
      this.props.doFetchAsset(this.props.assetId);
    }
  }

  render3D() {
    const asset = this.getAsset();
    let nodeId;
    if (asset) {
      nodeId = this.getNodeIdForAssetId(asset.id);
    }
    return (
      <Model3D
        modelId={this.state.modelId}
        revisionId={this.state.revisionId}
        asset={this.asset}
        nodeId={nodeId}
        onAssetIdChange={this.props.onAssetIdChange}
        cache={this.cache}
      />
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
    const assetDrawerWidth = 275;

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <div style={{ height: '100%', paddingRight: assetDrawerWidth }}>
          <ViewerContainer>
            {this.props.show3D && this.render3D()}
            {this.props.showPNID && this.renderPNID()}
          </ViewerContainer>
          {asset != null && (
            <AssetDrawer width={assetDrawerWidth} loading asset={asset} />
          )}
        </div>
      </div>
    );
  }
}

AssetViewer.propTypes = {
  assetId: PropTypes.number.isRequired,
  assets: Assets.isRequired,
  show3D: PropTypes.bool.isRequired,
  showPNID: PropTypes.bool.isRequired,
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
