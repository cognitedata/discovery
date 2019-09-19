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

const CustomGridLayout = styled(ResponsiveReactGridLayout)`
  position: relative;
  .react-grid-item {
    padding: 12px;
    background: #fff;
  }
`;

const AddButton = styled(Button)`
  && {
    position: absolute;
    right: 24px;
    bottom: 24px;
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
  layout: GridLayout[];
  selectedPane: string;
};

class Main extends React.Component<Props, State> {
  gridRef = React.createRef<Responsive>();

  constructor(props: Props) {
    super(props);

    const layoutString = localStorage.getItem('layout');
    let layout = [{ i: '0', x: 0, y: 0, w: 1, h: 2, static: false }];
    if (layoutString && JSON.parse(layoutString)) {
      layout = JSON.parse(layoutString);
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
    this.setState(state => ({
      // Add a new item. It must have a unique key!
      layout: state.layout.concat([
        {
          static: false,
          i: `${state.layout.length}`,
          x: (state.layout.length * 2) % 4,
          y: Infinity, // puts it at the bottom
          w: 2,
          h: 2,
        },
      ]),
    }));
  };

  onLayoutChange = (layout: GridLayout[]) => {
    this.setState({ layout });
    localStorage.setItem('layout', JSON.stringify(layout));
  };

  renderComponent = (el: GridLayout) => {
    return (
      <div key={el.i} data-grid={el}>
        <pre>{JSON.stringify(el, null, 2)}</pre>
      </div>
    );
  };

  render() {
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
                  checked={this.state.editLayout}
                  checkedChildren="Edit Layout"
                  unCheckedChildren="3D"
                  onChange={() =>
                    this.setState(state => ({ editLayout: !state.editLayout }))
                  }
                />
              </StyledHeader>
              <CustomGridLayout
                ref={this.gridRef}
                className="layout"
                rowHeight={30}
                cols={{ lg: 4, sm: 2, xs: 1 }}
                onLayoutChange={this.onLayoutChange}
              >
                {this.state.layout.map(el => this.renderComponent(el))}
              </CustomGridLayout>
              <AddButton
                type="primary"
                shape="round"
                icon="plus"
                size="large"
                onClick={this.onAddComponent}
              >
                Add Layout
              </AddButton>
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
