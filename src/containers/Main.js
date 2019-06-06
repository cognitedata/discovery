import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Layout, Radio } from 'antd';
import { Route } from 'react-router-dom';
import AssetSearch from '../components/AssetSearch';
import AssetViewer from './AssetViewer';
import { fetchTypes } from '../modules/types';

// 13FV1234 is useful asset
const { Content, Header, Sider, Footer } = Layout;

class Main extends React.Component {
  state = {
    view: '3d',
  };

  componentDidMount() {
    this.props.doFetchTypes();
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

  onViewChange = value => {
    const view = value.target.value;
    this.setState({ view });
  };

  render() {
    const { match, history, location } = this.props;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            <Sider
              style={{
                overflow: 'auto',
                height: '100vh',
              }}
            >
              <AssetSearch
                history={history}
                location={location}
                onAssetClick={this.onAssetClick}
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
                <Radio.Group
                  onChange={this.onViewChange}
                  defaultValue="3d"
                  style={{ paddingRight: 400 }}
                >
                  <Radio.Button value="3d">3D</Radio.Button>
                  <Radio.Button value="P&ID">P&ID</Radio.Button>
                </Radio.Group>
              </Header>
              <Route
                path={`${match.url}/asset/:assetId`}
                render={props => {
                  const { assetId } = props.match.params;
                  return (
                    <AssetViewer
                      assetId={Number(assetId)}
                      view={this.state.view}
                      onAssetIdChange={this.onAssetIdChange}
                    />
                  );
                }}
              />
            </Content>
          </Layout>
          <Footer>footer</Footer>
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
  doFetchTypes: PropTypes.func.isRequired,
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = dispatch => ({
  doFetchTypes: (...args) => dispatch(fetchTypes(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
