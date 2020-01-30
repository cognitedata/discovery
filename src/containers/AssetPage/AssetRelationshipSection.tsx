import React, { Component } from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Button, message, notification, Descriptions } from 'antd';
import styled from 'styled-components';
import BottomRightCard from 'components/BottomRightCard';
import { push } from 'connected-react-router';
import { RootState } from '../../reducers/index';
import { AssetsState, ExtendedAsset } from '../../modules/assets';
import { TimeseriesState } from '../../modules/timeseries';
import { ThreeDState } from '../../modules/threed';
import { TypesState } from '../../modules/types';


import {
  RelationshipResource,
  Relationship,
  RelationshipState,
  fetchRelationshipsForAssetId,
} from '../../modules/relationships';
import TreeViewer from '../NetworkViewers/TreeViewer';
import { trackUsage } from '../../utils/Metrics';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  position: relative;
  flex-direction: column;
`;

type OwnProps = {
  asset: ExtendedAsset;
  onAssetClicked: (id: number) => void;
};

type StateProps = {
  relationships: RelationshipState;
  assets: AssetsState;
  types: TypesState;
  timeseries: TimeseriesState;
  threed: ThreeDState;
};
type DispatchProps = {
  push: typeof push;
  fetchRelationshipsForAssetId: typeof fetchRelationshipsForAssetId;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = {
  visibleNodeIds: Set<number>;
  query: string[];
  nodeDetailsPreview?: {
    title: string;
    type: 'asset' | 'file' | 'timeseries' | 'threed';
    description: string;
    id: number;
  };
};

class AssetRelationshipSection extends Component<Props, State> {
  readonly state: Readonly<State> = {
    visibleNodeIds: new Set(),
    query: [],
  };

  componentDidMount() {
    this.setState({ visibleNodeIds: new Set([this.props.asset.id]) });
    this.props.fetchRelationshipsForAssetId(this.props.asset);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.asset.id !== prevProps.asset.id) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ visibleNodeIds: new Set([this.props.asset.id]) });
      this.props.fetchRelationshipsForAssetId(this.props.asset);
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
    const { byExternalId } = this.props.assets;
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
                  byExternalId[node.resourceId] || Number(node.resourceId)
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

  getData = () => {
    const {
      relationships: {
        items: relationshipItems,
        byAssetId: relationshipsByAssetId,
      },
      assets: { byExternalId, items: assetsItems },
    } = this.props;
    const { visibleNodeIds, query } = this.state;
    // TODO fix this is a mix across resource type! unsafe!
    const nodes: { [key: string]: any } = {};
    const links: any[] = [];
    const relationshipIds: Set<string> = new Set();
    visibleNodeIds.forEach(id => {
      if (relationshipsByAssetId[id]) {
        relationshipsByAssetId[id].forEach(relationshipId => {
          if (relationshipItems[relationshipId]) {
            relationshipIds.add(relationshipId);
          }
        });
      }
      nodes[`${id}`] = {
        resource: 'asset',
        resourceId: `${id}`,
        id: `${id}`,
        color: this.chooseNodeColor({ resource: 'asset', resourceId: `${id}` }),
      };
    });
    const { filters } = this;
    const nodeFilters = query
      .map(el => {
        const split = el.split('.');
        if (!filters[split[0]] || !filters[split[0]][split[1]]) {
          // String Filter
          return (resource: RelationshipResource) => {
            const node =
              assetsItems[
                byExternalId[resource.resourceId] || Number(resource.resourceId)
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

    // Run if visible node id is turned on (not just showing all root)
    if (visibleNodeIds.size !== 0) {
      Array.from(relationshipIds)
        .map(id => relationshipItems[id])
        .forEach((relationship: Relationship) => {
          const sourcePassFilter = nodeFilters.some(filter =>
            filter(relationship.source)
          );
          const targetPassFilter = nodeFilters.some(filter =>
            filter(relationship.target)
          );
          if (
            (nodeFilters.length === 0 ||
              (sourcePassFilter &&
                // only if in selected ids
                visibleNodeIds.has(
                  byExternalId[relationship.target.resourceId] ||
                    Number(relationship.target.resourceId)
                )) ||
              (targetPassFilter &&
                // only if in selected ids
                visibleNodeIds.has(
                  byExternalId[relationship.source.resourceId] ||
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
    }
    return {
      nodes: Object.values(nodes),
      links,
    };
  };

  buildLabel = (node: RelationshipResource): string => {
    const {
      assets: { items: assetItems, byExternalId },
      threed: { models },
      timeseries: { items: timeseriesData },
    } = this.props;
    switch (node.resource) {
      case 'asset': {
        const asset =
          assetItems[byExternalId[node.resourceId] || Number(node.resourceId)];
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

  onNodeClicked = (node: RelationshipResource) => {
    trackUsage('AssetPage.RelationshipSection.NodeClicked', {
      node,
    });
    const { visibleNodeIds } = this.state;
    switch (node.resource) {
      case 'asset': {
        const {
          assets: { items, byExternalId },
        } = this.props;
        const asset =
          items[byExternalId[node.resourceId] || Number(node.resourceId)];
        if (asset) {
          visibleNodeIds.add(asset.id);
          this.setState({
            nodeDetailsPreview: {
              id: asset.id,
              title: asset.name,
              description: asset.description || 'N/A',
              type: 'asset',
            },
            visibleNodeIds,
          });
        } else {
          message.error('Asset not yet loaded.');
        }
        return;
      }
      case 'timeSeries': {
        const {
          timeseries: { items },
        } = this.props;
        const timeseries = items[Number(node.resourceId)];
        if (timeseries) {
          visibleNodeIds.add(timeseries.id);
          this.setState({
            nodeDetailsPreview: {
              id: timeseries.id,
              title: timeseries.name || `${timeseries.id}`,
              description: timeseries.description || 'N/A',
              type: 'timeseries',
            },
            visibleNodeIds,
          });
        }
      }
    }
  };

  hideNodeDetails = () => {
    const { nodeDetailsPreview } = this.state;
    if (nodeDetailsPreview) {
      this.setState({ nodeDetailsPreview: undefined });
    }
  };

  removeFromVisibleNodeIds = (id: number) => {
    trackUsage('AssetPage.RelationshipSection.RemoveNode', {
      id,
    });
    const { visibleNodeIds } = this.state;
    visibleNodeIds.delete(id);
    this.setState({ visibleNodeIds }, this.hideNodeDetails);
  };

  onGoToPreviewNodeClicked = () => {
    const { nodeDetailsPreview } = this.state;
    if (nodeDetailsPreview) {
      this.props.onAssetClicked(nodeDetailsPreview.id);
    }
  };

  chooseNodeColor = (node: RelationshipResource): string => {
    const { nodeDetailsPreview } = this.state;
    if (nodeDetailsPreview && node.resourceId === `${nodeDetailsPreview.id}`) {
      return 'rgba(0,0,0,0.5)';
    }
    switch (node.resource) {
      case 'asset': {
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

  render() {
    const { query, nodeDetailsPreview } = this.state;
    return (
      <Wrapper>
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
            onNodeClicked={this.onNodeClicked}
            onLinkClicked={(relationship: Relationship) => {
              trackUsage('AssetPage.RelationshipSection.LinkClicked', {
                relationship,
              });
              notification.info({
                message: relationship.externalId,
                description: (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="From">{`${relationship.source.resource} - ${relationship.source.resourceId}`}</Descriptions.Item>
                    <Descriptions.Item label="Target">{`${relationship.target.resource} - ${relationship.target.resourceId}`}</Descriptions.Item>
                    <Descriptions.Item label="Data Set">
                      {relationship.dataSet}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              });
            }}
          />
        </div>
        {nodeDetailsPreview && (
          <BottomRightCard
            title={nodeDetailsPreview.title}
            onClose={this.hideNodeDetails}
          >
            <>
              <strong>Description</strong>
              <p>{nodeDetailsPreview.description}</p>
              <div className="button-row">
                <Button onClick={this.onGoToPreviewNodeClicked} type="primary">
                  View {nodeDetailsPreview.type}
                </Button>
              </div>
            </>
          </BottomRightCard>
        )}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    relationships: state.relationships,
    assets: state.assets,
    timeseries: state.timeseries,
    threed: state.threed,
    types: state.types,
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      fetchRelationshipsForAssetId,
      push,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(AssetRelationshipSection);
