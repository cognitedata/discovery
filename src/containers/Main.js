import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Layout, Input } from 'antd';
import { Route } from 'react-router-dom';
import SearchResult from './SearchResult';
import { fetchTypes } from '../modules/types';
import { fetchModels, selectModels, Models } from '../modules/threed';
import { Assets, selectAssets } from '../modules/assets';
import { runQuery } from '../modules/search';

const { Search } = Input;

// 13FV1234 is useful asset
const { Content, Header, Sider } = Layout;

class Main extends React.Component {
  state = {
    keyboard3DEnabled: false,
  };

  componentDidMount() {
    this.props.doFetchTypes();
    this.props.doFetchModels();
  }

  onAssetIdChange = assetId => {
    const { match, history } = this.props;
    history.push({
      pathname: `${match.url}/asset/${assetId}`,
    });
  };

  onSearch = query => {
    this.props.doRunQuery(query);
  };

  hasModelForAsset(assetId) {
    const asset = this.props.assets.all[assetId];
    const representedByMap = {};
    const models = this.props.models.items;
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
      const { path } = asset;
      const matchedAssetIds = path.filter(
        id => representedByMap[id] !== undefined
      );

      if (matchedAssetIds.length > 0) {
        return representedByMap[matchedAssetIds[0]][0];
      }
    }
    return null;
  }

  render() {
    const assetDrawerWidth = 350;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            <Content>
              <Search
                placeholder="Search Cognite"
                enterButton
                onSearch={this.onSearch}
                onFocus={() => {
                  this.setState({ keyboard3DEnabled: false });
                }}
                onBlur={() => {
                  this.setState({ keyboard3DEnabled: true });
                }}
                style={{
                  width: '40%',
                  position: 'fixed',
                  left: assetDrawerWidth,
                  top: '20px',
                }}
              />
              <SearchResult
                assetDrawerWidth={assetDrawerWidth}
                keyboard3DEnabled={this.state.keyboard3DEnabled}
                ref={c => {
                  this.viewer = c; // Will direct access this
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
  models: Models.isRequired,
  assets: Assets.isRequired,
  doFetchTypes: PropTypes.func.isRequired,
  doFetchModels: PropTypes.func.isRequired,
  doRunQuery: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
  return {
    models: selectModels(state),
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doFetchTypes: (...args) => dispatch(fetchTypes(...args)),
  doFetchModels: (...args) => dispatch(fetchModels(...args)),
  doRunQuery: (...args) => dispatch(runQuery(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
