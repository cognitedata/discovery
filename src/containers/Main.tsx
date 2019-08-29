import React from 'react';
import { connect } from 'react-redux';
import { Layout, Switch, Button, Radio } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import AssetSearch from './AssetSearch';
import {
  AssetViewer as AssetViewerComponent,
  // eslint-disable-next-line import/no-named-default
  default as AssetViewer,
} from './AssetViewer';
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

const BackButton = styled(Button)`
  margin-top: 12px;
  margin-left: 12px;
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

function stringToBool(str: string) {
  return str === 'true';
}

type Props = {
  match: any;
  history: any;
  location: any;
  threed: ThreeDState;
  assets: AssetsState;
  doFetchRevisions: typeof fetchRevisions;
  doFetchTypes: typeof fetchTypes;
  doFetchModels: typeof fetchModels;
};

type State = {
  showAssetViewer: boolean;
  show3D: boolean;
  showPNID: boolean;
  selectedPane: string;
};

class Main extends React.Component<Props, State> {
  state = {
    show3D: localStorage.getItem('show3D')
      ? stringToBool(localStorage.getItem('show3D')!)
      : true,
    showPNID: localStorage.getItem('showPNID')
      ? stringToBool(localStorage.getItem('showPNID')!)
      : true,
    showAssetViewer: localStorage.getItem('showAssetViewer')
      ? stringToBool(localStorage.getItem('showAssetViewer')!)
      : true,
    selectedPane: 'asset',
  };

  viewer = React.createRef<AssetViewerComponent>();

  isLoading = false;

  componentDidMount() {
    this.props.doFetchTypes();
    if (!this.props.threed.loading) {
      this.props.doFetchModels();
    }
    // Another workaround for a bug in SVGViewer
    if (this.state.showPNID) {
      this.setState({ showPNID: false });
      setTimeout(() => {
        this.setState({ showPNID: true });
      }, 500);
    }

    this.checkAndFixRootId();
  }

  componentDidUpdate() {
    this.checkAndFixRootId();
  }

  get modelId() {
    const {
      match: {
        params: { modelId, rootAssetId },
      },
      threed,
    } = this.props;

    return (
      modelId ||
      (threed.representsAsset[rootAssetId] &&
        threed.representsAsset[rootAssetId].modelId)
    );
  }

  get revisionId() {
    const {
      match: {
        params: { revisionId, rootAssetId },
      },
      threed,
    } = this.props;

    return (
      revisionId ||
      (threed.representsAsset[rootAssetId] &&
        threed.representsAsset[rootAssetId].revisionId)
    );
  }

  checkAndFixRootId = () => {
    const {
      match: {
        params: { assetId, rootAssetId },
      },
    } = this.props;
    if (assetId || rootAssetId) {
      const asset = this.props.assets.all[Number(assetId || rootAssetId)];
      if (asset && Number(asset.rootId) !== Number(rootAssetId)) {
        this.onAssetIdChange(asset.rootId, asset.id);
      }
    }
  };

  onNodeIdChange = (nodeId?: number) => {
    const {
      match: {
        params: { tenant },
      },
      history,
    } = this.props;
    const { modelId, revisionId } = this;
    if (modelId && revisionId) {
      history.push({
        pathname: `/${tenant}/models/${modelId}/${revisionId}${
          nodeId ? `/${nodeId}` : ''
        }`,
      });
    }
  };

  onAssetIdChange = (
    rootAssetId?: number,
    assetId?: number,
    query?: string
  ) => {
    const {
      match: {
        params: { tenant },
      },
      history,
    } = this.props;
    if (rootAssetId) {
      if (assetId) {
        history.push({
          pathname: `/${tenant}/asset/${rootAssetId}/${assetId}`,
          search: query ? `?query=${query}` : '',
        });
      } else {
        history.push({
          pathname: `/${tenant}/asset/${rootAssetId}/${rootAssetId}`,
          search: query ? `?query=${query}` : '',
        });
      }
    } else {
      history.push({
        pathname: `/${tenant}`,
        search: query ? `?query=${query}` : '',
      });
    }
  };

  on3DVisibleChange = (visible: boolean) => {
    this.setState({ show3D: visible });
    localStorage.setItem('show3D', `${visible}`);
  };

  onPNIDVisibleChange = (visible: boolean) => {
    this.setState({ showPNID: visible });
    localStorage.setItem('showPNID', `${visible}`);
  };

  onAssetViewerChange = (visible: boolean) => {
    this.setState({ showAssetViewer: visible });
    localStorage.setItem('showAssetViewer', `${visible}`);
  };

  hasModelForAsset = (assetId: number) => {
    return this.props.threed.representsAsset[assetId];
  };

  renderSidebar = () => {
    const {
      match: {
        params: { assetId, rootAssetId, tenant },
      },
      location,
    } = this.props;

    let content = (
      <>
        <RootSelector
          onChange={el => this.setState({ selectedPane: el.target.value })}
          value={this.state.selectedPane}
        >
          <Radio.Button value="asset">Assets</Radio.Button>
          <Radio.Button value="3d">3D Models</Radio.Button>
        </RootSelector>
        {this.state.selectedPane === 'asset' ? (
          <AssetSearch
            rootAssetId={rootAssetId && Number(rootAssetId)}
            assetId={assetId && Number(assetId)}
            location={location}
            modelId={this.modelId}
            onAssetIdChange={this.onAssetIdChange}
          />
        ) : (
          <ModelList tenant={tenant} />
        )}
      </>
    );
    if (rootAssetId) {
      content = (
        <>
          <BackButton type="primary" onClick={() => this.onAssetIdChange()}>
            Select Another Root Asset
          </BackButton>
          <AssetSearch
            rootAssetId={rootAssetId && Number(rootAssetId)}
            assetId={assetId && Number(assetId)}
            location={location}
            onAssetIdChange={this.onAssetIdChange}
          />
        </>
      );
    }
    return (
      <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          background: 'rgb(255,255,255)',
        }}
        width={250}
      >
        {content}
      </Sider>
    );
  };

  render() {
    let model3D: { modelId: number; revisionId: number } | undefined;
    const {
      match: {
        params: { assetId, rootAssetId, nodeId },
      },
    } = this.props;

    if (this.viewer && this.viewer.current) {
      if (this.modelId && this.revisionId) {
        model3D = {
          modelId: this.modelId,
          revisionId: this.revisionId,
        };
      }
    }
    const assetDrawerWidth = 350;
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
                  checked={model3D && this.state.show3D}
                  checkedChildren="3D"
                  unCheckedChildren="3D"
                  onChange={this.on3DVisibleChange}
                  disabled={model3D == null}
                />
                <Switch
                  checked={this.state.showPNID}
                  checkedChildren="P&ID"
                  unCheckedChildren="P&ID"
                  onChange={this.onPNIDVisibleChange}
                />
                <Switch
                  checked={this.state.showAssetViewer}
                  checkedChildren="Asset Network Viewer"
                  unCheckedChildren="Asset Network Viewer"
                  onChange={this.onAssetViewerChange}
                />
              </StyledHeader>
              <AssetViewer
                modelId={model3D && Number(model3D.modelId)}
                revisionId={model3D && Number(model3D.revisionId)}
                nodeId={nodeId && Number(nodeId)}
                rootAssetId={rootAssetId && Number(rootAssetId)}
                assetId={assetId && Number(assetId)}
                show3D={model3D !== undefined && this.state.show3D}
                showAssetViewer={this.state.showAssetViewer}
                showPNID={this.state.showPNID}
                onAssetIdChange={this.onAssetIdChange}
                onNodeIdChange={this.onNodeIdChange}
                assetDrawerWidth={assetDrawerWidth}
                ref={this.viewer}
              />
            </Content>
          </Layout>
        </Layout>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
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
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
