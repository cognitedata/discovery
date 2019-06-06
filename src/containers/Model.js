import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Model3DViewer } from '@cognite/gearbox';
import mixpanel from 'mixpanel-browser';

class Model extends React.Component {
  cache = {};

  state = {
    model: null,
  };

  onViewerReady = (_, model) => {
    this.setState({ model });
  };

  onClick = async nodeId => {
    mixpanel.context.track('3D.click', { nodeId });

    if (!nodeId) {
      this.onAssetClose();
      return;
    }

    const { match, history } = this.props;
    history.push(`${match.url}/node/${nodeId}`);
  };

  onAssetClose = () => {
    const { model } = this.state;
    const { match, history } = this.props;
    model.deselectAllNodes();
    history.push(match.url);
  };

  selectNode = nodeId => {
    const { model } = this.state;
    if (!model) return;
    model.deselectAllNodes();
    model.selectNode(Number(nodeId));
  };

  render() {
    const { modelId, revisionId } = this.props;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh' }}>
        <Model3DViewer
          modelId={modelId}
          revisionId={revisionId}
          onClick={this.onClick}
          onReady={this.onViewerReady}
          cache={this.cache}
        />
      </div>
    );
  }
}
Model.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
  }).isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

const mapStateToProps = (_, ownProps) => {
  const { modelId, revisionId } = ownProps.match.params;
  return {
    modelId: Number(modelId),
    revisionId: Number(revisionId),
  };
};

export default connect(mapStateToProps)(Model);
