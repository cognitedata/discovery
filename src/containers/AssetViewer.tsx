import React from 'react';
import { connect } from 'react-redux';
import { Dispatch, bindActionCreators } from 'redux';
import { BetaTag } from 'components/BetaWarning';
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
  selectAppState,
  AppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetTreeViewerVX from './NetworkViewers/AssetTreeViewerVX';
import AssetTreeViewer from './NetworkViewers/AssetTreeViewer';
import RelationshipTreeViewer from './NetworkViewers/RelationshipTreeViewer';
import FileExplorer from './FileExplorer';
import { trackUsage } from '../utils/metrics';
import ComponentSelector from '../components/ComponentSelector';
import ThreeDViewerComponent from './ThreeDViewerComponent';

export const ViewerTypeMap: { [key in ViewerType]: React.ReactNode } = {
  none: 'None',
  threed: '3D',
  vx: 'VX Network Viewer',
  network: 'Force Network Viewer',
  relationship: (
    <span>
      <BetaTag />
      Relationships
    </span>
  ),
  file: 'File Viewer',
};

export type ViewerType =
  | 'none'
  | 'file'
  | 'threed'
  | 'vx'
  | 'network'
  | 'relationship';

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

  readonly state: Readonly<State> = {};

  componentDidMount() {
    if (this.props.app.assetId) {
      this.props.doFetchFiles(this.props.app.assetId);
      this.props.doFetchAsset(this.props.app.assetId);
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

  render3D = () => {
    return <ThreeDViewerComponent />;
  };

  renderAssetNetworkVX = () => {
    return (
      <AssetTreeViewerVX asset={this.asset!} onAssetClicked={console.log} />
    );
  };

  renderAssetNetwork = () => {
    return <AssetTreeViewer />;
  };

  renderRelationshipsViewer = () => {
    return <RelationshipTreeViewer />;
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
    app: selectAppState(state),
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
