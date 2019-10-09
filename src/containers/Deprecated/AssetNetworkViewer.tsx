/* eslint-disable no-param-reassign */
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import * as d3 from 'd3';
import { Dispatch, bindActionCreators } from 'redux';
import { Asset } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import ReactDOMServer from 'react-dom/server';
import { Breadcrumb, Button } from 'antd';
import {
  loadAssetChildren,
  loadParentRecurse,
  selectAssets,
  AssetsState,
  ExtendedAsset,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { AppState, selectApp, setAssetId } from '../../modules/app';
import NoAssetSelected from '../../components/Placeholder';

const Wrapper = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const StyledBreadcrumbs = styled(Breadcrumb)`
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 100;
`;

const LinkSection = styled.svg``;

const AssetSection = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  && > div {
    position: absolute;
  }
`;

const Node = styled.div<{ color: string }>`
  z-index: -2;
  padding: 12px 12px;
  background: rgba(100, 100, 40, 0.5);
  color: white;
  user-select: none;

  p {
    user-select: none;
    margin: 0;
  }
`;

type OwnProps = {
  hasResized: boolean;
};
type StateProps = {
  app: AppState;
  asset?: Asset;
  assets: AssetsState;
};
type DispatchProps = {
  loadAssetChildren: typeof loadAssetChildren;
  loadParentRecurse: typeof loadParentRecurse;
  setAssetId: typeof setAssetId;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = { documentId?: number };

interface D3Node extends ExtendedAsset, d3.SimulationNodeDatum {}

interface Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node;
  target: D3Node;
  id: string;
}

export class AssetNetworkViewer extends React.Component<Props, State> {
  grapharea = React.createRef<HTMLDivElement>();

  svg?: d3.Selection<SVGSVGElement, any, any, any>;

  div?: d3.Selection<HTMLDivElement, any, any, any>;

  displayedNodes: Map<number, D3Node> = new Map();

  displayedLinkIds: string[] = [];

  displayedLinks: Link[] = [];

  simulation?: d3.Simulation<d3.SimulationNodeDatum, any>;

  node?: d3.Selection<any, any, any, any>;

  link?: d3.Selection<any, any, any, any>;

  constructor(props: Props) {
    super(props);

    this.createGraph = debounce(this.createGraph, 200);
  }

  componentDidMount() {
    if (this.svg) {
      this.div!.remove();
      this.svg!.remove();
    }

    if (this.grapharea && this.grapharea.current) {
      this.createGraph();

      const {
        asset,
        app: { rootAssetId },
      } = this.props;

      if (asset && asset.id !== rootAssetId && asset.parentId) {
        this.props.loadParentRecurse(asset.parentId, rootAssetId!);
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {
      asset,
      hasResized,
      app: { rootAssetId },
      assets: { all },
    } = this.props;

    if (hasResized) {
      const {
        clientHeight: height,
        clientWidth: width,
      } = this.grapharea.current!;

      this.simulation = d3
        .forceSimulation()
        .force(
          'link',
          d3
            .forceLink()
            .distance(1000)
            .id((d: any) => d.id)
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('change', d3.forceManyBody())
        .force('collide', d3.forceCollide(40))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX())
        .force('y', d3.forceY())
        .on('tick', this.ticked);
    }

    if (
      asset &&
      asset.parentId &&
      !all[asset.parentId] &&
      asset.id !== rootAssetId
    ) {
      this.props.loadParentRecurse(asset.parentId, rootAssetId!);
    }

    if (
      (!prevProps.asset && asset) ||
      (prevProps.asset && asset && prevProps.asset.id !== asset.id)
    ) {
      this.colorizeNodes();
      this.props.loadAssetChildren(asset.id);
    }

    if (this.grapharea && this.grapharea.current) {
      if (!asset || prevProps.app.rootAssetId !== rootAssetId) {
        this.div = undefined;
        this.node = undefined;
        this.link = undefined;
        this.displayedLinkIds = [];
        this.displayedLinks = [];
        this.displayedNodes = new Map();
      } else {
        this.createGraph();
      }
    }
  }

  get parentIds() {
    const {
      assets: { all },
      app: { assetId },
    } = this.props;
    const parentIds: number[] = [assetId!];
    while (all[parentIds[parentIds.length - 1]]) {
      const { parentId } = all[parentIds[parentIds.length - 1]];
      if (parentId) {
        parentIds.push(parentId);
      } else {
        break;
      }
    }
    return parentIds;
  }

  createGraph = async () => {
    const {
      assets: { all },
    } = this.props;

    this.svg = (d3.select('#linkSection') as d3.Selection<
      SVGSVGElement,
      any,
      any,
      any
    >)
      .attr('width', '100%')
      .attr('height', '100%');

    if (!this.div || !this.node || !this.link) {
      this.div = d3.select('#assetSection');

      const {
        clientHeight: height,
        clientWidth: width,
      } = this.grapharea.current!;

      // @ts-ignore
      d3.select('#graphSection').call(
        // @ts-ignore
        d3
          .zoom()
          .extent([[0, 0], [width, height]])
          .scaleExtent([1, 8])
          .on('zoom', () => {
            const { transform } = d3.event;
            this.div!.style(
              'transform',
              `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`
            );
            this.div!.style('transform-origin', '0 0');
            this.svg!.style(
              'transform',
              `translate(${transform.x}px,${transform.y}px) scale(${transform.k})`
            );
            this.svg!.style('transform-origin', '0 0');
          })
      );

      this.simulation = d3
        .forceSimulation()
        .force(
          'link',
          d3
            .forceLink()
            .distance(77)
            .id((d: any) => d.id)
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collide', d3.forceCollide(40))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', this.ticked);

      this.link = this.svg!.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .selectAll('line');

      this.node = this.div!.selectAll('div');
    }

    const allNewNodes = Object.keys(all).filter(
      (id: string) => !this.displayedNodes.has(Number(id))
    );

    // Remove the unneccesary ones
    Array.from(this.displayedNodes.keys()).forEach((id: number) => {
      if (!all[Number(id)]) {
        this.displayedNodes.delete(Number(id));
      }
    });

    const missingParent = allNewNodes.some(key => !all[all[key].rootId]);

    if (missingParent) {
      return;
    }

    const nodes: D3Node[] = allNewNodes.map((key: string) => {
      const parent = this.displayedNodes.get(
        all[key].parentId || all[key].rootId
      );
      return Object.create({
        ...all[key],
        ...(parent && { x: parent.x, y: parent.y }),
      });
    });

    const links: Link[] = Object.keys(all)
      .filter((key: string) => all[key].parentId)
      .map((key: string) =>
        Object.create({
          id: `${key}-${all[key].parentId}`,
          source:
            this.displayedNodes.get(Number(key)) ||
            nodes.find(el => el.id === Number(key)),
          target:
            this.displayedNodes.get(all[key].parentId!) ||
            nodes.find(el => el.id === all[key].parentId!),
        })
      )
      .filter(
        el =>
          el.source !== el.target &&
          el.source !== undefined &&
          el.target !== undefined &&
          !this.displayedLinkIds.includes(el.id)
      );

    nodes.forEach(el => {
      this.displayedNodes.set(el.id, el);
    });

    this.displayedLinkIds = this.displayedLinkIds.concat(
      links.map(el => el.id)
    );
    this.displayedLinks = this.displayedLinks.concat(links);

    this.selectiveDisplay();
  };

  selectiveDisplay = () => {
    const {
      asset,
      assets: { all },
    } = this.props;
    const { parentIds } = this;

    const visibleNodes = asset
      ? Array.from(this.displayedNodes.values()).filter(
          el =>
            all[el.id] &&
            (el.parentId === asset.id || parentIds.includes(el.id))
        )
      : [];
    visibleNodes.forEach((node: D3Node) => {
      const el = document.getElementById(`${node.id}`);
      if (el) {
        el.setAttribute('style', '');
      }
    });
    // Apply the general update pattern to the nodes.
    this.node = this.node!.data(visibleNodes, d => d.id);
    this.node.exit().remove();
    this.node = this.node
      .enter()
      .append('div')
      .html((d: any) => {
        return AssetNode(d, d.id === asset!.id, d.parentId === asset!.id);
      })
      .merge(this.node);

    const visibleLinks = asset
      ? this.displayedLinks.filter(
          el =>
            (el.source.parentId === asset.id ||
              parentIds.includes(el.source.id)) &&
            (el.target.parentId === asset.id ||
              parentIds.includes(el.target.id))
        )
      : [];

    // Apply the general update pattern to the links.
    this.link = this.link!.data(visibleLinks, d => d.id);
    this.link.exit().remove();
    this.link = this.link
      .enter()
      .append('line')
      .merge(this.link);

    this.link.select('title').remove();
    this.link.append('title').text((d: any) => d.id);

    this.colorizeNodes();

    // const countExtent = d3.extent(nodes, function(d) {
    //   return d.connections;
    // });

    // const radiusScale = d3
    //   .scalePow()
    //   .exponent(2)
    //   .domain(countExtent)
    //   .range(this.nodes.sizeRange);

    // Let D3 figure out the forces
    // for (let i = 0, ii = graph.nodes.length; i < ii; i++) {
    //   var node = graph.nodes[i];

    //   node.r = 2;
    // }

    // Update and restart the simulation.
    this.simulation!.nodes(visibleNodes);
    this.simulation!.force('link', d3.forceLink(visibleLinks));
    this.simulation!.alpha(0.3).restart();
  };

  drag = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) => {
    function dragstarted(d: any) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d: any) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d: any) {
      d3.event.sourceEvent.stopPropagation();
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };

  onAssetClicked = (id: number) => {
    // this.props.loadAssetChildren(id);
    this.props.setAssetId(this.props.app.rootAssetId!, id);
  };

  ticked = () => {
    // const { asset } = this.props;
    this.node!.attr('style', (d: any) => {
      return `top:${d.y}px; left:${d.x}px; transform: translate(-50%, -50%);`;
    });
    this.node!.on('click', (d: any) => {
      this.onAssetClicked(d.id);
    })
      // @ts-ignore
      .call(this.drag(this.simulation!));

    this.link!.attr('x1', (d: any) => {
      return d.source.x;
    })
      .attr('y1', (d: any) => {
        return d.source.y;
      })
      .attr('x2', (d: any) => {
        return d.target.x;
      })
      .attr('y2', (d: any) => {
        return d.target.y;
      });
  };

  colorizeNodes = () => {
    const { asset } = this.props;
    this.parentIds.forEach((id: number) => {
      const el = document.getElementById(`${id}`);
      if (el) {
        el.setAttribute('style', 'background: rgba(34, 56, 89, 0.5)');
      }
    });
    if (asset) {
      const el = document.getElementById(`${asset.id}`);
      if (el) {
        el.setAttribute('style', 'background:rgba(125, 40, 0, 0.8)');
      }
    }
  };

  renderBreadcrumbs = () => {
    const {
      asset,
      assets: { all },
    } = this.props;
    if (!asset) {
      return null;
    }
    const breadcrumbs = [];
    const { parentIds } = this;
    for (let i = parentIds.length - 1; i >= 0; i--) {
      breadcrumbs.push(
        <Breadcrumb.Item key={parentIds[i]}>
          <Button onClick={() => this.onAssetClicked(parentIds[i])}>
            {all[parentIds[i]] ? all[parentIds[i]].name : 'Loading...'}
          </Button>
        </Breadcrumb.Item>
      );
    }
    return <StyledBreadcrumbs>{breadcrumbs}</StyledBreadcrumbs>;
  };

  render() {
    const { asset } = this.props;
    if (!asset) {
      return <NoAssetSelected componentName="Asset Network Explorer" />;
    }
    return (
      <Wrapper
        id="graphSection"
        style={{ height: '100%', width: '100%' }}
        ref={this.grapharea}
      >
        {this.renderBreadcrumbs()}
        <LinkSection id="linkSection" />
        <AssetSection id="assetSection" />
      </Wrapper>
    );
  }
}

const AssetNode = (asset: D3Node, isSelf: boolean, isChildren: boolean) => {
  let color = 'rgba(34, 56, 89, 0.5)';
  if (isSelf) {
    color = 'rgba(125, 40, 0, 0.8)';
  } else if (isChildren) {
    color = 'rgba(100, 100, 40, 0.5)';
  }
  return ReactDOMServer.renderToStaticMarkup(
    <Node id={`${asset.id}`} color={color}>
      <p>{asset.name}</p>
    </Node>
  );
};

const mapStateToProps = (state: RootState): StateProps => {
  return {
    assets: selectAssets(state),
    asset: state.app.assetId
      ? selectAssets(state).all[state.app.assetId]
      : undefined,
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      loadParentRecurse,
      loadAssetChildren,
      setAssetId,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(AssetNetworkViewer);
