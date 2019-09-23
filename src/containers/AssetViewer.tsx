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
import AssetBreadcrumbs from './AssetBreadcrumbs';
import Placeholder from '../components/Placeholder';

export const ViewerTypeMap: { [key in ViewerType]: string } = {
  none: 'None',
  threed: '3D',
  pnid: 'P&ID',
  vx: 'VX Network Viewer',
  network: 'Force Network Viewer',
  relationship: 'Relationships',
  oldnetwork: 'Old Network Viewer',
  assetbreadcrumbs: 'Asset Breadcrumbs',
};

export type ViewerType =
  | 'none'
  | 'threed'
  | 'pnid'
  | 'vx'
  | 'network'
  | 'relationship'
  | 'oldnetwork'
  | 'assetbreadcrumbs';

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

    if (!modelId || !revisionId) {
      if (rootAssetId) {
        return (
          <Placeholder
            componentName="3D Viewer"
            text="No 3D Model Mapped to Asset"
          />
        );
      }
      return (
        <Placeholder componentName="3D Viewer" text="No 3D Model Selected" />
      );
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

  renderAssetBreadcrumbs = () => {
    return <AssetBreadcrumbs />;
  };

  renderRelationshipsViewer = () => {
    const { rootAssetId } = this;
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
      case 'assetbreadcrumbs':
        return this.renderAssetBreadcrumbs();
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
                  {`${ViewerTypeMap[viewType as ViewerType]}`}
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
