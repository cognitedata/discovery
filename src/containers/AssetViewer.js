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
  state = {
    nodeId: undefined,
  };

  componentDidMount() {
    this.getAssetMappingsForAssetId();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.assetId !== this.props.assetId) {
      console.log('Got new asset id: ', this.props.assetId);
      this.getAssetMappingsForAssetId();
    }

    if (prevState.nodeId !== this.state.nodeId) {
      console.log('Got new nodeId: ', this.state.nodeId);
    }

    if (prevProps.assetMappings !== this.props.assetMappings) {
      this.updateNodeIdFromMappings();
    }
  }

  getAssetMappingsForAssetId() {
    const modelId = 2495544803289093;
    const revisionId = 3041181389296996;

    const { assetId, doGetMappingsFromAssetId } = this.props;
    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];
    const nodeId = this.updateNodeIdFromMappings();

    if (nodeId == null || assetMappings.length === 0) {
      doGetMappingsFromAssetId(modelId, revisionId, assetId);
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
    console.log('Got node id: ', nodeId);
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState({ nodeId });
    return nodeId;
  }

  render() {
    const { assetId } = this.props;

    const assetMappings = this.props.assetMappings.items
      ? this.props.assetMappings.items
      : [];

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        {this.props.view === '3d' && <AssetMeta assetId={assetId} />}
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
