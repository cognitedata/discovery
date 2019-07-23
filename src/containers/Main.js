import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Layout, Switch } from 'antd';
import { Route } from 'react-router-dom';
import AssetSearch from '../components/AssetSearch';
import AssetViewer from './AssetViewer';
import { fetchTypes } from '../modules/types';
import { fetchModels, selectThreeD, ThreeD } from '../modules/threed';
import { Assets, selectAssets } from '../modules/assets';

// 13FV1234 is useful asset
const { Content, Header, Sider } = Layout;

function stringToBool(string) {
  return string === 'true';
}

class Main extends React.Component {
  state = {
    show3D:
      localStorage.getItem('show3D') != null
        ? stringToBool(localStorage.getItem('show3D'))
        : true,
    showPNID:
      localStorage.getItem('showPNID') != null
        ? stringToBool(localStorage.getItem('showPNID'))
        : true,
  };

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

  onAssetClick = (asset, query) => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${asset.id}`,
      search: `?query=${query}`,
    });
  };

  onAssetIdChange = assetId => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${assetId}`,
    });
  };

  on3DVisibleChange = value => {
    this.setState({ show3D: value });
    localStorage.setItem('show3D', value);
  };

  onPNIDVisibleChange = value => {
    this.setState({ showPNID: value });
    localStorage.setItem('showPNID', value);
  };

  hasModelForAsset(assetId) {
    const asset = this.props.assets.all[assetId];
    const representedByMap = {};
    const { models } = this.props.threed;
    Object.keys(models).forEach(modelId => {
      const model = models[modelId];
      if (!model.revisions) {
        return;
      }

      model.revisions.forEach(revision => {
        if (revision.metadata.representsAsset) {
          const { representsAsset } = revision.metadata;
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
      const modelsForAsset = representedByMap[asset.rootId];
      if (!modelsForAsset || modelsForAsset.length === 0) {
        return null;
      }
      return representedByMap[asset.rootId][0];
    }
    return null;
  }

  render() {
    let model3D;
    let assetId;
    if (this.viewer) {
      model3D = this.hasModelForAsset(this.viewer.props.assetId);
      ({ assetId } = this.viewer.props);
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
                background: 'rgb(255,255,255)',
              }}
              width={250}
            >
              <AssetSearch
                history={history}
                location={location}
                onAssetClick={this.onAssetClick}
                assetId={Number(assetId)}
              />
            </Sider>
            <Content>
              <Header
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.0)',
                  float: 'right',
                  position: 'fixed',
                  right: '0',
                  top: '0',
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
                              revisionId: model3D.revision.id,
                            }
                          : undefined
                      }
                      showPNID={this.state.showPNID}
                      onAssetIdChange={this.onAssetIdChange}
                      assetDrawerWidth={assetDrawerWidth}
                      ref={c => {
                        this.viewer = c; // Will direct access this
                      }}
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

Main.propTypes = {
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
  }).isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }).isRequired,
  threed: ThreeD.isRequired,
  assets: Assets.isRequired,
  doFetchTypes: PropTypes.func.isRequired,
  doFetchModels: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
  return {
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doFetchTypes: (...args) => dispatch(fetchTypes(...args)),
  doFetchModels: (...args) => dispatch(fetchModels(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
