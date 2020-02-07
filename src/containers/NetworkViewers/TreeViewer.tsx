import React, { Component } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph from 'force-graph';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Select, Spin, message, Button, Icon } from 'antd';
import * as d3 from 'd3';
import Placeholder from 'components/Placeholder';
import { IdEither } from '@cognite/sdk';
import { withResizeDetector } from 'react-resize-detector';
import TypeBadge from 'containers/TypeBadge';
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
import { selectTypes, TypesState } from '../../modules/types';

import {
  RelationshipResource,
  Relationship,
  fetchRelationshipsForAssetId,
} from '../../modules/relationships';

const { OptGroup, Option } = Select;

const isNumeric = (value: string) => {
  return /^\d+$/.test(value);
};

const doesIntersect = (
  point: { x: number; y: number },
  node: { x: number; y: number; w: number; h: number }
) => {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.w &&
    point.y >= node.y &&
    point.y <= node.y + node.h
  );
};

const BGCOLOR = '#101020';

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  && > div > div,
  && > div {
    height: 100%;
    overflow: hidden;
  }

  && .selector {
    position: absolute;
    right: 12px;
    height: auto;
    top: 12px;
    color: #fff;
    width: 260px;
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

const SelectedAssetViewer = styled.div`
  &&&& {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background-color: #000;
    color: #fff;
    height: auto;
    padding: 8px;
    min-width: 200px;
    max-width: 300px;
  }
  h3 {
    color: #fff;
    word-break: break-all;
  }
  .buttons button {
    display: block;
    margin-top: 8px;
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
  width?: number;
  height?: number;
  data: { nodes: any[]; links: any[] };
  dataFilter?: {
    query: string[];
    setQuery: (query: string[]) => void;
    filters: {
      [key: string]: {
        [key: string]: {
          name: string;
          filterNode?: (node: RelationshipResource) => boolean;
          filterLink?: (link: Relationship) => boolean;
        };
      };
    };
  };
  buildLabel: (node: RelationshipResource) => string;
  chooseNodeColor: (node: RelationshipResource) => string;
  chooseRelationshipColor: (relationship: Relationship) => string;
  assetSelection?: {
    visibleAssetIds: number[];
    setVisibleAssetIds: (ids: number[]) => void;
  };
};

type StateProps = {
  app: AppState;
  assets: AssetsState;
  types: TypesState;
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
  showLegend: boolean;
  data: { nodes: any[]; links: any[] };
  selectedAsset?: RelationshipResource;
};

class RelationshipTreeViewer extends Component<Props, State> {
  forceGraphRef: React.RefObject<
    ForceGraph.ForceGraphInstance
  > = React.createRef();

  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();

  globalScale: DOMMatrix = new DOMMatrix();

  nodes: { [key: string]: { x: number; y: number; w: number; h: number } } = {};

  constructor(props: Props) {
    super(props);

    this.state = {
      controls: 'lr',
      showLegend: false,
      loading: false,
      data: { nodes: [], links: [] },
    };
  }

  async componentDidMount() {
    if (this.props.app.assetId) {
      if (this.forceGraphRef.current) {
        // add collision force
        this.forceGraphRef.current.d3Force(
          'collision',
          // @ts-ignore
          d3.forceCollide(node => Math.sqrt(100 / (node.level + 1)))
        );
        this.forceGraphRef.current.d3Force(
          'charge',
          // @ts-ignore
          d3.forceManyBody().strength(-80)
        );
      }

      if (this.props.asset) {
        this.fetchRelationshipforAssetId(this.props.asset);
      } else {
        this.props.fetchAssets([{ id: this.props.app.assetId }]);
      }
    }
  }

  async componentDidUpdate(prevProps: Props) {
    const { data } = this.props;
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
          this.nodes = {};
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
            d3.forceManyBody().strength(-400)
          );
        }, 500);
      } else {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ loading: false });
      }
    }
    if (prevProps.asset === undefined && this.props.asset) {
      this.fetchRelationshipforAssetId(this.props.asset);
    }
    if (
      prevProps.asset &&
      this.props.asset &&
      prevProps.asset.id !== this.props.asset.id
    ) {
      this.fetchRelationshipforAssetId(this.props.asset);
    }
    if (
      this.props.app.assetId &&
      prevProps.app.assetId !== this.props.app.assetId
    ) {
      this.props.fetchAssets([{ id: this.props.app.assetId }]);
    }
  }

  fetchRelationshipforAssetId = (asset: ExtendedAsset) => {
    const { assetSelection } = this.props;
    if (assetSelection) {
      assetSelection.setVisibleAssetIds([
        ...assetSelection.visibleAssetIds,
        asset.id,
      ]);
      this.props.fetchRelationshipsForAssetId(asset);
    }
  };

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

  onNodeClicked = (node: RelationshipResource) => {
    switch (node.resource) {
      case 'asset': {
        const {
          assets: { all, externalIdMap },
        } = this.props;
        const asset =
          all[externalIdMap[node.resourceId] || Number(node.resourceId)];
        if (asset) {
          this.setState({ selectedAsset: node });
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
  };

  onLoadMoreSelected = (node: RelationshipResource, navigateAway = true) => {
    switch (node.resource) {
      case 'asset': {
        const {
          assets: { all, externalIdMap },
        } = this.props;
        const asset =
          all[externalIdMap[node.resourceId] || Number(node.resourceId)];
        if (asset) {
          const { assetSelection } = this.props;
          if (assetSelection) {
            if (navigateAway) {
              this.props.setAssetId(asset.rootId, asset.id);
              assetSelection.setVisibleAssetIds([asset.id]);
            } else {
              this.props.fetchRelationshipsForAssetId(asset);
              assetSelection.setVisibleAssetIds([
                ...assetSelection.visibleAssetIds,
                asset.id,
              ]);
            }
            trackUsage('RelationshipViewer.AssetClicked', {
              assetId: node.resourceId,
            });
          }
        } else {
          message.error('Asset not yet loaded.');
        }
      }
    }
  };

  checkNodeClicked = (event: any) => {
    const { data } = this.state;
    let ratio = 1;
    if (this.forceGraphRef.current && this.wrapperRef.current) {
      // @ts-ignore
      const canvas = this.wrapperRef.current!.getElementsByTagName('canvas')[0];
      ratio =
        canvas.width /
        (this.props.width || this.wrapperRef.current.clientWidth);
    }
    const nodeId = Object.keys(this.nodes).find(id =>
      doesIntersect(
        { x: event.offsetX * ratio, y: event.offsetY * ratio },
        this.nodes[id]
      )
    );
    if (nodeId !== undefined) {
      const node: any = data.nodes.find(el => el.id === nodeId);
      if (node) {
        this.onNodeClicked(node);
      }
    }
  };

  renderLegend = () => {
    const { showLegend } = this.state;
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
        <h3>
          Legend{' '}
          <Icon
            type={showLegend ? 'caret-up' : 'caret-down'}
            twoToneColor="white"
            onClick={() => this.setState({ showLegend: !showLegend })}
          />
        </h3>
        {showLegend && (
          <>
            <p>
              <strong>Nodes</strong>
            </p>
            {Object.keys(nodes).map(label => (
              <div key={label} className="node">
                <p style={{ color: this.props.chooseNodeColor(nodes[label]) }}>
                  {label}
                </p>
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
                    backgroundColor: this.props.chooseRelationshipColor(
                      relationships[label]
                    ),
                  }}
                />
                <p>{label}</p>
              </div>
            ))}
          </>
        )}
      </Legend>
    );
  };

  renderSelectedAsset = () => {
    const { assetSelection } = this.props;
    if (!assetSelection) {
      return null;
    }
    const { selectedAsset } = this.state;
    const { all, externalIdMap } = this.props.assets;
    if (!selectedAsset || selectedAsset.resource !== 'asset') {
      return null;
    }
    const asset =
      all[
        externalIdMap[selectedAsset.resourceId] ||
          Number(selectedAsset.resourceId)
      ];

    const index = assetSelection.visibleAssetIds.indexOf(asset.id);
    return (
      <SelectedAssetViewer>
        <Icon
          type="close"
          twoToneColor="white"
          onClick={() => this.setState({ selectedAsset: undefined })}
        />
        <h3>Name: {asset.name}</h3>
        {asset.description && <p>{asset.description}</p>}
        <TypeBadge assetId={asset.id} />
        <div className="buttons">
          <Button
            onClick={() => {
              if (index > -1) {
                assetSelection.setVisibleAssetIds([
                  ...assetSelection.visibleAssetIds.slice(0, index),
                  ...assetSelection.visibleAssetIds.slice(index + 1),
                ]);
              } else {
                this.onLoadMoreSelected(selectedAsset, false);
              }
            }}
          >
            {index === -1 ? 'View Relationships' : 'Hide Relationships'}
          </Button>
          <Button onClick={() => this.onLoadMoreSelected(selectedAsset)}>
            Go To Asset
          </Button>
        </div>
      </SelectedAssetViewer>
    );
  };

  renderFilterSelect = () => {
    const { dataFilter } = this.props;
    if (!dataFilter) {
      return null;
    }
    const { query, setQuery, filters } = dataFilter;
    const children = Object.keys(filters).map(filterGroup => {
      return (
        <OptGroup key={filterGroup} label={filterGroup}>
          {Object.keys(filters[filterGroup]).map(subfilterKey => {
            return (
              <Option
                value={`${filterGroup}.${subfilterKey}`}
                key={subfilterKey}
              >
                {filters[filterGroup][subfilterKey].name}
              </Option>
            );
          })}
        </OptGroup>
      );
    });

    return (
      <>
        <p>Filter</p>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Filter"
          onChange={(value: string[]) => setQuery(value)}
          value={query}
        >
          {children}
        </Select>
      </>
    );
  };

  render() {
    const { controls, loading, data, selectedAsset } = this.state;
    const { assetSelection } = this.props;
    const { externalIdMap } = this.props.assets;
    if (!this.props.app.assetId) {
      return <Placeholder componentName="Relationship Viewer" />;
    }
    return (
      <Wrapper ref={this.wrapperRef}>
        <LoadingWrapper visible={loading ? 'true' : 'false'}>
          <Spin size="large" />
        </LoadingWrapper>
        <ForceGraph2D
          onBackgroundClick={(event: any) => this.checkNodeClicked(event)}
          width={this.props.width || 0}
          height={this.props.height || 0}
          ref={this.forceGraphRef}
          graphData={data}
          dagMode={controls === 'none' ? null : controls}
          dagLevelDistance={60}
          backgroundColor={BGCOLOR}
          linkColor={(link: Relationship) =>
            this.props.chooseRelationshipColor(link)
          }
          nodeRelSize={1}
          nodeId="id"
          nodeVal={(node: any) => 100 / (node.level + 1)}
          nodeLabel="name"
          nodeAutoColorBy="color"
          warmupTicks={200}
          linkDirectionalParticles={2}
          linkWidth={2}
          onNodeClick={this.onNodeClicked}
          linkDirectionalParticleWidth={3}
          nodeCanvasObject={(
            node: RelationshipResource & {
              color: string;
              x: number;
              y: number;
            },
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const label = this.props.buildLabel(node);
            const fontSize = 16 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const [bgwidth, bgheight] = [textWidth, fontSize].map(
              n => n + fontSize * 0.7
            ); // some padding
            if (selectedAsset && selectedAsset.resourceId === node.resourceId) {
              ctx.fillStyle = 'rgba(200, 255, 200, 0.8)';
            } else if (
              assetSelection &&
              assetSelection.visibleAssetIds.includes(
                externalIdMap[node.resourceId] || Number(node.resourceId)
              )
            ) {
              ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
            } else {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            }
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

            // update mapping
            const pointA = ctx.getTransform().transformPoint({
              x: node.x - bgwidth / 2,
              y: node.y - bgheight / 2,
            });
            const pointB = ctx.getTransform().transformPoint({
              x: node.x + bgwidth / 2,
              y: node.y + bgheight / 2,
            });
            this.globalScale = ctx.getTransform();
            this.nodes[node.resourceId] = {
              x: pointA.x,
              y: pointA.y,
              w: pointB.x - pointA.x,
              h: pointB.y - pointA.y,
            };
          }}
          d3VelocityDecay={0.3}
        />
        <div className="selector">
          <p>View Options</p>
          <Select
            style={{ width: '100%' }}
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
          {this.renderFilterSelect()}
        </div>
        {this.renderLegend()}
        {this.renderSelectedAsset()}
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    app: selectApp(state),
    assets: selectAssets(state),
    asset: selectCurrentAsset(state),
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
    types: selectTypes(state),
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

export default withResizeDetector(
  connect<StateProps, DispatchProps, OwnProps, RootState>(
    mapStateToProps,
    mapDispatchToProps
  )(RelationshipTreeViewer)
);
