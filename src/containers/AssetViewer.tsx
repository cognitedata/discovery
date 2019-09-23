import React from 'react';
import { connect } from 'react-redux';
import { Dispatch, bindActionCreators } from 'redux';
import { Select } from 'antd';
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
import RelationshipNetworkViewer from './NetworkViewers/RelationshipNetworkViewer';
import {
  setAssetId,
  selectApp,
  AppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetTreeViewerVX from './NetworkViewers/AssetTreeViewerVX';
import AssetTreeViewer from './NetworkViewers/AssetTreeViewer';
import AssetNetworkViewer from './NetworkViewers/AssetNetworkViewer';

export const ViewerTypeMap: { [key: string]: string } = {
  none: 'None',
  threed: '3D',
  pnid: 'P&ID',
  vx: 'VX Network Viewer',
  network: 'Force Network Viewer',
  relationship: 'Relationships',
  oldnetwork: 'Old Network Viewer',
};

export type ViewerType = keyof typeof ViewerTypeMap;

type OwnProps = {
  type: ViewerType;
  onComponentChange: (type: ViewerType) => void;
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
    if (this.props.app.assetId) {
      this.props.doFetchFiles(this.props.app.assetId);
      this.props.doFetchAsset(this.props.app.assetId);
      this.getNodeId(true);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.app.assetId !== this.props.app.assetId &&
      this.props.app.assetId
    ) {
      this.props.doFetchFiles(this.props.app.assetId);
      this.props.doFetchAsset(this.props.app.assetId);
      this.getNodeId(true);
    }
  }

  get asset() {
    const {
      app: { assetId },
    } = this.props;
    const { assets } = this.props;
    if (assetId) {
      return assets.all[assetId];
    }
    return undefined;
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const {
      app: { modelId, revisionId, nodeId, assetId },
    } = this.props;
    if (nodeId) {
      return nodeId;
    }

    if (assetId && fetchIfMissing && modelId && revisionId) {
      this.props.doFetchMappingsFromAssetId(modelId, revisionId, assetId);
    }

    return undefined;
  };

  render3D = () => {
    const {
      nodeId: propNodeId,
      modelId,
      revisionId,
      assetId,
      rootAssetId,
    } = this.props.app;
    const nodeId = propNodeId || this.getNodeId(false);

    if (!modelId || !revisionId) {
      return <p>No 3D Model is mapped to this asset.</p>;
    }
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

  renderAssetNetworkVX = () => {
    return <AssetTreeViewerVX />;
  };

  renderAssetNetwork = () => {
    return <AssetTreeViewer />;
  };

  renderOldAssetNetwork = () => {
    return <AssetNetworkViewer hasResized={false} />;
  };

  renderRelationshipsViewer = () => {
    const { rootAssetId } = this.props.app;
    if (!rootAssetId) {
      return null;
    }
    return (
      <div className="bottom">
        <RelationshipNetworkViewer topShowing={false} />
      </div>
    );
  };

  render() {
    const { type } = this.props;
    switch (type) {
      case 'threed':
        return this.render3D();
      case 'network':
        return this.renderAssetNetwork();
      case 'oldnetwork':
        return this.renderOldAssetNetwork();
      case 'vx':
        return this.renderAssetNetworkVX();
      case 'relationship':
        return this.renderRelationshipsViewer();
      case 'pnid':
        return this.renderPNID();
      case 'none':
      default:
        return (
          <>
            <h3>Select a Component</h3>
            <Select
              style={{ width: '100%' }}
              placeholder="Choose a View"
              onChange={this.props.onComponentChange}
            >
              {Object.keys(ViewerTypeMap).map((viewType: string) => (
                <Select.Option key={viewType} value={viewType}>
                  {`${ViewerTypeMap[viewType]}`}
                </Select.Option>
              ))}
            </Select>
          </>
        );
    }
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
