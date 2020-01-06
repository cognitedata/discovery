import React from 'react';
import { connect } from 'react-redux';
import { Layout, Switch, Button, Icon } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import {
  Responsive,
  WidthProvider,
  Layout as GridLayout,
} from 'react-grid-layout';
import { fetchTypes } from '../modules/types';
import {
  selectThreeD,
  ThreeDState,
  fetchRevisions,
  fetchModels,
} from '../modules/threed';
import { selectAssets, AssetsState } from '../modules/assets';
import { RootState } from '../reducers/index';
import {
  AppState,
  selectAppState,
  setAssetId,
  resetAppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetViewer, { ViewerType, ViewerTypeMap } from './AssetViewer';
import TimeseriesPreview from './TimeseriesPreview';
import { sdk } from '../index';
import { trackUsage } from '../utils/metrics';
import ComponentSelector from '../components/ComponentSelector';
import { checkForAccessPermission } from '../utils/utils';

const LAYOUT_LOCAL_STORAGE = 'layout';

interface DiscoveryLayout extends GridLayout {
  viewType: ViewerType;
}

const ResponsiveReactGridLayout = WidthProvider(Responsive);

// 13FV1234 is useful asset
const { Content, Header } = Layout;

const StyledHeader = styled(Header)`
  && {
    background-color: rgba(0, 0, 0, 0);
    z-index: 100;
    padding-left: 24px;
    background: #343434;
  }
  && button {
    margin-right: 12px;
  }
`;

type LayoutProps = {
  editable: boolean;
};

const CustomGridLayout = styled(ResponsiveReactGridLayout)<LayoutProps>`
  position: relative;
  .react-grid-item {
    padding: 12px;
    background: #fff;
  }

  .react-resizable-handle {
    z-index: 1001;
    display: ${props => (props.editable ? 'block' : 'none')};
  }
`;

const DraggingView = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #ffffffdd;
  z-index: 1000;
  display: flex;
  flex-direction: row;

  && > div {
    text-align: center;
    align-self: center;
    margin: 0 auto;
  }
  && i.big svg {
    height: 36px;
    width: 36px;
    margin-bottom: 12px;
  }

  &&:hover {
    cursor: move;
  }
`;

const AddButton = styled(Button)`
  && {
    position: absolute;
    right: 24px;
    bottom: 24px;
    z-index: 1000;
  }
`;
const DeleteButton = styled(Button)`
  && {
    position: absolute;
    right: -6px;
    top: -6px;
    z-index: 1001;
  }
`;

type Props = {
  match: any;
  history: any;
  location: any;
  threed: ThreeDState;
  app: AppState;
  assets: AssetsState;
  doFetchRevisions: typeof fetchRevisions;
  fetchModels: typeof fetchModels;
  doFetchTypes: typeof fetchTypes;
  setAssetId: typeof setAssetId;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  resetAppState: typeof resetAppState;
};

type State = {
  editLayout: boolean;
  layout: DiscoveryLayout[];
};

class Main extends React.Component<Props, State> {
  gridRef = React.createRef<Responsive>();

  constructor(props: Props) {
    super(props);

    const layoutString = localStorage.getItem(LAYOUT_LOCAL_STORAGE);
    let layout: DiscoveryLayout[] = [];
    if (layoutString) {
      const parsed = JSON.parse(layoutString);
      if (parsed && parsed.length && parsed.length > 0) {
        layout = JSON.parse(layoutString).filter(
          (el: any) =>
            el.x !== undefined &&
            el.y !== undefined &&
            el.w !== undefined &&
            el.h !== undefined &&
            el.i !== undefined &&
            el.viewType !== undefined
        );
      }
      localStorage.removeItem(LAYOUT_LOCAL_STORAGE);
    }

    trackUsage('App Started', {
      project: sdk.project,
      reinitializeLayout: layout.length === 0,
    });

    if (layout.length === 0) {
      layout = [
        {
          i: '0',
          x: 0,
          y: 0,
          w: 2,
          h: 31,
          viewType: 'none',
        },
        {
          i: '1',
          x: 2,
          y: 0,
          w: 2,
          h: 31,
          viewType: 'none',
        },
      ];
    }

    this.state = {
      editLayout: false,
      layout,
    };
  }

  componentDidMount() {
    this.checkAndFixURL();

    checkForAccessPermission(this.props.app.groups, 'assetsAcl', 'READ');

    this.props.fetchModels();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
  }

  componentDidUpdate() {
    this.checkAndFixURL();
  }

  checkAndFixURL = () => {
    const {
      match: {
        params: { rootAssetId, assetId },
      },
    } = this.props;
    if (assetId || rootAssetId) {
      const asset = this.props.assets.all[Number(assetId || rootAssetId)];
      if (asset && Number(asset.rootId) !== Number(rootAssetId)) {
        this.onAssetIdChange(asset.rootId, asset.id);
      }
    }
  };

  onAssetIdChange = (rootAssetId?: number, assetId?: number) => {
    if (rootAssetId) {
      this.props.setAssetId(rootAssetId, assetId || rootAssetId);
    } else {
      this.props.resetAppState();
    }
  };

  onAddComponent = () => {
    trackUsage('Main.ComponentedAdded');
    const i =
      this.state.layout.reduce((prev, el) => Math.max(Number(el.i), prev), 0) +
      1;
    this.setState(state => ({
      // Add a new item. It must have a unique key!
      layout: state.layout.concat([
        {
          static: false,
          isDraggable: true,
          isResizable: true,
          i: `${i}`,
          x: (state.layout.length * 2) % 4,
          y: Infinity, // puts it at the bottom
          w: 2,
          h: 8,
          viewType: 'none',
        },
      ]),
    }));
  };

  changeEdit = (edit = false) => {
    trackUsage('Main.LayoutEdit', { edit });
    this.setState({
      editLayout: edit,
    });
  };

  onLayoutChange = (newLayout: DiscoveryLayout[]) => {
    const layout = newLayout.map(el => ({
      ...el,
      viewType: this.state.layout.find(it => it.i === el.i)!.viewType,
    }));
    this.setState({ layout });
    // Track usage where the size has changed.
    trackUsage('Main.LayoutSizeChange', {
      layoutChanged: newLayout.filter(el => {
        const orig = this.state.layout.find(it => it.i === el.i)!;
        return (
          orig.x !== el.x ||
          orig.y !== el.y ||
          orig.w !== el.w ||
          orig.h !== el.h
        );
      }),
    });
    localStorage.setItem(LAYOUT_LOCAL_STORAGE, JSON.stringify(layout));

    // Fix weird layout issue
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);
    return true;
  };

  changeLayoutType = (type: ViewerType, index: string) => {
    const { layout } = this.state;
    const newArray = [...layout];
    const arrayItem = newArray.find(item => item.i === index);
    if (arrayItem) {
      arrayItem.viewType = type;
      trackUsage('Main.LayoutTypeChange', { layout: arrayItem, type });
      this.setState({ layout: newArray }, () => {
        localStorage.setItem(LAYOUT_LOCAL_STORAGE, JSON.stringify(newArray));
      });
    }
  };

  render() {
    const { layout, editLayout } = this.state;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <TimeseriesPreview />
        <Layout>
          <Layout>
            <Content
              style={{
                display: 'flex',
                height: '100vh',
                flexDirection: 'column',
              }}
            >
              <StyledHeader>
                <Switch
                  checked={editLayout}
                  checkedChildren="Edit ON"
                  unCheckedChildren="Edit OFF"
                  onChange={this.changeEdit}
                />
                <a
                  style={{ float: 'right', color: '#fff' }}
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://docs.cognite.com/discovery/blog/releasenotes.html"
                >
                  v{process.env.REACT_APP_VERSION}
                </a>
              </StyledHeader>
              <CustomGridLayout
                editable={editLayout}
                ref={this.gridRef}
                className="layout"
                rowHeight={30}
                cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
                onLayoutChange={this.onLayoutChange}
                onDragStart={() => {
                  return editLayout;
                }}
              >
                {layout.map((el, i) => (
                  <div
                    key={el.i}
                    data-grid={el}
                    style={{ position: 'relative' }}
                  >
                    {editLayout && (
                      <DraggingView>
                        <div>
                          <Icon className="big" type="drag" />
                          <h2>{ViewerTypeMap[el.viewType]}</h2>
                          <p>
                            Resize by dragging the bottom right corner, drag
                            around each component to make your own layout
                          </p>
                          <ComponentSelector
                            onComponentChange={(viewType: ViewerType) => {
                              this.changeLayoutType(viewType, el.i!);
                            }}
                          />
                        </div>
                      </DraggingView>
                    )}
                    <AssetViewer
                      type={el.viewType}
                      onComponentChange={(type: ViewerType) => {
                        this.changeLayoutType(type, el.i!);
                      }}
                    />
                    {editLayout && (
                      <DeleteButton
                        type="primary"
                        shape="circle"
                        icon="close-circle"
                        size="small"
                        onClick={() => {
                          trackUsage('Component Deleted', {
                            type: layout[i].viewType,
                          });
                          this.setState({
                            layout: [
                              ...layout.slice(0, i),
                              ...layout.slice(i + 1),
                            ],
                          });
                        }}
                      />
                    )}
                  </div>
                ))}
              </CustomGridLayout>
              {editLayout && (
                <AddButton
                  type="primary"
                  shape="round"
                  icon="plus"
                  size="large"
                  onClick={this.onAddComponent}
                >
                  Add Layout
                </AddButton>
              )}
            </Content>
          </Layout>
        </Layout>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTypes: fetchTypes,
      doFetchRevisions: fetchRevisions,
      fetchModels,
      setAssetId,
      setModelAndRevisionAndNode,
      resetAppState,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Main);
