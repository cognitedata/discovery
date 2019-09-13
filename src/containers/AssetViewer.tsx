import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Dispatch, bindActionCreators } from 'redux';
import Model3D from '../components/Model3D';
import PNIDViewer from './PNIDViewer';
import { fetchAsset, selectAssets, AssetsState } from '../modules/assets';
import { fetchFiles } from '../modules/files';
import AssetNetworkViewer from './AssetNetworkViewer';
import {
  fetchMappingsFromAssetId,
  selectAssetMappings,
  AssetMappingState,
} from '../modules/assetmappings';
import { RootState } from '../reducers/index';
import { selectThreeD, ThreeDState } from '../modules/threed';
import RelationshipNetworkViewer from './RelationshipNetworkViewer';

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
  modelId?: number;
  revisionId?: number;
  nodeId?: number;
  rootAssetId: number;
  show3D: boolean;
  showPNID: boolean;
  showAssetViewer: boolean;
  showRelationships: boolean;
  onAssetIdChange: (rootAssetId?: number, assetId?: number) => void;
  onNodeIdChange: (nodeId?: number) => void;
};
type StateProps = {
  threed: ThreeDState;
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

  get rootAssetId() {
    if (this.props.rootAssetId) {
      return this.props.rootAssetId;
    }
    const { modelId, revisionId } = this.props;
    const { representsAsset } = this.props.threed;
    return Number(
      Object.keys(representsAsset).find(
        assetId =>
          representsAsset[Number(assetId)].modelId === modelId &&
          representsAsset[Number(assetId)].revisionId === revisionId
      )
    );
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const { assetMappings } = this.props;
    if (assetMappings.byAssetId[this.assetId]) {
      const mapping = assetMappings.byAssetId[this.assetId];
      return mapping.nodeId;
    }

    if (fetchIfMissing && this.props.modelId && this.props.revisionId) {
      const { modelId, revisionId } = this.props;
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, this.assetId);
    }

    return null;
  };

  getAsset = () => {
    const { assets } = this.props;

    return assets.all[this.assetId];
  };

  render3D = () => {
    const { rootAssetId, assetId } = this;
    const { nodeId: propNodeId } = this.props;
    const nodeId = propNodeId || this.getNodeId(false);
    return (
      <Model3D
        assetId={assetId}
        modelId={this.props.modelId!}
        revisionId={this.props.revisionId!}
        nodeId={nodeId}
        onAssetIdChange={(id: number) =>
          this.props.onAssetIdChange(rootAssetId, id)
        }
        onNodeIdChange={(id: number) => this.props.onNodeIdChange(id)}
        cache={this.cache}
      />
    );
  };

  renderPNID = () => {
    const { rootAssetId } = this;
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
    const { rootAssetId } = this;
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

  renderRelationshipsViewer = () => {
    const { rootAssetId } = this;
    return (
      <div className="bottom">
        <RelationshipNetworkViewer
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
    return (
      <div
        className="main-layout"
        style={{ width: '100%', height: 0, flex: 1 }}
      >
        <div style={{ height: '100%' }}>
          <ViewerContainer>
            {(this.props.show3D || this.props.showPNID) && (
              <div className="split">
                {this.props.show3D && this.render3D()}
                {this.props.showPNID && this.renderPNID()}
              </div>
            )}
            {this.props.showRelationships && this.renderRelationshipsViewer()}
            {!this.props.showRelationships &&
              this.props.showAssetViewer &&
              this.renderAssetNetwork()}
          </ViewerContainer>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    threed: selectThreeD(state),
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
