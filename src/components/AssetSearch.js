// Disable linting problems with <a>
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Input, List, Divider } from 'antd';
import queryString from 'query-string';
import { searchForAsset, selectAssets, Assets } from '../modules/assets';

const moveExactMatchToTop = (list, query) => {
  const exactMatchIndex = list.findIndex(asset => asset.name === query);
  if (exactMatchIndex !== -1) {
    // Move the exact match to top
    list.splice(0, 0, list.splice(exactMatchIndex, 1)[0]);
  }
  return list;
};

class AssetSearch extends React.Component {
  state = {};

  componentDidMount() {
    const parsed = queryString.parse(this.props.location.search);
    const { query } = parsed;

    if (query) {
      this.props.doSearchForAsset(query);
      this.setState({ query });
    }
  }

  onChange = change => {
    const query = change.target.value;
    this.setState({ query });
    this.props.doSearchForAsset(query);
  };

  render() {
    const assets = this.props.assets.current
      ? moveExactMatchToTop(this.props.assets.current, this.state.query.trim())
      : undefined;
    const { query } = this.state;
    const parsed = queryString.parse(this.props.location.search);
    const defaultSearchQuery = parsed.query ? parsed.query : '';
    return (
      <div
        style={{
          background: 'rgb(38, 38, 38)',
        }}
      >
        <div
          style={{
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 10,
            paddingBottom: 10,
            width: '100%',
          }}
        >
          <Input
            placeholder="Search for tag (13FV1234)"
            defaultValue={defaultSearchQuery}
            onChange={this.onChange}
            style={{
              background: 'rgb(51, 51, 51)',
              mixBlendMode: 'normal',
              color: '#fff',
              borderRadius: 0,
              border: 0,
              height: 50,
            }}
          />
        </div>
        <Divider
          type="horizontal"
          style={{ margin: 10, backgroundColor: '#333333' }}
        />
        {assets && query !== '' && (
          <List
            split={false}
            itemLayout="horizontal"
            dataSource={assets}
            renderItem={item => (
              <List.Item
                style={{
                  padding: 10,
                  width: '100%',
                  paddingLeft: 10,
                  paddingRight: 10,
                }}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        paddingLeft: 10,
                        color: 'rgb(255, 255, 255)',
                        fontWeight: 'bold',
                        fontSize: 12,
                      }}
                    >
                      <a>{item.name.toUpperCase()}</a>
                    </div>
                  }
                  onClick={() =>
                    this.props.onAssetClick(item, this.state.query)
                  }
                  description={
                    <div
                      style={{
                        paddingLeft: 10,
                        color: 'rgb(255, 255, 255)',
                        fontSize: 12,
                      }}
                    >
                      {item.description.toUpperCase()}
                    </div>
                  }
                  style={{
                    background:
                      item.id === this.props.assetId
                        ? 'rgb(80, 80, 80)'
                        : 'rgb(51, 51, 51)',
                  }}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    );
  }
}

AssetSearch.propTypes = {
  doSearchForAsset: PropTypes.func.isRequired,
  assets: Assets.isRequired,
  assetId: PropTypes.number,
  onAssetClick: PropTypes.func.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }).isRequired,
};

AssetSearch.defaultProps = {
  assetId: undefined,
};

const mapStateToProps = state => {
  return {
    assets: selectAssets(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doSearchForAsset: (...args) => dispatch(searchForAsset(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetSearch);
