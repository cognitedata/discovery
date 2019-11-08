import React, { Component } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import ForceGraph from 'force-graph';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Select, Spin, message } from 'antd';
import * as d3 from 'd3';
import Placeholder from 'components/Placeholder';
import { IdEither } from '@cognite/sdk';
import {
  AppState,
  selectApp,
  setAssetId,
  setTimeseriesId,
} from '../../modules/app';
import { RootState } from '../../reducers/index';
import { trackUsage } from '../../utils/metrics';
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

import {
  RelationshipResource,
  Relationship,
  fetchRelationshipsForAssetId,
  RelationshipState,
} from '../../modules/relationships';

const isNumeric = (value: string) => {
  return /^\d+$/.test(value);
};
const BGCOLOR = '#101020';

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  && > div > div,
  && > div canvas,
  && > div {
    height: 100%;
    overflow: hidden;
  }

  && .selector {
    position: absolute;
    right: 12px;
    height: auto;
    top: 12px;
  }
`;

const Legend = styled.div`
  &&&& {
    position: absolute;
    top: 12px;
    left: 12px;
    background-color: #000;
    color: #fff;
    height: auto;
    padding: 8px;
    min-width: 200px;
  }
  h3 {
    color: #fff;
  }
  .node,
  .relationship {
    display: flex;
    margin-bottom: 6px;
  }
  .node {
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.9);
  }
  .relationship {
  }

  .relationship .line {
    height: 4px;
    width: 12px;
    margin-right: 4px;
    align-self: center;
  }
  .node p,
  .relationship p {
    margin-bottom: 0px;
  }
`;

type FORCE_GRAPH_TYPES =
  | 'td'
  | 'bu'
  | 'lr'
  | 'rl'
  | 'radialout'
  | 'radialin'
  | 'none';

const ForceViewTypes: { [key in FORCE_GRAPH_TYPES]: string } = {
  td: 'Top Down',
  bu: 'Bottom Up',
  lr: 'Left Right',
  rl: 'Right Life',
  radialout: 'Radial Out',
  radialin: 'Radial In',
  none: 'None',
};

const LoadingWrapper = styled.div<{ visible: string }>`
  display: ${props => (props.visible === 'true' ? 'flex' : 'none')};
  flex-direction: column;
  position: absolute;
  z-index: 2;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  background: ${BGCOLOR};
  align-items: center;
  text-align: center;

  && > .ant-spin {
    display: flex;
  }

  && > .ant-spin > span {
    align-self: center;
  }
