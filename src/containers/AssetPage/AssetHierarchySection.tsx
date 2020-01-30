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
import LoadingWrapper from 'components/LoadingWrapper';
import {
  loadParentRecurse,
  loadAssetChildren,
  AssetsState,
} from '../../modules/assets';
import { RootState } from '../../reducers/index';
import { trackUsage } from '../../utils/Metrics';

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

type OwnProps = {
  asset: Asset;
  onAssetClicked: (assetId: number) => void;
};
type StateProps = {
  assets: AssetsState;
};
type DispatchProps = {
  loadAssetChildren: typeof loadAssetChildren;
  loadParentRecurse: typeof loadParentRecurse;
};

type Props = StateProps & DispatchProps & OwnProps;

type State = {
  controls: 'cartesian' | 'polar';
  orientation: 'horizontal' | 'vertical';
  linkType: 'diagonal' | 'step' | 'curve' | 'line';
  length: number;
  data?: Node;
  forceRerender: boolean;
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
      forceRerender: false,
    };
  }

  componentDidMount() {
    const { asset } = this.props;

    const { nodes, length } = this.getData();
    if (length !== this.state.length) {
      this.setState({ data: nodes, length });
    }

    if (asset.id !== asset.rootId && asset.parentId) {
      this.props.loadParentRecurse(asset.parentId, asset.rootId!);
    }
    this.props.loadAssetChildren(asset.id);
  }

  componentDidUpdate(prevProps: Props) {
    const { asset } = this.props;

    if (asset.id !== prevProps.asset.id) {
      this.componentDidMount();
    }

    const { nodes, length } = this.getData();
    if (length !== this.state.length) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ data: nodes, length });
    }
  }

  getData = () => {
    const {
      assets: { items },
      asset,
    } = this.props;
    let nodes: Node | undefined;
    let length = 0;
    let currentAssetId: number | undefined = asset.id;
    let currentAssetNode: Node | undefined;
    do {
      if (currentAssetId && items[currentAssetId]) {
        length += 1;
        nodes = {
          name: items[currentAssetId].name || `${items[currentAssetId].id}`,
          node: items[currentAssetId],
          children: nodes ? [nodes] : undefined,
        };
        if (!nodes.children) {
          currentAssetNode = nodes;
          currentAssetNode.children = [];
        }
        if (currentAssetId === asset.rootId) {
          break;
        }
        currentAssetId = items[currentAssetId!].parentId;
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
    Object.values(items)
      .filter(el => el.parentId === asset.id)
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
  };

  renderControlSection = () => {
    const { controls, orientation, linkType } = this.state;
    return (
      <div className="selector">
        <strong>Layout:</strong>
        <Select
          onChange={(value: 'cartesian' | 'polar') => {
            this.setState({ controls: value, forceRerender: true }, () => {
              this.setState({ forceRerender: false });
            });
            trackUsage('AssetPage.HerarchySection.ChangeControl', {
              layout: value,
            });
          }}
          value={controls}
        >
          <Select.Option value="cartesian">cartesian</Select.Option>
          <Select.Option value="polar">polar</Select.Option>
        </Select>

        <strong>Orientation:</strong>
        <Select
          onChange={(value: 'vertical' | 'horizontal') => {
            this.setState({ orientation: value });
            trackUsage('AssetPage.HerarchySection.ChangeControl', {
              orientation: value,
            });
          }}
          value={orientation}
          disabled={controls === 'polar'}
        >
          <Select.Option value="vertical">vertical</Select.Option>
          <Select.Option value="horizontal">horizontal</Select.Option>
        </Select>

        <strong>Link:</strong>
        <Select
          onChange={(value: 'diagonal' | 'step' | 'curve' | 'line') => {
            this.setState({ linkType: value });
            trackUsage('AssetPage.HerarchySection.ChangeControl', {
              linkType: value,
            });
          }}
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

  renderGraph = () => {
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

    const { controls, orientation, linkType, data: nodeData } = this.state;

    const innerWidth = origWidth - margin.left - margin.right;
    const innerHeight = origHeight - margin.top - margin.bottom;

    let origin: {
      x: number;
      y: number;
    };
    let sizeWidth: number;
    let sizeHeight: number;

    if (controls === 'polar') {
      origin = {
        x: innerWidth / 2 + margin.left,
        y: innerHeight / 2 + margin.top,
      };
      sizeWidth = 2 * Math.PI;
      sizeHeight = Math.min(innerWidth, innerHeight) / 2;
    } else {
      origin = { x: margin.left, y: margin.top };
      if (orientation === 'vertical') {
        sizeWidth = innerWidth;
        sizeHeight = innerHeight;
      } else {
        sizeWidth = innerHeight;
        sizeHeight = innerWidth;
      }
    }

    return (
      <Zoom
        width={origWidth}
        height={origHeight}
        scaleXMin={1 / 2}
        scaleXMax={4}
        scaleYMin={1 / 2}
        scaleYMax={4}
        transformMatrix={{
          scaleX: 1.27,
          scaleY: 1.27,
          translateX: origin.x,
          translateY: origin.y,
          skewX: 0,
          skewY: 0,
        }}
      >
        {(zoom: any) => {
          return (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
              }}
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
                    root={hierarchy(nodeData!, d =>
                      d.isExpanded ? null : d.children
                    )}
                    size={[sizeWidth, sizeHeight]}
                    separation={(a: any, b: any) =>
                      (a.parent === b.parent ? 1 : 0.5) / a.depth
                    }
                  >
                    {(data: any) => (
                      <Group top={origin.y ? 0 : 0} left={origin.x ? 0 : 0}>
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
                          const innerNodeWidth = 8 * node.data.node.name.length;
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
                                <rect
                                  height={innerNodeHeight}
                                  width={innerNodeWidth}
                                  y={-innerNodeHeight / 2}
                                  x={-innerNodeWidth / 2}
                                  r={12}
                                  fill="url('#lg')"
                                  onClick={() => {
                                    trackUsage(
                                      'AssetPage.HerarchySection.AssetClicked',
                                      {
                                        assetId: node.data.node.id,
                                      }
                                    );
                                    this.props.onAssetClicked(
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
                                  strokeOpacity={!node.data.children ? 0.6 : 1}
                                  rx={!node.data.children ? 10 : 0}
                                  onClick={() => {
                                    // eslint-disable-next-line no-param-reassign
                                    node.data.isExpanded = !node.data
                                      .isExpanded;
                                    trackUsage(
                                      'AssetPage.HerarchySection.AssetClicked',
                                      {
                                        assetId: node.data.node.id,
                                      }
                                    );
                                    this.props.onAssetClicked(
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
                <Button
                  onClick={() => {
                    zoom.center();
                    trackUsage('AssetPage.HerarchySection.ControlsClicked', {
                      center: true,
                    });
                  }}
                >
                  Center
                </Button>
                <Button
                  onClick={() => {
                    zoom.reset();
                    trackUsage('AssetPage.HerarchySection.ControlsClicked', {
                      reset: true,
                    });
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    zoom.clear();
                    trackUsage('AssetPage.HerarchySection.ControlsClicked', {
                      clear: true,
                    });
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          );
        }}
      </Zoom>
    );
  };

  render() {
    const { data, forceRerender } = this.state;
    let renderedItem = (
      <LoadingWrapper>
        <p>Loading Hierarchy Chart...</p>
      </LoadingWrapper>
    );
    if (!forceRerender && data && this.wrapperRef.current) {
      renderedItem = this.renderGraph();
    }
    return <Wrapper ref={this.wrapperRef}>{renderedItem}</Wrapper>;
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    assets: state.assets,
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
)(TreeViewer);
