import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { AssetMeta, Model3DViewer } from '@cognite/gearbox';
import mixpanel from 'mixpanel-browser';
import { selectAssets, Assets } from '../modules/assets';
import AssetDrawer from './AssetDrawer';

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

    if (prevProps.assetMappings !== this.props.assetMappings) {
      this.updateNodeIdFromMappings();
    }
  }

  getAsset() {
    const { assets, assetId } = this.props;
    let asset;
    if (assets.items) {
      const filteredAssets = assets.items.filter(a => a.id === assetId);
      if (filteredAssets.length > 0) {
        [asset] = filteredAssets;
      }
    }
    return asset;
  }

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

    const { nodeId } = this.state;

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        {this.props.view === '3d' && (
          <div style={{ height: '100%', paddingRight: 400 }}>
            <Model3DViewer
              modelId={this.state.modelId}
              revisionId={this.state.revisionId}
              nodeId={nodeId}
              // onClick={this.onClick}
              // onReady={this.onViewerReady}
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
