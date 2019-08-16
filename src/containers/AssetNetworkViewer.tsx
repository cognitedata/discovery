/* eslint-disable no-param-reassign */
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import * as d3 from 'd3';
import { Dispatch, bindActionCreators } from 'redux';
import { Asset } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import ReactDOMServer from 'react-dom/server';
import {
  loadAssetChildren,
  loadParentRecurse,
  selectAssets,
  AssetsState,
  ExtendedAsset,
} from '../modules/assets';
import { RootState } from '../reducers/index';

const Wrapper = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
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
  asset: Asset;
  rootAssetId: number;
  onAssetIdChange: (number: number) => void;
};
type StateProps = {
  assets: AssetsState;
};
type DispatchProps = {
  loadAssetChildren: typeof loadAssetChildren;
  loadParentRecurse: typeof loadParentRecurse;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = { documentId?: number };

interface Tmp extends ExtendedAsset, d3.SimulationNodeDatum {}

interface Link extends d3.SimulationLinkDatum<Tmp> {
  source: Tmp;
  target: Tmp;
  id: string;
}

export class AssetViewer extends React.Component<Props, State> {
  grapharea = React.createRef<HTMLDivElement>();

  svg?: d3.Selection<SVGSVGElement, any, any, any>;

  div?: d3.Selection<HTMLDivElement, any, any, any>;

  displayedNodes: { [key: number]: Tmp } = {};

  displayedLinkIds: string[] = [];

  displayedLinks: Link[] = [];

  simulation?: d3.Simulation<d3.SimulationNodeDatum, any>;

  node?: d3.Selection<any, any, any, any>;

  link?: d3.Selection<any, any, any, any>;

  constructor(props: Props) {
    super(props);

    this.createGraph = debounce(this.createGraph, 200);

    window.addEventListener('resize', this.componentDidMount);
  }

  componentDidMount() {
    if (this.svg) {
      this.div!.remove();
      this.svg!.remove();
    }
    this.svg = (d3.select('#linkSection') as d3.Selection<
      SVGSVGElement,
      any,
      any,
      any
    >)
      .attr('width', '100%')
      .attr('height', '100%');

    this.div = d3.select('#assetSection');

    const {
      clientHeight: height,
      clientWidth: width,
    } = this.grapharea.current!;

    this.simulation = d3
      .forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('change', d3.forceManyBody())
      .force('collide', d3.forceCollide(40))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .on('tick', this.ticked);

    this.link = this.svg!.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line');

    this.node = this.div!.selectAll('div');

    this.createGraph();

    const { asset, rootAssetId } = this.props;

    if (asset && asset.id !== rootAssetId && asset.parentId) {
      this.props.loadParentRecurse(asset.parentId, rootAssetId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {
      asset,
      rootAssetId,
      assets: { all },
    } = this.props;

    if (
      asset &&
      asset.parentId &&
      !all[asset.parentId] &&
      asset.id !== rootAssetId
    ) {
      this.props.loadParentRecurse(asset.parentId, rootAssetId);
    }

    if (prevProps.asset && asset && prevProps.asset.id !== asset.id) {
      this.colorizeNodes();
    }

    this.createGraph();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.componentDidMount);
  }

  get parentIds() {
    const {
      assets: { all },
      asset,
    } = this.props;
    const parentIds: number[] = [asset.id];
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

    const allNewNodes = Object.keys(all).filter(
      (id: string) => !this.displayedNodes[Number(id)]
    );

    const nodes: Tmp[] = allNewNodes.map((key: string) => {
      const parent = this.displayedNodes[all[key].parentId || all[key].rootId];
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
            this.displayedNodes[Number(key)] ||
            nodes.find(el => el.id === Number(key)),
          target:
            this.displayedNodes[all[key].parentId!] ||
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

    this.displayedNodes = {
      ...this.displayedNodes,
      ...nodes.reduce(
        (prev, el: Tmp) => {
          prev[el.id] = el;
          return prev;
        },
        {} as { [key: number]: Tmp }
      ),
    };
    this.displayedLinkIds = this.displayedLinkIds.concat(
      links.map(el => el.id)
    );
    this.displayedLinks = this.displayedLinks.concat(links);

    this.selectiveDisplay();
  };

  selectiveDisplay = () => {
    const { asset } = this.props;
    if (!asset) {
      return;
    }
    const { parentIds } = this;

    const visibleNodes = Object.values(this.displayedNodes).filter(
      el => el.parentId === asset.id || parentIds.includes(el.id)
    );
    visibleNodes.forEach((node: Tmp) => {
      const el = document.getElementById(`${node.id}`);
      if (el) {
        el.setAttribute('style', '');
      }
    });
    // Apply the general update pattern to the nodes.
    this.node = this.node!.data(visibleNodes, d => d.id);
    this.node.exit().remove();
    this.node = this.node
      // .on('click', (d: any) => this.onAssetClicked(d.id))
      .enter()
      .append('div')
      .html((d: any) => {
        return AssetNode(d, d.id === asset.id, d.parentId === asset.id);
      })
      .merge(this.node);

    const visibleLinks = this.displayedLinks.filter(
      el =>
        (el.source.parentId === asset.id || parentIds.includes(el.source.id)) &&
        (el.target.parentId === asset.id || parentIds.includes(el.target.id))
    );

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
    this.props.loadAssetChildren(id);
    this.props.onAssetIdChange(id);
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

  render() {
    return (
      <Wrapper
        className="grapharea"
        style={{ height: '100%', width: '100%' }}
        ref={this.grapharea}
      >
        <LinkSection id="linkSection" />
        <AssetSection id="assetSection" />
      </Wrapper>
    );
  }
}

const AssetNode = (asset: Tmp, isSelf: boolean, isChildren: boolean) => {
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
    // assetMappings: selectAssetMappings(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      loadParentRecurse,
      loadAssetChildren,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
