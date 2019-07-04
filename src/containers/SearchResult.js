import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Model3D from '../components/Model3D';
import { selectResult } from '../modules/search';

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
`;

class SearchResult extends React.Component {
  cache = {};

  state = {};

  componentDidMount() {}

  componentDidUpdate(prevProps) {
    if (prevProps.result !== this.props.result) {
      this.props.result.forEach(result => {
        if (result.kind === '3d') {
          const { modelId, revisionId } = result;
          this.setState({ modelId, revisionId });
        }
      });
    }
  }

  render3D() {
    const { modelId, revisionId } = this.state;
    if (!modelId || !revisionId) {
      return null;
    }

    return (
      <Model3D
        modelId={2495544803289093}
        revisionId={3041181389296996}
        cache={this.cache}
        enableKeyboardNavigation={this.props.keyboard3DEnabled}
      />
    );
  }

  // renderPNID() {
  //   const asset = this.getAsset();
  //   return (
  //     <PNIDViewer
  //       documentId={this.state.documentId}
  //       asset={asset}
  //     />
  //   );
  // }

  render() {
    // const asset = this.getAsset();
    const { assetDrawerWidth } = this.props;

    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <div style={{ height: '100%', paddingRight: assetDrawerWidth }}>
          <ViewerContainer>
            {this.render3D()}
            {/* {this.props.showPNID && this.renderPNID()} */}
          </ViewerContainer>
        </div>
      </div>
    );
  }
}

SearchResult.propTypes = {
  assetDrawerWidth: PropTypes.number.isRequired,
  keyboard3DEnabled: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  result: PropTypes.any.isRequired,
};

const mapStateToProps = state => {
  return {
    result: selectResult(state).items,
  };
};

const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchResult);

//  where is 13fv1234
