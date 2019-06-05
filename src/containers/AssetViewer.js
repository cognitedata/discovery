import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { AssetMeta } from '@cognite/gearbox';
import { selectAssets, Assets } from '../modules/assets';
import {
  getMappingsFromAssetId,
  selectAssetMappings,
  AssetMappings,
} from '../modules/assetmappings';

class AssetViewer extends React.Component {
  componentDidMount() {
    this.getAssetMappingForAssetId();
  }

  getAssetMappingForAssetId() {
    const modelId = 2495544803289093;
    const revisionId = 3041181389296996;

    const { assetId, doGetMappingsFromAssetId } = this.props;
    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];

    console.log('Got asset mappings: ', assetMappings);
    if (assetMappings.length === 0) {
      doGetMappingsFromAssetId(modelId, revisionId, assetId);
    }
  }

  render() {
    const { assetId } = this.props;

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        {this.props.view === 'metadata' && <AssetMeta assetId={assetId} />}
      </div>
    );
  }
}

AssetViewer.propTypes = {
  assetId: PropTypes.number.isRequired,
  view: PropTypes.string.isRequired,
  assetMappings: AssetMappings,
  doGetMappingsFromAssetId: PropTypes.func.isRequired,
};

AssetViewer.defaultProps = {
  assetMappings: [],
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
