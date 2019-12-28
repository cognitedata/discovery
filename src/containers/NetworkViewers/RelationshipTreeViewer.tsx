import React, { Component } from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Placeholder from 'components/Placeholder';
import { Button } from 'antd';
import RelationshipQueryModal from 'containers/Modals/RelationshipQueryModal';
import styled from 'styled-components';
import {
  AppState,
  selectAppState,
  setAssetId,
  setTimeseriesId,
} from '../../modules/app';
import { RootState } from '../../reducers/index';
import {
  fetchAssets,
  selectAssets,
  AssetsState,
  selectCurrentAsset,
  ExtendedAsset,
} from '../../modules/assets';
import {
  fetchTimeseries,
  selectTimeseries,
  TimeseriesState,
} from '../../modules/timeseries';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import { selectTypesState, TypesState, fetchTypes } from '../../modules/types';

import {
  RelationshipResource,
  Relationship,
  fetchRelationshipsForAssetId,
  RelationshipState,
} from '../../modules/relationships';
import TreeViewer from './TreeViewer';
import { BetaTag } from '../../components/BetaWarning';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  && > div {
    flex: 1;
  }
  && > div.button {
    flex: unset;
    margin-bottom: 12px;
  }
`;

type OwnProps = {};

type StateProps = {
  app: AppState;
  relationships: RelationshipState;
  assets: AssetsState;
  types: TypesState;
  asset: ExtendedAsset | undefined;
  timeseries: TimeseriesState;
  threed: ThreeDState;
};
type DispatchProps = { fetchTypes: typeof fetchTypes };

type Props = StateProps & DispatchProps & OwnProps;

type State = {
  visibleAssetIds: number[];
  query: string[];
  graphQueryVisible: boolean;
};

class RelationshipTreeViewer extends Component<Props, State> {
  readonly state: Readonly<State> = {
    visibleAssetIds: [],
    query: [],
    graphQueryVisible: false,
  };

  componentDidMount() {
    this.props.fetchTypes();
  }

  async componentDidUpdate(prevProps: Props) {
    if (prevProps.app.rootAssetId !== this.props.app.rootAssetId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ visibleAssetIds: [] });
    }
    if (
      prevProps.app.assetId !== this.props.app.assetId &&
      this.props.app.assetId
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ visibleAssetIds: [this.props.app.assetId] });
    }
  }

  get filters(): {
    [key: string]: {
      [key: string]: {
        name: string;
        filterNode?: (node: RelationshipResource) => boolean;
        filterLink?: (link: Relationship) => boolean;
      };
    };
  } {
    const { externalIdMap } = this.props.assets;
    const { items, assetTypes } = this.props.types;
    return {
      Resource: {
        asset: {
          name: 'Asset',
          filterNode: (node: RelationshipResource) => {
            return node.resource === 'asset';
          },
        },
        timeseries: {
          name: 'Timeseries',
          filterNode: (node: RelationshipResource) => {
            return node.resource === 'timeSeries';
          },
        },
        '3d': {
          name: '3D',
          filterNode: (node: RelationshipResource) => {
            return (
              node.resource === 'threeD' || node.resource === 'threeDRevision'
            );
          },
        },
      },
      Relationships: {
        flowsTo: {
          name: 'Flows To',
          filterLink: (link: Relationship) => {
            return link.relationshipType === 'flowsTo';
          },
        },
        belongsTo: {
          name: 'Belongs To',
          filterLink: (link: Relationship) => {
            return link.relationshipType === 'belongsTo';
          },
        },
        isParentOf: {
          name: 'Is Parent Of',
          filterLink: (link: Relationship) => {
            return link.relationshipType === 'isParentOf';
          },
        },
        implements: {
          name: 'Implements',
          filterLink: (link: Relationship) => {
            return link.relationshipType === 'implements';
          },
        },
      },
      Types: Object.keys(items).reduce((prev, el) => {
        const typeSchema = items[Number(el)];
        return {
          ...prev,
          [el]: {
            name: typeSchema ? typeSchema.name : 'Loading...',
            filterNode: (node: RelationshipResource) => {
              const nodeTypes =
                assetTypes[
                  externalIdMap[node.resourceId] || Number(node.resourceId)
                ];
              if (
                nodeTypes &&
                nodeTypes.find(type => type.type.id === Number(el))
              ) {
                return true;
              }
              return false;
            },
          },
        };
      }, {}),
    };
  }

  buildLabel = (node: RelationshipResource): string => {
    const {
      assets: { all, externalIdMap },
      threed: { models },
      timeseries: { timeseriesData },
    } = this.props;
    switch (node.resource) {
      case 'asset': {
        const asset =
          all[externalIdMap[node.resourceId] || Number(node.resourceId)];
        return asset ? asset.name : 'Loading...';
      }
      case 'threeDRevision':
      case 'threeD': {
        const ids = node.resourceId.split(':');
        const model = models[Number(ids[ids.length - 1])];
        if (ids.length === 3) {
          return `Node in ${model ? model.name : 'Loading...'}`;
        }
        return `Linked to ${model ? model.name : 'Loading...'}`;
      }
      case 'timeSeries': {
        const timeseries = timeseriesData[Number(node.resourceId)];
        if (timeseries) {
          return timeseries.name || `${timeseries.id}`;
        }
        return 'Loading...';
      }
    }
    return `${node.resource}:${node.resourceId}`;
  };

  chooseNodeColor = (node: RelationshipResource): string => {
    const { asset } = this.props;
    switch (node.resource) {
      case 'asset': {
        if (
          asset &&
          (node.resourceId === asset.externalId ||
            Number(node.resourceId) === asset.id)
        ) {
          return 'rgba(0,0,0,0.5)';
        }
        return 'rgba(0,0,255,0.5)';
      }
      case 'threeD':
      case 'threeDRevision':
        return 'rgba(0,122,0,0.9)';
      case 'timeSeries':
      default:
        return 'rgba(255,0,0,0.5)';
    }
  };

  chooseRelationshipColor = (relationship: Relationship) => {
    const { asset } = this.props;
    switch (relationship.relationshipType) {
      case 'isParentOf': {
        if (
          asset &&
          (relationship.target.resourceId === asset.externalId ||
            Number(relationship.target.resourceId) === asset.id)
        ) {
          return 'rgba(0,255,255,0.5)';
        }
        return 'rgba(0,0,255,0.9)';
      }
      case 'belongsTo':
        return 'rgba(255,0,0,0.5)';
      case 'flowsTo':
      case 'implements':
      default:
        return 'rgba(0,122,0,0.9)';
    }
  };

  getData = () => {
    const {
      relationships: { items, assetRelationshipMap },
      assets: { externalIdMap, all },
    } = this.props;
    const { visibleAssetIds, query } = this.state;
    const nodes: { [key: string]: any } = {};
    const links: any[] = [];
    const relationshipIds: Set<string> = new Set();
    visibleAssetIds.forEach(id => {
      if (assetRelationshipMap[id]) {
        assetRelationshipMap[id].forEach(relationshipId => {
          if (items[relationshipId]) {
            relationshipIds.add(relationshipId);
          }
        });
      }
    });
    const { filters } = this;
    const nodeFilters = query
      .map(el => {
        const split = el.split('.');
        if (!filters[split[0]] || !filters[split[0]][split[1]]) {
          // String Filter
          return (resource: RelationshipResource) => {
            const node =
              all[
                externalIdMap[resource.resourceId] ||
                  Number(resource.resourceId)
              ];
            if (node) {
              return node.name.toLowerCase().indexOf(el.toLowerCase()) > -1;
            }
            return true;
          };
        }
        return filters[split[0]][split[1]].filterNode;
      })
      .filter(el => !!el) as ((node: RelationshipResource) => boolean)[];
    const linkFilters = query
      .map(el => {
        const split = el.split('.');
        if (!filters[split[0]] || !filters[split[0]][split[1]]) {
          return undefined;
        }
        return filters[split[0]][split[1]].filterLink;
      })
      .filter(el => !!el) as ((link: Relationship) => boolean)[];
    Array.from(relationshipIds)
      .map(id => items[id])
      .forEach((relationship: Relationship) => {
        const sourcePassFilter = nodeFilters.some(filter =>
          filter(relationship.source)
        );
        const targetPassFilter = nodeFilters.some(filter =>
          filter(relationship.target)
        );
        if (
          (nodeFilters.length === 0 ||
            (sourcePassFilter && targetPassFilter) ||
            (sourcePassFilter &&
              visibleAssetIds.includes(
                externalIdMap[relationship.target.resourceId] ||
                  Number(relationship.target.resourceId)
              )) ||
            (targetPassFilter &&
              visibleAssetIds.includes(
                externalIdMap[relationship.source.resourceId] ||
                  Number(relationship.source.resourceId)
              ))) &&
          (linkFilters.length === 0 ||
            linkFilters.some(filter => filter(relationship)))
        ) {
          nodes[relationship.source.resourceId] = {
            ...relationship.source,
            id: relationship.source.resourceId,
            color: this.chooseNodeColor(relationship.source),
          };
          nodes[relationship.target.resourceId] = {
            ...relationship.target,
            id: relationship.target.resourceId,
            color: this.chooseNodeColor(relationship.target),
          };
          if (
            relationship.source.resourceId !== relationship.target.resourceId
          ) {
            links.push({
              ...relationship,
              linkWidth: 3,
              source: relationship.source.resourceId,
              target: relationship.target.resourceId,
            });
          }
        }
      });
    return {
      nodes: Object.values(nodes),
      links,
    };
  };

  render() {
    const { query, visibleAssetIds, graphQueryVisible } = this.state;
    if (!this.props.app.assetId) {
      return <Placeholder componentName="Relationship Viewer" />;
    }
    return (
      <Wrapper>
        <div className="button">
          <Button
            type="primary"
            ghost
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => this.setState({ graphQueryVisible: true })}
          >
            <BetaTag />
            Run Graph Query
          </Button>
        </div>
        <div style={{ position: 'relative', flex: 1, height: 0 }}>
          <TreeViewer
            data={this.getData()}
            dataFilter={{
              query,
              setQuery: (newQuery: string[]) =>
                this.setState({ query: newQuery }),
              filters: this.filters,
            }}
            buildLabel={this.buildLabel}
            chooseNodeColor={this.chooseNodeColor}
            chooseRelationshipColor={this.chooseRelationshipColor}
            assetSelection={{
              visibleAssetIds,
              setVisibleAssetIds: ids =>
                this.setState({ visibleAssetIds: ids }),
            }}
          />
        </div>
        {graphQueryVisible && (
          <RelationshipQueryModal
            onClose={() => this.setState({ graphQueryVisible: false })}
          />
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    relationships: state.relationships,
    app: selectAppState(state),
    assets: selectAssets(state),
    asset: selectCurrentAsset(state),
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
    types: selectTypesState(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      fetchRelationshipsForAssetId,
      setAssetId,
      fetchTypes,
      fetchAssets,
      fetchTimeseries,
      setTimeseriesId,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(RelationshipTreeViewer);
