/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import { Asset } from '@cognite/sdk';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Group } from '@vx/group';
import { Tree } from '@vx/hierarchy';
import { LinearGradient } from '@vx/gradient';
import { Text } from '@vx/text';
import { Zoom } from '@vx/zoom';
import { localPoint } from '@vx/event';
import { RectClipPath } from '@vx/clip-path';
import { hierarchy } from 'd3-hierarchy';
import { pointRadial } from 'd3-shape';
import {
  LinkHorizontal,
  LinkVertical,
  LinkRadial,
  LinkHorizontalStep,
  LinkVerticalStep,
  LinkRadialStep,
  LinkHorizontalCurve,
  LinkVerticalCurve,
  LinkRadialCurve,
  LinkHorizontalLine,
  LinkVerticalLine,
  LinkRadialLine,
} from '@vx/shape';
import { Select, Button } from 'antd';
import {
  loadParentRecurse,
  loadAssetChildren,
  AssetsState,
  selectAssets,
} from '../../modules/assets';
import { AppState, setAssetId, selectApp } from '../../modules/app';
import { RootState } from '../../reducers/index';
import NoAssetSelected from '../../components/Placeholder';

type Node = {
  name: string;
  children?: Node[];
  node: Asset;
  isExpanded?: boolean;
};

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;

  && > div {
    position: relative;
    height: 100%;
    width: 100%;
  }

  && .selector {
    z-index: 1;
    position: absolute;
    right: 12px;
    height: auto;
    top: 12px;
    background: #fff;
    padding: 14px;
  }
  && .selector strong {
    margin-left: 4px;
    margin-right: 4px;
  }
  && .controls {
    z-index: 1;
    position: absolute;
    right: 12px;
    height: auto;
    bottom: 12px;
    background: #fff;
    padding: 14px;
  }

  && .controls > * {
    margin-left: 12px;
  }
  && .controls > *:nth-child(1) {
    margin-left: 0px;
  }
