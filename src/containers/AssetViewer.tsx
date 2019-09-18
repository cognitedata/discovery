import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Dispatch, bindActionCreators } from 'redux';
import Model3D from '../components/Model3D';
import PNIDViewer from './PNIDViewer';
import { fetchAsset, selectAssets, AssetsState } from '../modules/assets';
import { fetchFiles } from '../modules/files';
import {
  fetchMappingsFromAssetId,
  selectAssetMappings,
  AssetMappingState,
} from '../modules/assetmappings';
import { RootState } from '../reducers/index';
import { selectThreeD, ThreeDState } from '../modules/threed';
import RelationshipNetworkViewer from './RelationshipNetworkViewer';
import {
  setAssetId,
  selectApp,
  AppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import TreeViewer from './AssetTreeViewer';

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
    height: 0;
    flex: 1;
    width: 100%;
  }
`;

type OwnProps = {
  show3D: boolean;
  showPNID: boolean;
  showAssetViewer: boolean;
  showRelationships: boolean;
};
type StateProps = {
  app: AppState;
  threed: ThreeDState;
  assets: AssetsState;
  assetMappings: AssetMappingState;
};
type DispatchProps = {
  doFetchAsset: typeof fetchAsset;
  doFetchFiles: typeof fetchFiles;
  doFetchMappingsFromAssetId: typeof fetchMappingsFromAssetId;
  setAssetId: typeof setAssetId;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
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
    if (prevProps.app.assetId !== this.assetId && this.assetId) {
      this.props.doFetchFiles(this.assetId);
      this.props.doFetchAsset(this.assetId);
      this.getNodeId(true);
    }
  }

  get assetId() {
    return this.props.app.assetId || this.props.app.rootAssetId;
  }

  get rootAssetId() {
    return this.props.app.rootAssetId;
  }

  get asset() {
    const { assets } = this.props;
    if (this.assetId) {
      return assets.all[this.assetId];
    }
    return undefined;
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const {
      app: { modelId, revisionId, nodeId },
    } = this.props;
    if (nodeId) {
      return nodeId;
    }

    if (this.assetId && fetchIfMissing && modelId && revisionId) {
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, this.assetId);
    }

    return undefined;
  };

  render3D = () => {
    const { rootAssetId, assetId } = this;
    const { nodeId: propNodeId, modelId, revisionId } = this.props.app;
    const nodeId = propNodeId || this.getNodeId(false);
    return (
      <Model3D
        assetId={assetId!}
        modelId={modelId!}
        revisionId={revisionId!}
        nodeId={nodeId}
        onAssetIdChange={(id: number) =>
          this.props.setAssetId(rootAssetId!, id)
        }
        onNodeIdChange={(id: number) =>
          this.props.setModelAndRevisionAndNode(modelId!, revisionId!, id)
        }
        cache={this.cache}
      />
    );
  };

  renderPNID = () => {
    return <PNIDViewer />;
  };

  renderAssetNetwork = () => {
    const { rootAssetId } = this;
    if (!rootAssetId) {
      return null;
    }
    return (
      <div className="bottom">
        <TreeViewer topShowing={this.props.show3D || this.props.showPNID} />
      </div>
    );
  };

  renderRelationshipsViewer = () => {
    const { rootAssetId } = this;
    if (!rootAssetId) {
      return null;
    }
    return (
      <div className="bottom">
        <RelationshipNetworkViewer
          topShowing={this.props.show3D || this.props.showPNID}
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
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
    assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      setAssetId,
      setModelAndRevisionAndNode,
      doFetchAsset: fetchAsset,
      doFetchFiles: fetchFiles,
      doFetchMappingsFromAssetId: fetchMappingsFromAssetId,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { forwardRef: true }
)(AssetViewer);
