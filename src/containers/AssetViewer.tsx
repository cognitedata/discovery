import React from 'react';
import { connect } from 'react-redux';
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
import {
  setAssetId,
  selectApp,
  AppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetTreeViewerVX from './NetworkViewers/AssetTreeViewerVX';
import AssetTreeViewer from './NetworkViewers/AssetTreeViewer';
import Placeholder from '../components/Placeholder';
import AssetBreadcrumbs from './AssetBreadcrumbs';
import RelationshipTreeViewer from './NetworkViewers/RelationshipTreeViewer';
import FileExplorer from './FileExplorer';
import { trackUsage } from '../utils/metrics';
import ComponentSelector from '../components/ComponentSelector';

export const ViewerTypeMap: { [key in ViewerType]: string } = {
  none: 'None',
  threed: '3D',
  pnid: 'P&ID',
  vx: 'VX Network Viewer',
  network: 'Force Network Viewer',
  relationship: 'Relationships',
  file: 'File Viewer',
  assetbreadcrumbs: 'Asset Breadcrumbs',
};

export type ViewerType =
  | 'none'
  | 'file'
  | 'threed'
  | 'pnid'
  | 'vx'
  | 'network'
  | 'relationship'
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
    if (this.props.app.assetId) {
      this.props.doFetchFiles(this.props.app.assetId);
      this.props.doFetchAsset(this.props.app.assetId);
      this.getNodeId(true);
    }
    trackUsage('AssetViewer.ComponentMounted', { type: this.props.type });
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
    if (prevProps.type !== this.props.type) {
      trackUsage('AssetViewer.ComponentMounted', { type: this.props.type });
    }
  }

  get asset() {
    const { assetId } = this.props.app;
    const { assets } = this.props;
    if (assetId) {
      return assets.all[assetId];
    }
    return undefined;
  }

  getNodeId = (fetchIfMissing: boolean) => {
    const { modelId, revisionId, nodeId, assetId } = this.props.app;
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

  renderAssetBreadcrumbs = () => {
    return <AssetBreadcrumbs />;
  };

  renderRelationshipsViewer = () => {
    return <RelationshipTreeViewer topShowing={false} />;
  };

  renderFileExplorer = () => {
    return <FileExplorer />;
  };

  render() {
    const { type } = this.props;
    switch (type) {
      case 'threed':
        return this.render3D();
      case 'network':
        return this.renderAssetNetwork();
      case 'vx':
        return this.renderAssetNetworkVX();
      case 'relationship':
        return this.renderRelationshipsViewer();
      case 'assetbreadcrumbs':
        return this.renderAssetBreadcrumbs();
      case 'pnid':
        return this.renderPNID();
      case 'file':
        return this.renderFileExplorer();
      case 'none':
      default: {
        return (
          <ComponentSelector onComponentChange={this.props.onComponentChange} />
        );
      }
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
