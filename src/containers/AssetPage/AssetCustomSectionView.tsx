import React from 'react';
import { connect } from 'react-redux';
import { Dispatch, bindActionCreators } from 'redux';
import { BetaTag } from 'components/BetaWarning';
import { message } from 'antd';
import qs from 'query-string';
import { push } from 'connected-react-router';
import LoadingWrapper from 'components/LoadingWrapper';
import { selectAssets, AssetsState, ExtendedAsset } from '../../modules/assets';
import {
  selectAssetMappings,
  AssetMappingState,
  addAssetMappingsToState,
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
import AssetThreeDSection from './AssetThreeDSection';
import { sdk } from '../../index';

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
  asset?: ExtendedAsset;
  search: string | undefined;
  onNavigateToPage: (type: string, ...ids: number[]) => void;
  onComponentChange: (type: AssetViewerType) => void;
};
type StateProps = {
  threed: ThreeDState;
  assets: AssetsState;
  assetMappings: AssetMappingState;
};
type DispatchProps = {
  push: typeof push;
  addAssetMappingsToState: typeof addAssetMappingsToState;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = {};

export class AssetCustomSectionView extends React.Component<Props, State> {
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

  onClearSelection = (
    type: 'asset' | 'timeseries' | 'file' | 'threed' | 'event'
  ) => {
    const prevSearch = this.props.search ? qs.parse(this.props.search) : {};
    switch (type) {
      case 'asset': {
        delete prevSearch.assetId;
        break;
      }
      case 'file': {
        delete prevSearch.fileId;
        break;
      }
      case 'timeseries': {
        delete prevSearch.timeseriesId;
        break;
      }
      case 'event': {
        delete prevSearch.eventId;
        break;
      }
      case 'threed': {
        delete prevSearch.modelId;
        delete prevSearch.revisionId;
        delete prevSearch.nodeId;
        break;
      }
    }
    this.props.push({
      search: qs.stringify(prevSearch),
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

  onNavigateToPage = async (type: string, ...ids: number[]) => {
    if (type === 'asset') {
      const search = this.props.search ? qs.parse(this.props.search) : {};
      if (search.modelId && search.revisionId && ids[0]) {
        let mapping = this.props.assetMappings.byAssetId[Number(ids[0])];
        if (!mapping) {
          ({
            items: [mapping],
          } = await sdk.assetMappings3D.list(
            Number(search.modelId),
            Number(search.revisionId),
            {
              assetId: Number(ids[0]),
            }
          ));
          this.props.addAssetMappingsToState(
            mapping.modelId,
            mapping.revisionId,
            mapping.nodeId,
            mapping.assetId
          );
        }
        this.onSelect(
          'threed',
          Number(search.modelId),
          Number(search.revisionId),
          mapping.nodeId
        );
      }
    }
    this.props.onNavigateToPage(type, ...ids);
  };

  renderView = (tabKey: AssetTabKeys) => {
    switch (tabKey) {
      case 'relationships': {
        if (!this.props.asset) {
          return (
            <LoadingWrapper>
              <span>Loading Asset...</span>
            </LoadingWrapper>
          );
        }
        return (
          <AssetRelationshipSection
            asset={this.props.asset}
            onAssetClicked={id => this.onNavigateToPage('asset', id)}
          />
        );
      }
      case 'hierarchy': {
        if (!this.props.asset) {
          return (
            <LoadingWrapper>
              <span>Loading Asset...</span>
            </LoadingWrapper>
          );
        }
        return (
          <AssetTreeViewerVX
            asset={this.props.asset}
            onAssetClicked={id => this.onNavigateToPage('asset', id)}
          />
        );
      }
      case 'timeseries': {
        return (
          <AssetTimeseriesSection
            asset={this.props.asset}
            timeseriesId={this.timeseriesId}
            onSelect={id => this.onSelect('timeseries', id)}
            onClearSelection={() => this.onClearSelection('timeseries')}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'files': {
        return (
          <AssetFilesSection
            asset={this.props.asset}
            fileId={this.fileId}
            onSelect={id => this.onSelect('file', id)}
            onClearSelection={() => this.onClearSelection('file')}
            onNavigateToPage={this.onNavigateToPage}
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
            onClearSelection={() => this.onClearSelection('file')}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'events': {
        return (
          <AssetEventsSection
            asset={this.props.asset}
            eventId={this.eventId}
            onSelect={id => this.onSelect('event', id)}
            onClearSelection={() => this.onClearSelection('event')}
            onNavigateToPage={this.onNavigateToPage}
          />
        );
      }
      case 'threed': {
        return (
          <AssetThreeDSection
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
            onClearSelection={() => this.onClearSelection('threed')}
            onNavigateToPage={this.onNavigateToPage}
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
  bindActionCreators({ push, addAssetMappingsToState }, dispatch);

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { forwardRef: true }
)(AssetCustomSectionView);
