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
import {
  setAssetId,
  selectApp,
  AppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetTreeViewerVX from './NetworkViewers/AssetTreeViewerVX';
import AssetTreeViewer from './NetworkViewers/AssetTreeViewer';
import AssetNetworkViewer from './NetworkViewers/AssetNetworkViewer';
import Placeholder from '../components/Placeholder';
import AssetBreadcrumbs from './AssetBreadcrumbs';
import RelationshipTreeViewer from './NetworkViewers/RelationshipTreeViewer';

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

  renderOldAssetNetwork = () => {
    return <AssetNetworkViewer hasResized={false} />;
  };

  renderAssetBreadcrumbs = () => {
    return <AssetBreadcrumbs />;
  };

  renderRelationshipsViewer = () => {
    return <RelationshipTreeViewer topShowing={false} />;
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
