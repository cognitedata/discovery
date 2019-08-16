import React from 'react';
import { connect } from 'react-redux';
import { Layout, Switch } from 'antd';
import { Route } from 'react-router-dom';
import { Revision3D } from '@cognite/sdk';
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
  ThreeDModel,
  fetchRevisions,
} from '../modules/threed';
import { selectAssets, AssetsState, ExtendedAsset } from '../modules/assets';
import { RootState } from '../reducers/index';

// 13FV1234 is useful asset
const { Content, Header, Sider } = Layout;

const StyledHeader = styled(Header)`
  && {
    background-color: rgba(0, 0, 0, 0);
    float: right;
    position: fixed;
    right: '0';
    top: '0';
    z-index: 100;
  }
`;

function stringToBool(str: string) {
  return str === 'true';
}

interface TBDRevision extends Revision3D {
  metadata?: { [key: string]: any };
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
  };

  viewer = React.createRef<AssetViewerComponent>();

  isLoading = false;

  componentDidMount() {
    this.props.doFetchTypes();
    this.props.doFetchModels();
    // Another workaround for a bug in SVGViewer
    if (this.state.showPNID) {
      this.setState({ showPNID: false });
      setTimeout(() => {
        this.setState({ showPNID: true });
      }, 500);
    }
  }

  onAssetClick = (asset: ExtendedAsset, query?: string) => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${asset.id}`,
      search: `?query=${query}`,
    });
  };

  onAssetIdChange = (rootAssetId: number, assetId: number) => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${rootAssetId}/${assetId}`,
    });
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
    const asset = this.props.assets.all[assetId];
    const representedByMap: {
      [key: string]: { model: ThreeDModel; revision: Revision3D }[];
    } = {};
    const { models } = this.props.threed;
    Object.keys(models).forEach(modelId => {
      const model = models[modelId];
      if (!model.revisions) {
        return;
      }

      model.revisions.forEach((revision: TBDRevision) => {
        if (revision.metadata!.representsAsset) {
          const { representsAsset } = revision.metadata!;
          if (representedByMap[representsAsset] === undefined) {
            representedByMap[representsAsset] = [];
          }
          representedByMap[representsAsset].push({
            model,
            revision,
          });
        }
      });
    });
    if (asset) {
      const modelsForAsset = representedByMap[asset.rootId!];
      if (!modelsForAsset || modelsForAsset.length === 0) {
        return null;
      }
      return representedByMap[asset.rootId!][0];
    }
    return null;
  };

  render() {
    let model3D: any;
    let assetId;
    if (this.viewer && this.viewer.current) {
      model3D = this.hasModelForAsset(
        this.viewer.current!.props.assetId ||
          this.viewer.current!.props.rootAssetId
      );
      ({ assetId } = this.viewer.current!.props);
    }

    const { match, location } = this.props;
    const assetDrawerWidth = 350;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            <Sider
              style={{
                overflow: 'auto',
                height: '100vh',
                background: 'rgb(255,255,255)',
              }}
              width={250}
            >
              <AssetSearch
                location={location}
                onAssetClick={this.onAssetClick}
                assetId={Number(assetId)}
              />
            </Sider>
            <Content>
              <StyledHeader>
                <div style={{ paddingRight: assetDrawerWidth - 30 }}>
                  <Switch
                    checked={model3D != null && this.state.show3D}
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
                </div>
              </StyledHeader>
              <Route
                path={`${match.url}/asset/:rootAssetId`}
                exact
                render={props => {
                  return (
                    <AssetViewer
                      rootAssetId={Number(props.match.params.rootAssetId)}
                      model3D={
                        model3D
                          ? {
                              modelId: model3D.model.id,
                              revisionId: model3D.revision.id,
                            }
                          : undefined
                      }
                      show3D={model3D != null && this.state.show3D}
                      showAssetViewer={this.state.showAssetViewer}
                      showPNID={this.state.showPNID}
                      onAssetIdChange={this.onAssetIdChange}
                      assetDrawerWidth={assetDrawerWidth}
                      ref={this.viewer}
                    />
                  );
                }}
              />
              <Route
                path={`${match.url}/asset/:rootAssetId/:assetId`}
                exact
                render={props => {
                  return (
                    <AssetViewer
                      assetId={Number(props.match.params.assetId)}
                      rootAssetId={Number(props.match.params.rootAssetId)}
                      model3D={
                        model3D
                          ? {
                              modelId: model3D.model.id,
                              revisionId: model3D.revision.id,
                            }
                          : undefined
                      }
                      show3D={model3D != null && this.state.show3D}
                      showAssetViewer={this.state.showAssetViewer}
                      showPNID={this.state.showPNID}
                      onAssetIdChange={this.onAssetIdChange}
                      assetDrawerWidth={assetDrawerWidth}
                      ref={this.viewer}
                    />
                  );
                }}
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
