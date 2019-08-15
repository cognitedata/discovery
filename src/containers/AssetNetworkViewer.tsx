/* eslint-disable no-param-reassign */
import React from 'react';
import { connect } from 'react-redux';
// import styled from 'styled-components';
import * as d3 from 'd3';
import { Dispatch, bindActionCreators } from 'redux';
import { Asset } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import {
  loadAssetChildren,
  selectAssets,
  AssetsState,
  ExtendedAsset,
} from '../modules/assets';
import { RootState } from '../reducers/index';

type OwnProps = {
  asset: Asset;
  onAssetIdChange: (number: number) => void;
};
type StateProps = {
  assets: AssetsState;
};
type DispatchProps = {
  loadAssetChildren: typeof loadAssetChildren;
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

  displayedNodes: { [key: number]: Tmp } = {};

  displayedLinkIds: string[] = [];

  displayedLinks: Link[] = [];

  simulation?: d3.Simulation<d3.SimulationNodeDatum, undefined>;

  node?: d3.Selection<any, any, any, any>;

  link?: d3.Selection<any, any, any, any>;

  constructor(props: Props) {
    super(props);

    this.createGraph = debounce(this.createGraph, 200);
  }

  componentDidMount() {
    this.svg = d3
      .select('.grapharea')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');

    const {
      clientHeight: height,
      clientWidth: width,
    } = this.grapharea.current!;

    this.simulation = d3
      .forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-60))
      .force('change', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .on('tick', this.ticked);

    this.link = this.svg!.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line');

    this.node = this.svg!.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle');

    this.createGraph();
  }

  componentDidUpdate() {
    this.createGraph();
  }

  createGraph = async () => {
    const {
      assets: { all },
    } = this.props;

    const allNewNodes = Object.keys(all).filter(
      (id: string) => !this.displayedNodes[Number(id)]
    );
    // const currentIds = current.map(el => el.id);

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
          el.target !== undefined
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

    // Apply the general update pattern to the nodes.
    this.node = this.node!.data(Object.values(this.displayedNodes), d => d.id);
    this.node.exit().remove();
    this.node = this.node
      .enter()
      .append('circle')
      .attr('fill', d => d3.scaleOrdinal(d3.schemeCategory10)(d.id))
      .attr('r', 8)
      .merge(this.node);

    // Apply the general update pattern to the links.
    this.link = this.link!.data(links, d => d.id);
    this.link.exit().remove();
    this.link = this.link
      .enter()
      .append('line')
      .merge(this.link);

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
    this.simulation!.nodes(Object.values(this.displayedNodes));
    this.simulation!.force('link', d3.forceLink(this.displayedLinks));
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

  ticked = () => {
    this.node!.attr('cx', (d: any) => {
      return d.x;
    })
      .attr('cy', (d: any) => {
        return d.y;
      })
      .on('click', (d: any) => this.props.loadAssetChildren(d.id))
      .call(this.drag(this.simulation!))
      .enter();

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

    this.node!.append('title').text((d: any) => d.id);
    this.link!.append('title').text((d: any) => d.id);
  };

  render() {
    return (
      <div
        className="grapharea"
        style={{ height: '100%', width: '100%' }}
        ref={this.grapharea}
      />
    );
  }
}

const AssetNode = ({ asset }: { asset: Tmp }) => {
  return (
    <div>
      <p>{asset.name}</p>
    </div>
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
      loadAssetChildren,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(AssetViewer);
