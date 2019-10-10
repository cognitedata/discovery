import React from 'react';
import { connect } from 'react-redux';
import { Button, Icon, Layout } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import {
  Responsive,
  WidthProvider,
  Layout as GridLayout,
} from 'react-grid-layout';
import { push } from 'connected-react-router';
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
  selectApp,
  setAssetId,
  resetAppState,
  setModelAndRevisionAndNode,
  setAppDataKit,
  setAppCurrentPage,
} from '../modules/app';
import AssetViewer, { ViewerType, ViewerTypeMap } from './AssetViewer';
import { sdk } from '../index';
import { trackUsage } from '../utils/metrics';
import ComponentSelector from '../components/ComponentSelector';
import Sidebar from './Sidebar';
import { selectDatakit, DataKitState } from '../modules/datakit';

const LAYOUT_LOCAL_STORAGE = 'layout';

interface DiscoveryLayout extends GridLayout {
  viewType: ViewerType;
}

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const CustomGridLayout = styled(ResponsiveReactGridLayout)<{
  editable: boolean;
}>`
  position: relative;
  flex: 1;
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
    left: 374px;
    bottom: 68px;
    z-index: 1000;
  }
`;
const EditButton = styled(Button)`
  && {
    position: absolute;
    left: 374px;
    bottom: 24px;
    z-index: 1000;
  }
`;
const NextButton = styled(Button)`
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
  datakit: DataKitState;
  threed: ThreeDState;
  app: AppState;
  assets: AssetsState;
  doFetchRevisions: typeof fetchRevisions;
  fetchModels: typeof fetchModels;
  doFetchTypes: typeof fetchTypes;
  setAssetId: typeof setAssetId;
  setModelAndRevisionAndNode: typeof setModelAndRevisionAndNode;
  resetAppState: typeof resetAppState;
  setAppDataKit: typeof setAppDataKit;
  setAppCurrentPage: typeof setAppCurrentPage;
  push: typeof push;
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
    this.props.doFetchTypes();

    this.checkAndFixURL();

    this.props.fetchModels();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);

    this.props.setAppCurrentPage(1);
  }

  componentDidUpdate() {
    this.checkAndFixURL();
  }

  checkAndFixURL = () => {
    // const {
    //   match: {
    //     params: { rootAssetId, assetId },
    //   },
    // } = this.props;
    // if (assetId || rootAssetId) {
    //   const asset = this.props.assets.all[Number(assetId || rootAssetId)];
    //   if (asset && Number(asset.rootId) !== Number(rootAssetId)) {
    //     this.onAssetIdChange(asset.rootId, asset.id);
    //   }
    // }
    const {
      match: {
        params: { datakit },
      },
      datakit: dataKitStore,
      app: { datakit: currentAppDataKit, tenant },
    } = this.props;
    if (datakit !== currentAppDataKit && datakit && dataKitStore[datakit]) {
      this.props.setAppDataKit(datakit);
    } else if (!dataKitStore[currentAppDataKit || datakit]) {
      this.props.push(`/${tenant}/datakits`);
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

  changeEdit = () => {
    const { editLayout } = this.state;
    trackUsage('Main.LayoutEdit', { edit: !editLayout });
    this.setState({
      editLayout: !editLayout,
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
    const { tenant, datakit } = this.props.app;
    return (
      <Layout style={{ display: 'flex' }}>
        <Sidebar />
        <CustomGridLayout
          editable={editLayout}
          ref={this.gridRef}
          className="layout"
          rowHeight={30}
          style={{ height: '100%', overflow: 'auto' }}
          cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
          onLayoutChange={this.onLayoutChange}
          onDragStart={() => {
            return editLayout;
          }}
        >
          {layout.map((el, i) => (
            <div key={el.i} data-grid={el} style={{ position: 'relative' }}>
              {editLayout && (
                <DraggingView>
                  <div>
                    <Icon className="big" type="drag" />
                    <h2>{ViewerTypeMap[el.viewType]}</h2>
                    <p>
                      Resize by dragging the bottom right corner, drag around
                      each component to make your own layout
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
                      layout: [...layout.slice(0, i), ...layout.slice(i + 1)],
                    });
                  }}
                />
              )}
            </div>
          ))}
        </CustomGridLayout>
        {editLayout && (
          <AddButton
            shape="round"
            icon="plus"
            size="large"
            onClick={this.onAddComponent}
          >
            Add Layout
          </AddButton>
        )}
        <EditButton
          shape="round"
          icon="edit"
          size="large"
          onClick={() => this.changeEdit()}
        >
          {editLayout ? 'Done' : 'Edit Layout'}
        </EditButton>
        <NextButton
          type="primary"
          shape="round"
          icon="edit"
          size="large"
          onClick={() =>
            this.props.push(`/${tenant}/datakits/${datakit}/verify`)
          }
        >
          Finished Discovery
        </NextButton>
      </Layout>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    threed: selectThreeD(state),
    datakit: selectDatakit(state),
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
      push,
      setAppDataKit,
      setAppCurrentPage,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
