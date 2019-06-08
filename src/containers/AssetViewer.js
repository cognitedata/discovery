import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import mixpanel from 'mixpanel-browser';
import styled from 'styled-components';
import Model3D from '../components/Model3D';
import PNIDViewer from '../components/PNIDViewer';
import { fetchAsset, selectAssets, Assets } from '../modules/assets';
import { fetchFiles } from '../modules/files';
import AssetDrawer from './AssetDrawer';
import {
  fetchMappingsFromAssetId,
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
    this.props.doFetchFiles(this.props.assetId);
    this.loadAssetIfMissing();
    this.getNodeId(true);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.assetId !== this.props.assetId) {
      this.props.doFetchFiles(this.props.assetId);
    }
    this.loadAssetIfMissing();
    this.getNodeId(true);
  }

  getNodeId(fetchIfMissing) {
    const { assetId, assetMappings } = this.props;
    if (assetMappings.byAssetId[assetId]) {
      const mapping = assetMappings.byAssetId[assetId];
      return mapping.nodeId;
    }

    if (fetchIfMissing) {
      const { modelId, revisionId } = this.state;
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, assetId);
    }

    return null;
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

  loadAssetIfMissing() {
    const asset = this.getAsset();
    if (!asset) {
      this.props.doFetchAsset(this.props.assetId);
    }
  }

  render3D() {
    const nodeId = this.getNodeId(false);
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
  doFetchFiles: PropTypes.func.isRequired,
  doFetchMappingsFromAssetId: PropTypes.func.isRequired,
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
  doFetchFiles: (...args) => dispatch(fetchFiles(...args)),
  doFetchMappingsFromAssetId: (...args) =>
    dispatch(fetchMappingsFromAssetId(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
