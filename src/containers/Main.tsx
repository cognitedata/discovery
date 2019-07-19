import React, { Ref } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Layout, Switch } from 'antd';
import { Route } from 'react-router-dom';
import AssetSearch from '../components/AssetSearch';
import AssetViewer from './AssetViewer';
import { fetchTypes } from '../modules/types';
import { fetchModels, selectThreeD, ThreeDState, ThreeDModel, fetchRevisions } from '../modules/threed';
import { selectAssets, AssetsState, ExtendedAsset } from '../modules/assets';
import { Revision } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { bindActionCreators, Dispatch } from 'redux';
import { AssetViewer as AssetViewerComponent } from './AssetViewer';

// 13FV1234 is useful asset
const { Content, Header, Sider } = Layout;

function stringToBool(string: string) {
  return string === 'true';
}

type Props = {
  match: any;
  history: any;
  location: any;
  threed: ThreeDState;
  assets: AssetsState;
  doFetchRevisions: Function;
  doFetchTypes: Function;
  doFetchModels: Function;
};

type State = {
  show3D: boolean;
  showPNID: boolean;
};

class Main extends React.Component<Props, State> {
  state = {
    show3D: localStorage.getItem('show3D') ? stringToBool(localStorage.getItem('show3D')!) : true,
    showPNID: localStorage.getItem('showPNID') ? stringToBool(localStorage.getItem('showPNID')!) : true
  };

  viewer = React.createRef<AssetViewerComponent>();

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

  onAssetClick = (asset: ExtendedAsset, query: string) => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${asset.id}`,
      search: `?query=${query}`
    });
  };

  onAssetIdChange = (assetId: number) => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${assetId}`
    });
  };

  on3DVisibleChange = (visible: boolean) => {
    this.setState({ show3D: visible });
    localStorage.setItem('show3D', '' + visible);
  };

  onPNIDVisibleChange = (visible: boolean) => {
    this.setState({ showPNID: visible });
    localStorage.setItem('showPNID', '' + visible);
  };

  hasModelForAsset = (assetId: number) => {
    const asset = this.props.assets.all[assetId];
    const representedByMap: {
      [key: string]: { model: ThreeDModel; revision: Revision }[];
    } = {};
    const { models } = this.props.threed;
    Object.keys(models).forEach(modelId => {
      const model = models[modelId];
      if (model.metadata) {
        const { representsAsset } = model.metadata!;
        if (representsAsset) {
          if (representedByMap[representsAsset] === undefined) {
            representedByMap[representsAsset] = [];
          }
          if (model.revisions) {
            const revision = model.revisions[0];
            representedByMap[representsAsset].push({
              model,
              revision
            });
          } else {
            this.props.doFetchRevisions(modelId);
          }
        }
      }
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
      model3D = this.hasModelForAsset(this.viewer.current!.props.assetId);
      ({ assetId } = this.viewer.current!.props);
    }

    const { match, history, location } = this.props;
    const assetDrawerWidth = 350;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            <Sider
              style={{
                overflow: 'auto',
                height: '100vh',
                background: 'rgb(255,255,255)'
              }}
              width={250}
            >
              <AssetSearch location={location} onAssetClick={this.onAssetClick} assetId={Number(assetId)} />
            </Sider>
            <Content>
              <Header
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.0)',
                  float: 'right',
                  position: 'fixed',
                  right: '0',
                  top: '0'
                }}
              >
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
                </div>
              </Header>
              <Route
                path={`${match.url}/asset/:assetId`}
                render={props => {
                  return (
                    <AssetViewer
                      assetId={Number(props.match.params.assetId)}
                      show3D={model3D != null && this.state.show3D}
                      model3D={
                        model3D
                          ? {
                              modelId: model3D.model.id,
                              revisionId: model3D.revision.id
                            }
                          : undefined
                      }
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
    assets: selectAssets(state)
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTypes: fetchTypes,
      doFetchRevisions: fetchRevisions,
      doFetchModels: fetchModels
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
