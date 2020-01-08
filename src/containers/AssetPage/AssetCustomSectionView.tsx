import React from 'react';
import { connect } from 'react-redux';
import { Dispatch, bindActionCreators } from 'redux';
import { BetaTag } from 'components/BetaWarning';
import { message } from 'antd';
import qs from 'query-string';
import { push } from 'connected-react-router';
import ThreeDViewerComponent from 'containers/ThreeDViewerComponent';
import { selectAssets, AssetsState, ExtendedAsset } from '../../modules/assets';
import {
  selectAssetMappings,
  AssetMappingState,
} from '../../modules/assetmappings';
import { RootState } from '../../reducers/index';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import AssetTreeViewerVX from '../NetworkViewers/AssetTreeViewerVX';
import { trackUsage } from '../../utils/metrics';
import ComponentSelector from '../../components/ComponentSelector';
import { AssetTabKeys } from './AssetPage';
import AssetRelationshipSection from './AssetRelationshipSection';
import AssetTimeseriesSection from './AssetTimeseriesSection';
import AssetFilesSection from './AssetFilesSection';
import AssetEventsSection from './AssetEventsSection';

export const AssetViewerTypeMap: {
  [key in AssetViewerType]: React.ReactNode | undefined;
} = {
  none: 'None',
  threed: '3D',
  hierarchy: 'Asset Hierarchy',
  relationships: (
    <span>
      <BetaTag />
      Relationships
    </span>
  ),
  files: 'File Viewer',
  pnid: 'P&ID',
  timeseries: 'Timeseries',
  events: 'Events',
  custom: undefined,
};

export type AssetViewerType = 'none' | AssetTabKeys;

type OwnProps = {
  type: AssetViewerType;
  asset: ExtendedAsset;
  search: string | undefined;
  onViewDetails: (type: string, ...ids: number[]) => void;
  onComponentChange: (type: AssetViewerType) => void;
};
type StateProps = {
  threed: ThreeDState;
  assets: AssetsState;
  assetMappings: AssetMappingState;
};
type DispatchProps = {
  push: typeof push;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = {};

export class AssetCustomSectionView extends React.Component<Props, State> {
  static defaultProps = {
    assetMappings: { byNodeId: {}, byAssetId: {} },
    model3D: undefined,
  };

  readonly state: Readonly<State> = {};

  componentDidMount() {
    trackUsage('AssetCustomSectionView.ComponentMounted', {
      type: this.props.type,
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.type !== this.props.type) {
      trackUsage('AssetCustomSectionView.ComponentMounted', {
        type: this.props.type,
      });
    }
  }

  get fileId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).fileId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  get timeseriesId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).timeseriesId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  get modelId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).modelId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  get eventId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).eventId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  get revisionId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).revisionId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  get nodeId() {
    if (this.props.search) {
      const id = qs.parse(this.props.search).nodeId;
      if (id) {
        return Number(id);
      }
    }
    return undefined;
  }

  onClearSelection = () => {
    this.props.push({
      search: qs.stringify({}),
    });
  };

  onSelect = (
    type: 'asset' | 'timeseries' | 'file' | 'threed' | 'event',
    ...ids: number[]
  ) => {
    const search = this.props.search ? qs.parse(this.props.search) : {};
    switch (type) {
      case 'asset': {
        this.props.push({
          search: qs.stringify({ ...search, assetId: ids[0] }),
        });
        break;
      }
      case 'file': {
        this.props.push({
          search: qs.stringify({ ...search, fileId: ids[0] }),
        });
        break;
      }
      case 'timeseries': {
        this.props.push({
          search: qs.stringify({ ...search, timeseriesId: ids[0] }),
        });
        break;
      }
      case 'event': {
        this.props.push({
          search: qs.stringify({ ...search, eventId: ids[0] }),
        });
        break;
      }
      case 'threed': {
        this.props.push({
          search: qs.stringify({
            ...search,
            modelId: ids[0],
            revisionId: ids[1],
            nodeId: ids[2],
          }),
        });
        break;
      }
    }
  };

  renderView = (tabKey: AssetTabKeys) => {
    switch (tabKey) {
      case 'relationships': {
        return (
          <AssetRelationshipSection
            asset={this.props.asset}
            onAssetClicked={id => this.props.onViewDetails('asset', id)}
          />
        );
      }
      case 'hierarchy': {
        return (
          <AssetTreeViewerVX
            asset={this.props.asset}
            onAssetClicked={id => this.props.onViewDetails('asset', id)}
          />
        );
      }
      case 'timeseries': {
        return (
          <AssetTimeseriesSection
            asset={this.props.asset}
            timeseriesId={this.timeseriesId}
            onSelect={id => this.onSelect('timeseries', id)}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.props.onViewDetails}
          />
        );
      }
      case 'files': {
        return (
          <AssetFilesSection
            asset={this.props.asset}
            fileId={this.fileId}
            onSelect={id => this.onSelect('file', id)}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.props.onViewDetails}
          />
        );
      }
      case 'pnid': {
        return (
          <AssetFilesSection
            asset={this.props.asset}
            mimeTypes={['svg', 'SVG']}
            fileId={this.fileId}
            onSelect={id => this.onSelect('file', id)}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.props.onViewDetails}
          />
        );
      }
      case 'events': {
        return (
          <AssetEventsSection
            asset={this.props.asset}
            eventId={this.eventId}
            onSelect={id => this.onSelect('event', id)}
            onClearSelection={this.onClearSelection}
            onViewDetails={this.props.onViewDetails}
          />
        );
      }
      case 'threed': {
        return (
          <ThreeDViewerComponent
            asset={this.props.asset}
            modelId={this.modelId}
            revisionId={this.revisionId}
            nodeId={this.nodeId}
            onAssetClicked={assetId =>
              message.success(`Coming soon ${assetId}`)
            }
            onRevisionClicked={(modelId, revisionId) =>
              this.onSelect('threed', modelId, revisionId)
            }
            onNodeClicked={(modelId, revisionId, nodeId) =>
              this.onSelect('threed', modelId, revisionId, nodeId)
            }
            onClearSelection={this.onClearSelection}
            onViewDetails={this.props.onViewDetails}
          />
        );
      }
    }
    return <h1>Unable to load component.</h1>;
  };

  render() {
    const { type } = this.props;
    switch (type) {
      case 'none':
        return (
          <ComponentSelector onComponentChange={this.props.onComponentChange} />
        );
      default:
        return this.renderView(type);
    }
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
  bindActionCreators({ push }, dispatch);

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { forwardRef: true }
)(AssetCustomSectionView);
