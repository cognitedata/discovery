import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import Model3D from '../components/Model3D';
import PNIDViewer from '../components/PNIDViewer';
import { fetchAsset, selectAssets, AssetsState } from '../modules/assets';
import { fetchFiles } from '../modules/files';
import AssetDrawer from './AssetDrawer';
import { fetchMappingsFromAssetId, selectAssetMappings, AssetMappingState } from '../modules/assetmappings';
import { Dispatch, bindActionCreators } from 'redux';
import { RootState } from '../reducers/index';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
`;

type Props = {
  assetDrawerWidth: number;
  assetId: number;
  assets: AssetsState;
  model3D: {
    modelId: number;
    revisionId: number;
  };
  show3D: boolean;
  showPNID: boolean;
  onAssetIdChange: Function;
  doFetchAsset: Function;
  doFetchFiles: Function;
  doFetchMappingsFromAssetId: Function;
  assetMappings: AssetMappingState;
};

type State = { documentId?: number };

export class AssetViewer extends React.Component<Props, State> {
  static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    model3D: undefined
  };

  cache = {};
  readonly state: Readonly<State> = {};

  componentDidMount() {
    this.props.doFetchFiles(this.props.assetId);
    this.props.doFetchAsset(this.props.assetId);
    this.getNodeId(true);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.assetId !== this.props.assetId) {
      this.props.doFetchFiles(this.props.assetId);
      this.props.doFetchAsset(this.props.assetId);
    }
    this.getNodeId(true);
  }

  getNodeId = (fetchIfMissing: boolean) => {
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
  };

  getAsset = () => {
    const { assets, assetId } = this.props;

    return assets.all[assetId];
  };

  render3D = () => {
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
  };

  renderPNID = () => {
    const asset = this.getAsset();
    return <PNIDViewer asset={asset} onAssetIdChange={this.props.onAssetIdChange} />;
  };

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
          {asset != null && <AssetDrawer width={assetDrawerWidth} asset={asset} />}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    assets: selectAssets(state),
    assetMappings: selectAssetMappings(state)
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchAsset: fetchAsset,
      doFetchFiles: fetchFiles,
      doFetchMappingsFromAssetId: fetchMappingsFromAssetId
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
