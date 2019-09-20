import React from 'react';
import { connect } from 'react-redux';
import { Layout, Switch, Radio, Button } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import { Asset } from '@cognite/sdk';
import {
  Responsive,
  WidthProvider,
  Layout as GridLayout,
} from 'react-grid-layout';
import { fetchTypes } from '../modules/types';
import {
  fetchModels,
  selectThreeD,
  ThreeDState,
  fetchRevisions,
} from '../modules/threed';
import { selectAssets, AssetsState } from '../modules/assets';
import { RootState } from '../reducers/index';
import ModelList from './ModelList';
import AssetSearchComponent from './AssetSearchComponent';
import AssetDrawer from './Sidebar/SidebarAssetView';
import NodeDrawer from './Sidebar/SidebarNodeView';

import {
  AppState,
  selectApp,
  setAssetId,
  resetAppState,
  setModelAndRevisionAndNode,
} from '../modules/app';
import AssetViewer, { ViewerType } from './AssetViewer';

const LAYOUT_LOCAL_STORAGE = 'layout';

interface DiscoveryLayout extends GridLayout {
  viewType: ViewerType;
}

const ResponsiveReactGridLayout = WidthProvider(Responsive);

// 13FV1234 is useful asset
const { Content, Header, Sider } = Layout;

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

const RootSelector = styled(Radio.Group)`
  && {
    margin: 12px;
    margin-bottom: 0px;
    display: flex;
  }
  && > * {
    flex: 1;
  }
`;

const AssetSectionWrapper = styled.div`
  margin-top: 16px;
  margin-left: 12px;
  margin-right: 12px;

  .content-section {
    margin-top: 12px;
  }
`;

const CustomGridLayout = styled(ResponsiveReactGridLayout)<{
  editable: boolean;
}>`
  position: relative;
  .react-grid-item {
    padding: 12px;
    background: #fff;
  }

  .react-resizable-handle {
    display: ${props => (props.editable ? 'block' : 'none')};
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
    z-index: 1000;
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
  doFetchTypes: typeof fetchTypes;
  doFetchModels: typeof fetchModels;
  setAssetId: typeof setAssetId;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  resetAppState: typeof resetAppState;
};

type State = {
  editLayout: boolean;
  layout: DiscoveryLayout[];
  selectedPane: string;
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
      selectedPane: 'asset',
      editLayout: false,
      layout,
    };
  }

  componentDidMount() {
    this.props.doFetchTypes();
    if (!this.props.threed.loading) {
      this.props.doFetchModels();
    }

    this.checkAndFixURL();

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

  hasModelForAsset = (assetId: number) => {
    return this.props.threed.representsAsset[assetId];
  };

  renderSidebar = () => {
    const {
      app: { assetId, rootAssetId },
      assets,
    } = this.props;
    const asset = assets.all[Number(assetId)];
    return (
      <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          background: 'rgb(255,255,255)',
        }}
        width={350}
      >
        <RootSelector
          onChange={el => this.setState({ selectedPane: el.target.value })}
          value={this.state.selectedPane}
        >
          <Radio.Button value="asset">Assets</Radio.Button>
          <Radio.Button value="3d">3D Models</Radio.Button>
        </RootSelector>
        {this.state.selectedPane === 'asset' ? (
          <>
            <AssetSectionWrapper>
              <AssetSearchComponent
                rootAsset={
                  rootAssetId ? this.props.assets.all[rootAssetId] : undefined
                }
                onAssetClicked={(selectedAsset: Asset) =>
                  this.onAssetIdChange(selectedAsset.rootId, selectedAsset.id)
                }
              />
              <div className="content-section">
                {asset && <AssetDrawer />}
                {!asset && <NodeDrawer />}
              </div>
            </AssetSectionWrapper>
          </>
        ) : (
          <ModelList />
        )}
      </Sider>
    );
  };

  onAddComponent = () => {
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
    localStorage.setItem(LAYOUT_LOCAL_STORAGE, JSON.stringify(layout));
    return true;
  };

  render() {
    const { layout, editLayout } = this.state;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            {this.renderSidebar()}
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
              </StyledHeader>
              <CustomGridLayout
                editable={editLayout}
                ref={this.gridRef}
                className="layout"
                rowHeight={30}
                cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
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
                    <AssetViewer
                      type={el.viewType}
                      onComponentChange={(type: ViewerType) => {
                        const newArray = [...layout];
                        const arrayItem = newArray.find(
                          item => item.i === el.i
                        );
                        if (arrayItem) {
                          arrayItem.viewType = type;
                          this.setState({ layout: newArray }, () => {
                            localStorage.setItem(
                              LAYOUT_LOCAL_STORAGE,
                              JSON.stringify(newArray)
                            );
                          });
                        }
                      }}
                    />
                    {editLayout && (
                      <DeleteButton
                        type="primary"
                        shape="circle"
                        icon="close-circle"
                        size="small"
                        onClick={() => {
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
    app: selectApp(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTypes: fetchTypes,
      doFetchRevisions: fetchRevisions,
      doFetchModels: fetchModels,
      setAssetId,
      setModelAndRevisionAndNode,
      resetAppState,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
