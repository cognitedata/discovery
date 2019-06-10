import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
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

  state = {};

  componentDidMount() {
    this.props.doFetchFiles(this.props.assetId);
    this.props.doFetchAsset(this.props.assetId);
    this.getNodeId(true);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.assetId !== this.props.assetId) {
      this.props.doFetchFiles(this.props.assetId);
      this.props.doFetchAsset(this.props.assetId);
    }
    this.getNodeId(true);
  }

  getNodeId(fetchIfMissing) {
    const { assetId, assetMappings } = this.props;
    if (assetMappings.byAssetId[assetId]) {
      const mapping = assetMappings.byAssetId[assetId];
      return mapping.nodeId;
    }

    if (fetchIfMissing && this.props.model3D) {
      const { modelId, revisionId } = this.props.model3D;
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, assetId);
    }

    return null;
  }

  getAsset() {
    const { assets, assetId } = this.props;

    return assets.all[assetId];
  }

  render3D() {
    const nodeId = this.getNodeId(false);
    return (
      <Model3D
        modelId={this.props.model3D.modelId}
        revisionId={this.props.model3D.revisionId}
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
    const { assetDrawerWidth } = this.props;

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
  assetDrawerWidth: PropTypes.number.isRequired,
  assetId: PropTypes.number.isRequired,
  assets: Assets.isRequired,
  model3D: PropTypes.shape({
    modelId: PropTypes.number,
    revisionId: PropTypes.number,
  }),
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
  model3D: undefined,
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
