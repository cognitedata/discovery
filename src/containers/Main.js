import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Layout, Input, Checkbox } from 'antd';
import SearchResult from './SearchResult';
import { runQuery } from '../modules/search';

const { Search } = Input;

// 13FV1234 is useful asset
const { Content } = Layout;

class Main extends React.Component {
  state = {
    keyboard3DEnabled: false,
    hideMode: 0,
  };

  componentDidMount() {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        this.nameInput.blur();
      }
      if (event.key === 'i' && event.metaKey) {
        this.nameInput.focus();
      }
    });
  }

  onSearch = query => {
    this.props.doRunQuery(query);
  };

  handleChange = () => {
    let hideMode = this.state.hideMode + 1;
    if (hideMode > 2) {
      hideMode = 0;
    }
    this.setState(() => {
      return { hideMode };
    });
  };

  render() {
    const assetDrawerWidth = 500;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Layout>
          <Layout>
            <Content>
              <Search
                ref={input => {
                  this.nameInput = input;
                }}
                placeholder="Search Cognite Knowledge Engine"
                enterButton
                onSearch={this.onSearch}
                onFocus={() => {
                  this.setState({ keyboard3DEnabled: false });
                }}
                onBlur={() => {
                  this.setState({ keyboard3DEnabled: true });
                }}
                style={{
                  width: '25%',
                  position: 'fixed',
                  right: assetDrawerWidth,
                  transform: 'translate(-75%, 0)',
                  top: '20px',
                }}
              />

              <SearchResult
                assetDrawerWidth={assetDrawerWidth}
                keyboard3DEnabled={this.state.keyboard3DEnabled}
                hideMode={this.state.hideMode}
                ref={c => {
                  this.viewer = c; // Will direct access this
                }}
              />
              <Checkbox
                indeterminate={this.state.hideMode === 1}
                checked={this.state.hideMode === 2}
                onChange={this.handleChange}
                style={{
                  position: 'fixed',
                  right: '20px',
                  top: '17px',
                  zIndex: 1001,
                }}
              >
                Hide nodes
              </Checkbox>
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
  doRunQuery: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
  return {};
};

const mapDispatchToProps = dispatch => ({
  doRunQuery: (...args) => dispatch(runQuery(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Main);
