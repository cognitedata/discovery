import React, { Component } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import ForceGraph from 'force-graph';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Select, Spin } from 'antd';
import * as d3 from 'd3';
import { AppState, selectApp } from '../../modules/app';
import { RootState } from '../../reducers/index';
import {
  fetchRelationships,
  RelationshipState,
} from '../../modules/relationships';

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
  }
`;

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
};
type DispatchProps = {
  fetchRelationships: typeof fetchRelationships;
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
      controls: 'bu',
      loading: false,
      data: { nodes: [], links: [] },
    };
  }

  componentDidMount() {
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

    this.props.fetchRelationships();
  }

  componentDidUpdate() {
    const data = this.getData();
    if (
      data.nodes.length !== this.state.data.nodes.length ||
      data.links.length !== this.state.data.links.length
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ data, loading: true });
      if (data.nodes.length !== 0) {
        // eslint-disable-next-line react/no-did-update-set-state
        setTimeout(() => this.setState({ loading: false }), 500);
      }
    }
  }

  getData = () => {
    const {
      relationships: { items },
    } = this.props;
    const nodes: { [key: string]: any } = {};
    const links: any[] = [];
    items.forEach((relationship: any) => {
      nodes[relationship.source.resourceId as string] = {
        ...relationship.source,
        id: relationship.source.resourceId,
      };
      nodes[relationship.target.resourceId as string] = {
        ...relationship.target,
        id: relationship.target.resourceId,
      };
      if (relationship.source.resourceId !== relationship.target.resourceId) {
        links.push({
          ...relationship,
          source: nodes[relationship.source.resourceId],
          target: nodes[relationship.target.resourceId],
        });
      }
    });
    return {
      nodes: Object.values(nodes),
      links,
    };
  };

  render() {
    const { data } = this.state;
    const { controls, loading } = this.state;
    return (
      <Wrapper>
        <LoadingWrapper visible={loading ? 'true' : 'false'}>
          <Spin size="large" />
        </LoadingWrapper>
        <ForceGraph2D
          ref={this.forceGraphRef}
          graphData={data}
          dagMode={controls === 'none' ? null : controls}
          dagLevelDistance={300}
          backgroundColor={BGCOLOR}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          nodeRelSize={1}
          nodeId="id"
          nodeVal={(node: any) => 100 / (node.level + 1)}
          nodeLabel="name"
          nodeAutoColorBy="color"
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          nodeCanvasObject={(
            node: any,
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const label = `${node.resourceId} - ${node.resource}`;
            const fontSize = 16 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const [bgwidth, bgheight] = [textWidth, fontSize].map(
              n => n + fontSize * 0.2
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
            {['td', 'bu', 'lr', 'rl', 'radialout', 'radialin', 'none'].map(
              el => (
                <Select.Option key={el} value={el}>
                  {el}
                </Select.Option>
              )
            )}
          </Select>
        </div>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    relationships: state.relationships,
    app: selectApp(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      fetchRelationships,
    },
    dispatch
  );

export default connect<StateProps, DispatchProps, OwnProps, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(TreeViewer);