`;

type OwnProps = {};
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

type State = {
  controls: 'cartesian' | 'polar';
  orientation: 'horizontal' | 'vertical';
  linkType: 'diagonal' | 'step' | 'curve' | 'line';
  length: number;
  data?: Node;
};

class TreeViewer extends Component<Props, State> {
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: Props) {
    super(props);

    this.state = {
      controls: 'polar',
      orientation: 'horizontal',
      linkType: 'diagonal',
      data: undefined,
      length: 0,
    };
  }

  componentDidMount() {
    const {
      asset,
      app: { rootAssetId },
    } = this.props;

    const { nodes, length } = this.getData();
    if (length !== this.state.length) {
      this.setState({ data: nodes, length });
    }

    if (asset && asset.id !== rootAssetId && asset.parentId) {
      this.props.loadParentRecurse(asset.parentId, rootAssetId!);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {
      asset,
      app: { rootAssetId },
      assets: { all },
    } = this.props;

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
      this.props.loadAssetChildren(asset.id);
    }

    const { nodes, length } = this.getData();
    if (length !== this.state.length) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ data: nodes, length });
    }
  }

  getData = () => {
    const {
      assets: { all },
      app: { assetId, rootAssetId },
    } = this.props;
    if (rootAssetId && assetId) {
      let nodes: Node | undefined;
      let length = 0;
      let currentAssetId: number | undefined = assetId;
      let currentAssetNode: Node | undefined;
      do {
        if (currentAssetId && all[currentAssetId]) {
          length += 1;
          nodes = {
            name: all[currentAssetId].name || `${all[currentAssetId].id}`,
            node: all[currentAssetId],
            children: nodes ? [nodes] : undefined,
          };
          if (!nodes.children) {
            currentAssetNode = nodes;
            currentAssetNode.children = [];
          }
          if (currentAssetId === rootAssetId) {
            break;
          }
          currentAssetId = all[currentAssetId!].parentId;
        } else {
          return {
            nodes: undefined,
            length: 0,
          };
        }
      } while (currentAssetId);
      if (!currentAssetNode) {
        return {
          nodes: undefined,
          length: 0,
        };
      }
      Object.values(all)
        .filter(el => el.parentId === assetId)
        .forEach(el => {
          length += 1;
          currentAssetNode!.children!.push({
            name: el.name || `${el.id}`,
            node: el,
          });
        });
      return {
        nodes,
        length,
      };
    }
    return {
      nodes: undefined,
      length: 0,
    };
  };

  renderControlSection = () => {
    const { controls, orientation, linkType } = this.state;
    return (
      <div className="selector">
        <strong>Layout:</strong>
        <Select
          onChange={(value: 'cartesian' | 'polar') =>
            this.setState({ controls: value })
          }
          value={controls}
        >
          <Select.Option value="cartesian">cartesian</Select.Option>
          <Select.Option value="polar">polar</Select.Option>
        </Select>

        <strong>Orientation:</strong>
        <Select
          onChange={(value: 'vertical' | 'horizontal') =>
            this.setState({ orientation: value })
          }
          value={orientation}
          disabled={controls === 'polar'}
        >
          <Select.Option value="vertical">vertical</Select.Option>
          <Select.Option value="horizontal">horizontal</Select.Option>
        </Select>

        <strong>Link:</strong>
        <Select
          onChange={(value: 'diagonal' | 'step' | 'curve' | 'line') =>
            this.setState({ linkType: value })
          }
          value={linkType}
        >
          <Select.Option value="diagonal">diagonal</Select.Option>
          <Select.Option value="step">step</Select.Option>
          <Select.Option value="curve">curve</Select.Option>
          <Select.Option value="line">line</Select.Option>
        </Select>
      </div>
    );
  };

  render() {
    let height = 0;
    let width = 0;
    let origHeight = 0;
    let origWidth = 0;
    if (this.wrapperRef && this.wrapperRef.current) {
      ({
        height: origHeight,
        width: origWidth,
      } = this.wrapperRef.current.getBoundingClientRect());
    }
    const margin = {
      top: 120,
      left: 60,
      right: 60,
      bottom: 60,
    };

    width = Math.max(origWidth, origHeight, 800);
    height = Math.max(origWidth, origHeight, 800);

    const { controls, orientation, linkType, data: nodeData } = this.state;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    let origin: {
      x: number;
      y: number;
    };
    let sizeWidth: number;
    let sizeHeight: number;

    if (controls === 'polar') {
      origin = {
        x: innerWidth / 2,
        y: innerHeight / 2,
      };
      sizeWidth = 2 * Math.PI;
      sizeHeight = Math.min(innerWidth, innerHeight) / 2;
    } else {
      origin = { x: 0, y: 0 };
      if (orientation === 'vertical') {
        sizeWidth = innerWidth;
        sizeHeight = innerHeight;
      } else {
        sizeWidth = innerHeight;
        sizeHeight = innerWidth;
      }
    }
    if (!nodeData) {
      return <NoAssetSelected componentName="Asset Network Explorer" />;
    }

    return (
      <Wrapper ref={this.wrapperRef}>
        <Zoom
          width={width}
          height={height}
          scaleXMin={1 / 2}
          scaleXMax={4}
          scaleYMin={1 / 2}
          scaleYMax={4}
          transformMatrix={{
            scaleX: 1.27,
            scaleY: 1.27,
            translateX: -211.62,
            translateY: 162.59,
            skewX: 0,
            skewY: 0,
          }}
        >
          {(zoom: any) => {
            return (
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                {this.renderControlSection()}
                <svg
                  width="100%"
                  height="100%"
                  style={{
                    display: 'block',
                  }}
                >
                  <RectClipPath id="zoom-clip" width="100%" height="100%" />
                  <LinearGradient id="lg" from="#fd9b93" to="#fe6e9e" />
                  <rect width="100%" height="100%" fill="#272b4d" />
                  <rect
                    width="100%"
                    height="100%"
                    rx={14}
                    fill="transparent"
                    onWheel={zoom.handleWheel}
                    onMouseDown={zoom.dragStart}
                    onMouseMove={zoom.dragMove}
                    onMouseUp={zoom.dragEnd}
                    onMouseLeave={() => {
                      if (!zoom.isDragging) return;
                      zoom.dragEnd();
                    }}
                    onDoubleClick={event => {
                      const point = localPoint(event);
                      zoom.scale({ scaleX: 1.1, scaleY: 1.1, point });
                    }}
                  />
                  <Group
                    top={margin.top}
                    left={margin.left}
                    transform={zoom.toString()}
                  >
                    <Tree
                      root={hierarchy(nodeData, d =>
                        d.isExpanded ? null : d.children
                      )}
                      size={[sizeWidth, sizeHeight]}
                      separation={(a: any, b: any) =>
                        (a.parent === b.parent ? 1 : 0.5) / a.depth
                      }
                    >
                      {(data: any) => (
                        <Group top={origin.y} left={origin.x}>
                          {data.links().map((link: any, i: number) => {
                            let LinkComponent;

                            if (controls === 'polar') {
                              if (linkType === 'step') {
                                LinkComponent = LinkRadialStep;
                              } else if (linkType === 'curve') {
                                LinkComponent = LinkRadialCurve;
                              } else if (linkType === 'line') {
                                LinkComponent = LinkRadialLine;
                              } else {
                                LinkComponent = LinkRadial;
                              }
                            } else if (orientation === 'vertical') {
                              if (linkType === 'step') {
                                LinkComponent = LinkVerticalStep;
                              } else if (linkType === 'curve') {
                                LinkComponent = LinkVerticalCurve;
                              } else if (linkType === 'line') {
                                LinkComponent = LinkVerticalLine;
                              } else {
                                LinkComponent = LinkVertical;
                              }
                            } else if (linkType === 'step') {
                              LinkComponent = LinkHorizontalStep;
                            } else if (linkType === 'curve') {
                              LinkComponent = LinkHorizontalCurve;
                            } else if (linkType === 'line') {
                              LinkComponent = LinkHorizontalLine;
                            } else {
                              LinkComponent = LinkHorizontal;
                            }

                            return (
                              <LinkComponent
                                data={link}
                                percent={+0.5}
                                stroke="#374469"
                                strokeWidth="1"
                                fill="none"
                                key={i}
                              />
                            );
                          })}

                          {data.descendants().map((node: any, key: any) => {
                            const innerNodeWidth =
                              8 * node.data.node.name.length;
                            const innerNodeHeight = 20;

                            let top;
                            let left;
                            if (controls === 'polar') {
                              const [radialX, radialY] = pointRadial(
                                node.x,
                                node.y
                              );
                              top = radialY;
                              left = radialX;
                            } else if (orientation === 'vertical') {
                              top = node.y;
                              left = node.x;
                            } else {
                              top = node.x;
                              left = node.y;
                            }

                            let color = '#71248e';
                            if (node.depth > 0) {
                              if (node.children) {
                                color = 'white';
                              } else {
                                color = '#26deb0';
                              }
                            }

                            return (
                              <Group top={top} left={left} key={key}>
                                {node.depth === 0 && (
                                  <circle
                                    r={12}
                                    fill="url('#lg')"
                                    onClick={() => {
                                      // eslint-disable-next-line no-param-reassign
                                      node.data.isExpanded = !node.data
                                        .isExpanded;
                                      this.props.setAssetId(
                                        node.data.node.rootAssetId,
                                        node.data.node.id
                                      );
                                      this.forceUpdate();
                                    }}
                                  />
                                )}
                                {node.depth !== 0 && (
                                  <rect
                                    height={innerNodeHeight}
                                    width={innerNodeWidth}
                                    y={-innerNodeHeight / 2}
                                    x={-innerNodeWidth / 2}
                                    fill="#272b4d"
                                    stroke={
                                      node.data.children ? '#03c0dc' : '#26deb0'
                                    }
                                    strokeWidth={1}
                                    strokeDasharray={
                                      !node.data.children ? '2,2' : '0'
                                    }
                                    strokeOpacity={
                                      !node.data.children ? 0.6 : 1
                                    }
                                    rx={!node.data.children ? 10 : 0}
                                    onClick={() => {
                                      // eslint-disable-next-line no-param-reassign
                                      node.data.isExpanded = !node.data
                                        .isExpanded;
                                      this.props.setAssetId(
                                        node.data.node.rootAssetId,
                                        node.data.node.id
                                      );
                                      this.forceUpdate();
                                    }}
                                  />
                                )}
                                <Text
                                  dy=".33em"
                                  fontSize={9}
                                  textAnchor="middle"
                                  style={{ pointerEvents: 'none' }}
                                  fill={color}
                                >
                                  {node.data.name}
                                </Text>
                              </Group>
                            );
                          })}
                        </Group>
                      )}
                    </Tree>
                  </Group>
                </svg>
                <div className="controls">
                  <Button
                    onClick={() => zoom.scale({ scaleX: 1.2, scaleY: 1.2 })}
                  >
                    +
                  </Button>
                  <Button
                    onClick={() => zoom.scale({ scaleX: 0.8, scaleY: 0.8 })}
                  >
                    -
                  </Button>
                  <Button onClick={zoom.center}>Center</Button>
                  <Button onClick={zoom.reset}>Reset</Button>
                  <Button onClick={zoom.clear}>Clear</Button>
                </div>
              </div>
            );
          }}
        </Zoom>
      </Wrapper>
    );
  }
}

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
)(TreeViewer);
