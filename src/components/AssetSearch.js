import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Input, List, Button } from 'antd';
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
      <>
        <Input
          placeholder="Search for tag (13FV1234)"
          defaultValue={defaultSearchQuery}
          onChange={this.onChange}
          style={{
            background: '#333333',
            mixBlendMode: 'normal',
            color: '#fff',
          }}
        />
        {assets && query !== '' && (
          <List
            itemLayout="horizontal"
            dataSource={assets}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  title={<Button type="link">{item.name}</Button>}
                  onClick={() =>
                    this.props.onAssetClick(item, this.state.query)
                  }
                  description={item.description}
                />
              </List.Item>
            )}
          />
        )}
      </>
    );
  }
}

AssetSearch.propTypes = {
  doSearchForAsset: PropTypes.func.isRequired,
  assets: Assets.isRequired,
  onAssetClick: PropTypes.func.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }).isRequired,
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
