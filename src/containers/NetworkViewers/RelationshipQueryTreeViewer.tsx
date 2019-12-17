import React, { Component } from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { RootState } from '../../reducers/index';
import { selectAssets, AssetsState } from '../../modules/assets';

import {
  RelationshipResource,
  Relationship,
  postWithCursor,
} from '../../modules/relationships';
import TreeViewer from './TreeViewer';
import { sdk } from '../../index';

type OwnProps = { nodes: { key: string; value: string }[] };

type StateProps = {
  assets: AssetsState;
};
type DispatchProps = {};

type Props = StateProps & DispatchProps & OwnProps;

type State = { data: { nodes: any[]; links: any[] } };

class RelationshipQueryTreeViewer extends Component<Props, State> {
  readonly state: Readonly<State> = { data: { nodes: [], links: [] } };

  async componentDidMount() {
    this.setState({ data: await this.getData() });
  }

  async componentDidUpdate(prevProps: Props) {
    if (prevProps.nodes !== this.props.nodes) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ data: await this.getData() });
    }
  }

  buildLabel = (node: RelationshipResource): string => {
    const {
      assets: { all, externalIdMap },
    } = this.props;
    switch (node.resource) {
      case 'asset': {
        const asset =
          all[externalIdMap[node.resourceId] || Number(node.resourceId)];
        return asset ? asset.name : 'Loading...';
      }
    }
    return `${node.resource}:${node.resourceId}`;
  };

  chooseNodeColor = (node: RelationshipResource): string => {
    switch (node.resource) {
      case 'asset': {
        return 'rgba(0,0,255,0.5)';
      }
    }
    return 'rgba(0,122,255,0.5)';
  };

  chooseRelationshipColor = (relationship: Relationship) => {
    switch (relationship.relationshipType) {
      case 'isParentOf': {
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

  getData = async () => {
    const { nodes: propsNodes } = this.props;
    const results = await postWithCursor(
      `/api/playground/projects/${sdk.project}/relationships/list`,
      {
        filter: {
          sources: propsNodes
            .map(el => {
              if (el.key === 'resourceId') {
                return { resource: 'asset', resourceId: el.value };
              }
              return undefined;
            })
            .filter(el => !!el),
          targets: propsNodes
            .map(el => {
              if (el.key === 'resourceId') {
                return { resource: 'asset', resourceId: 'el.value' };
              }
              return undefined;
            })
            .filter(el => !!el),
        },
        limit: 1000,
      }
    );
    const nodes: { [key: string]: any } = propsNodes.reduce((prev, el) => {
      return {
        ...prev,
        [el.value]: {
          id: el.value,
          resourceId: el.value,
          resource: 'asset',
          color: this.chooseNodeColor({
            resource: 'asset',
            resourceId: el.value,
          }),
        },
      };
    }, {});

    const externalIds = Object.values(nodes)
      .reduce((p: number[], c: any) => [...p, c.resourceId], [])
      .map((externalId: number) => ({
        resource: 'asset',
        resourceId: externalId,
      }));

    const links: any[] = [];

    if (externalIds.length > 0) {
      const { project } = sdk;
      const relationships = await sdk.post(
        `/api/playground/projects/${project}/relationships/list`,
        {
          data: {
            filter: {
              sources: externalIds,
              targets: externalIds,
            },
            limit: 100,
          },
        }
      );

      relationships.data.items.forEach((relationship: Relationship) => {
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
        // no loops
        if (relationship.source.resourceId !== relationship.target.resourceId) {
          links.push({
            ...relationship,
            linkWidth: 3,
            source: relationship.source.resourceId,
            target: relationship.target.resourceId,
          });
        }
      });
    }

    results.items.forEach((relationship: Relationship) => {
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
      // no loops
      if (relationship.source.resourceId !== relationship.target.resourceId) {
        links.push({
          ...relationship,
          linkWidth: 3,
          source: relationship.source.resourceId,
          target: relationship.target.resourceId,
        });
      }
    });
    return {
      nodes: Object.values(nodes),
      links,
    };
  };

  render() {
    return (
      <TreeViewer
        data={this.state.data}
        buildLabel={this.buildLabel}
        chooseNodeColor={this.chooseNodeColor}
        chooseRelationshipColor={this.chooseRelationshipColor}
      />
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators({}, dispatch);

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(RelationshipQueryTreeViewer);