`;

type OwnProps = {
  topShowing: boolean;
};
type StateProps = {
  app: AppState;
  relationships: RelationshipState;
  assets: AssetsState;
  asset: ExtendedAsset | undefined;
  timeseries: TimeseriesState;
  threed: ThreeDState;
};
type DispatchProps = {
  fetchRelationshipsForAssetId: typeof fetchRelationshipsForAssetId;
  setAssetId: typeof setAssetId;
  fetchAssets: typeof fetchAssets;
  fetchTimeseries: typeof fetchTimeseries;
  setTimeseriesId: typeof setTimeseriesId;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = {
  controls: string;
  loading: boolean;
  data: { nodes: any[]; links: any[] };
};

class TreeViewer extends Component<Props, State> {
  forceGraphRef: React.RefObject<
    ForceGraph.ForceGraphInstance
  > = React.createRef();

  constructor(props: Props) {
    super(props);

    this.state = {
      controls: 'none',
      loading: false,
      data: { nodes: [], links: [] },
    };
  }

  async componentDidMount() {
    if (this.props.app.assetId) {
      // add collision force
      this.forceGraphRef.current!.d3Force(
        'collision',
        // @ts-ignore
        d3.forceCollide(node => Math.sqrt(100 / (node.level + 1)))
      );
      this.forceGraphRef.current!.d3Force(
        'charge',
        // @ts-ignore
        d3.forceManyBody().strength(-80)
      );

      if (this.props.asset) {
        this.props.fetchRelationshipsForAssetId(this.props.asset);
      } else {
        this.props.fetchAssets([{ id: this.props.app.assetId }]);
      }
    }
  }

  async componentDidUpdate(prevProps: Props) {
    const data = this.getData();
    if (
      data.nodes.length !== this.state.data.nodes.length ||
      data.links.length !== this.state.data.links.length
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ data, loading: true });
      if (data.nodes.length !== 0) {
        this.loadMissingResources(data.nodes);
        // eslint-disable-next-line react/no-did-update-set-state
        setTimeout(() => {
          this.setState({ loading: false });
          // add collision force
          this.forceGraphRef.current!.d3Force(
            'collision',
            // @ts-ignore
            d3.forceCollide(node => Math.sqrt(100 / (node.level + 1)))
          );
          this.forceGraphRef.current!.d3Force(
            'charge',
            // @ts-ignore
            d3.forceManyBody().strength(-80)
          );
        }, 500);
      }
    }
    if (prevProps.asset === undefined && this.props.asset) {
      this.props.fetchRelationshipsForAssetId(this.props.asset);
    }
    if (
      prevProps.asset &&
      this.props.asset &&
      prevProps.asset.id !== this.props.asset.id
    ) {
      this.props.fetchRelationshipsForAssetId(this.props.asset);
    }
    if (
      this.props.app.assetId &&
      prevProps.app.assetId !== this.props.app.assetId
    ) {
      this.props.fetchAssets([{ id: this.props.app.assetId }]);
    }
  }

  loadMissingResources = (nodes: any[]) => {
    const ids = nodes.reduce(
      (
        prev: { timeseries: IdEither[]; assets: IdEither[]; models: number[] },
        node
      ) => {
        switch (node.resource) {
          case 'asset': {
            if (isNumeric(node.resourceId)) {
              prev.assets.push({ id: Number(node.resourceId) });
            } else {
              prev.assets.push({ externalId: node.resourceId });
            }
            break;
          }
          case 'threeDRevision':
          case 'threeD': {
            const split = node.resourceId.split(':');
            prev.models.push(Number(split[split.length - 1]));
            break;
          }
          case 'timeSeries': {
            if (isNumeric(node.resourceId)) {
              prev.timeseries.push({ id: Number(node.resourceId) });
            } else {
              prev.timeseries.push({ externalId: node.resourceId });
            }
          }
        }
        return prev;
      },
      { timeseries: [], assets: [], models: [] } as {
        timeseries: IdEither[];
        assets: IdEither[];
        models: number[];
      }
    );
    if (ids.assets.length !== 0) {
      this.props.fetchAssets(ids.assets);
    }
    if (ids.timeseries.length !== 0) {
      this.props.fetchTimeseries(ids.timeseries);
    }
  };

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

  chooseNodeColor = (node: RelationshipResource) => {
    const { assetId } = this.props.app;
    switch (node.resource) {
      case 'asset': {
        if (Number(node.resourceId) === assetId) {
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
    const {
      app: { assetId },
      asset,
    } = this.props;
    switch (relationship.relationshipType) {
      case 'isParentOf': {
        if (
          (asset && relationship.target.resourceId === asset.externalId) ||
          Number(relationship.target.resourceId) === assetId
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
      relationships: { items },
    } = this.props;
    const nodes: { [key: string]: any } = {};
    const links: any[] = [];
    items.forEach((relationship: Relationship) => {
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

  renderLegend = () => {
    const nodes: { [key: string]: RelationshipResource } = {
      'Current Asset': {
        resource: 'asset',
        resourceId: `${this.props.app.assetId}`,
      },
      Asset: { resource: 'asset', resourceId: '-1' },
      Timeseries: { resource: 'timeSeries', resourceId: '-1' },
      '3D': { resource: 'threeD', resourceId: '-1:-1' },
    };
    const relationships: { [key: string]: Relationship } = {
      'Flows To': {
        relationshipType: 'flowsTo',
        source: nodes.Asset,
        target: nodes.Asset,
        confidence: 1,
        dataSet: 'legend',
        externalId: 'legend',
      },
      'Belongs To': {
        relationshipType: 'belongsTo',
        source: nodes.Asset,
        target: nodes.Asset,
        confidence: 1,
        dataSet: 'legend',
        externalId: 'legend',
      },
      Children: {
        relationshipType: 'isParentOf',
        source: nodes.Asset,
        target: nodes.Asset,
        confidence: 1,
        dataSet: 'legend',
        externalId: 'legend',
      },
      Parent: {
        relationshipType: 'isParentOf',
        source: nodes.Asset,
        target: nodes['Current Asset'],
        confidence: 1,
        dataSet: 'legend',
        externalId: 'legend',
      },
    };
    return (
      <Legend>
        <h3>Legend</h3>
        <p>
          <strong>Nodes</strong>
        </p>
        {Object.keys(nodes).map(label => (
          <div key={label} className="node">
            <p style={{ color: this.chooseNodeColor(nodes[label]) }}>{label}</p>
          </div>
        ))}
        <p>
          <strong>Relationships</strong>
        </p>
        {Object.keys(relationships).map(label => (
          <div key={label} className="relationship">
            <div
              className="line"
              style={{
                backgroundColor: this.chooseRelationshipColor(
                  relationships[label]
                ),
              }}
            />
            <p>{label}</p>
          </div>
        ))}
      </Legend>
    );
  };

  render() {
    const { controls, loading, data } = this.state;
    if (!this.props.app.assetId) {
      return <Placeholder componentName="Relationship Viewer" />;
    }
    return (
      <Wrapper>
        <LoadingWrapper visible={loading ? 'true' : 'false'}>
          <Spin size="large" />
        </LoadingWrapper>
        <ForceGraph2D
          ref={this.forceGraphRef}
          graphData={data}
          dagMode={controls === 'none' ? null : controls}
          dagLevelDistance={100}
          backgroundColor={BGCOLOR}
          linkColor={(link: Relationship) => this.chooseRelationshipColor(link)}
          nodeRelSize={1}
          nodeId="id"
          nodeVal={(node: any) => 100 / (node.level + 1)}
          nodeLabel="name"
          nodeAutoColorBy="color"
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          onNodeClick={(node: RelationshipResource) => {
            switch (node.resource) {
              case 'asset': {
                const {
                  assets: { all, externalIdMap },
                } = this.props;
                const asset =
                  all[
                    externalIdMap[node.resourceId] || Number(node.resourceId)
                  ];
                if (asset) {
                  this.props.setAssetId(asset.rootId, asset.id);
                  trackUsage('RelationshipViewer.AssetClicked', {
                    assetId: node.resourceId,
                  });
                } else {
                  message.error('Asset not yet loaded.');
                }
                return;
              }
              case 'timeSeries': {
                this.props.setTimeseriesId(Number(node.resourceId));
                trackUsage('RelationshipViewer.TimeseriesClicked', {
                  assetId: node.resourceId,
                });
              }
            }
          }}
          nodeCanvasObject={(
            node: RelationshipResource & {
              color: string;
              x: number;
              y: number;
            },
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const label = this.buildLabel(node);
            const fontSize = 16 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const [bgwidth, bgheight] = [textWidth, fontSize].map(
              n => n + fontSize * 0.7
            ); // some padding
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bgwidth / 2,
              node.y - bgheight / 2,
              bgwidth,
              bgheight
            );
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.color;
            ctx.fillText(label, node.x, node.y);
          }}
          d3VelocityDecay={0.3}
        />
        <div className="selector">
          <Select
            style={{ width: '200px' }}
            placeholder="Choose a layout"
            value={controls}
            onChange={(val: string) => this.setState({ controls: val })}
          >
            {Object.keys(ForceViewTypes).map(el => (
              <Select.Option key={el} value={el}>
                {ForceViewTypes[el as FORCE_GRAPH_TYPES]}
              </Select.Option>
            ))}
          </Select>
        </div>
        {this.renderLegend()}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    relationships: state.relationships,
    app: selectApp(state),
    assets: selectAssets(state),
    asset: selectCurrentAsset(state),
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      fetchRelationshipsForAssetId,
      setAssetId,
      fetchAssets,
      fetchTimeseries,
      setTimeseriesId,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(TreeViewer);
