import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Dispatch, bindActionCreators } from 'redux';
import Model3D from '../components/Model3D';
import PNIDViewer from './PNIDViewer';
import { fetchAsset, selectAssets, AssetsState } from '../modules/assets';
import { fetchFiles } from '../modules/files';
import AssetDrawer from './AssetDrawer';
import AssetNetworkViewer from './AssetNetworkViewer';
import {
  fetchMappingsFromAssetId,
  selectAssetMappings,
  AssetMappingState,
} from '../modules/assetmappings';
import { RootState } from '../reducers/index';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  && .split {
    display: flex;
    flex-direction: row;
    width: 100%;
    flex: 2;
  }
  && .bottom {
    flex: 1;
    width: 100%;
  }
`;

type OwnProps = {
  assetDrawerWidth: number;
  assetId?: number;
  rootAssetId: number;
  model3D?: {
    modelId: number;
    revisionId: number;
  };
  show3D: boolean;
  showPNID: boolean;
  showAssetViewer: boolean;
  onAssetIdChange: (rootAssetId?: number, assetId?: number) => void;
};
type StateProps = {
  assets: AssetsState;
  assetMappings: AssetMappingState;
};
type DispatchProps = {
  doFetchAsset: typeof fetchAsset;
  doFetchFiles: typeof fetchFiles;
  doFetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = { documentId?: number };

export class AssetViewer extends React.Component<Props, State> {
  static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    model3D: undefined,
  };

  cache = {};

  readonly state: Readonly<State> = {};

  componentDidMount() {
    if (this.assetId) {
      this.props.doFetchFiles(this.assetId);
      this.props.doFetchAsset(this.assetId);
      this.getNodeId(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.assetId !== this.assetId && this.assetId) {
      this.props.doFetchFiles(this.assetId);
      this.props.doFetchAsset(this.assetId);
    }
    this.getNodeId(true);
  }

  get assetId() {
    return this.props.assetId || this.props.rootAssetId;
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const { assetMappings } = this.props;
    if (assetMappings.byAssetId[this.assetId]) {
      const mapping = assetMappings.byAssetId[this.assetId];
      return mapping.nodeId;
    }

    if (fetchIfMissing && this.props.model3D) {
      const { modelId, revisionId } = this.props.model3D;
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, this.assetId);
    }

    return null;
  };

  getAsset = () => {
    const { assets } = this.props;

    return assets.all[this.assetId];
  };

  render3D = () => {
    const { rootAssetId } = this.props;
    const nodeId = this.getNodeId(false);
    return (
      <Model3D
        modelId={this.props.model3D!.modelId}
        revisionId={this.props.model3D!.revisionId}
        nodeId={nodeId}
        onAssetIdChange={(id: number) =>
          this.props.onAssetIdChange(rootAssetId, id)
        }
        cache={this.cache}
      />
    );
  };

  renderPNID = () => {
    const { rootAssetId } = this.props;
    const asset = this.getAsset();
    return (
      <PNIDViewer
        asset={asset}
        onAssetIdChange={(id: number) =>
          this.props.onAssetIdChange(rootAssetId, id)
        }
      />
    );
  };

  renderAssetNetwork = () => {
    const { rootAssetId } = this.props;
    return (
      <div className="bottom">
        <AssetNetworkViewer
          rootAssetId={rootAssetId}
          asset={this.getAsset()}
          topShowing={this.props.show3D || this.props.showPNID}
          onAssetIdChange={(id: number) =>
            this.props.onAssetIdChange(rootAssetId, id)
          }
        />
      </div>
    );
  };

  render() {
    const asset = this.getAsset();
    const { assetDrawerWidth } = this.props;
    const { rootAssetId } = this.props;

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <div style={{ height: '100%', paddingRight: assetDrawerWidth }}>
          <ViewerContainer>
            {(this.props.show3D || this.props.showPNID) && (
              <div className="split">
                {this.props.show3D && this.render3D()}
                {this.props.showPNID && this.renderPNID()}
              </div>
            )}
            {this.props.showAssetViewer && this.renderAssetNetwork()}
          </ViewerContainer>
          {asset != null && (
            <AssetDrawer
              width={assetDrawerWidth}
              asset={asset}
              onAssetIdChange={(id?: number) =>
                this.props.onAssetIdChange(rootAssetId, id)
              }
            />
          )}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    assets: selectAssets(state),
    assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      doFetchAsset: fetchAsset,
      doFetchFiles: fetchFiles,
      doFetchMappingsFromAssetId: fetchMappingsFromAssetId,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
