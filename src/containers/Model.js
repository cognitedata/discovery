import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { Model3DViewer } from '@cognite/gearbox';
import { Route } from 'react-router-dom'
import CommentDrawer from './CommentDrawer'

class Model extends React.Component {
  state = {
    model: null,
  };

  onViewerReady = (_, model) => {
    this.setState({ model });
  }

  onClick = async (nodeId) => {
    if (!nodeId) {
      this.onCommentsClose();
      return;
    }
    const { match, history } = this.props;
    history.push(`${match.url}/comments/${nodeId}`); 
  }

  onCommentsClose = () => {
    const { model } = this.state;
    const { match, history } = this.props;
    model.deselectAllNodes();
    history.push(match.url);
  }

  selectNode = nodeId => {
    const { model } = this.state;
    if (!model) return;
    model.deselectAllNodes();
    model.selectNode(Number(nodeId));
  }

  render() {
    const { modelId, revisionId, match } = this.props;
    return (
      <div className="main-layout" style={{ width: '100%', height: '100vh'}}>
        <Model3DViewer
          modelId={modelId}
          revisionId={revisionId}
          onClick={this.onClick}
          onReady={this.onViewerReady}
        />
        <Route exact path={`${match.url}/comments/:nodeId`} render={props => {
          const { nodeId } = props.match.params;
          this.selectNode(Number(nodeId));
          return (
            <CommentDrawer
              loading
              modelId={modelId}
              revisionId={revisionId}
              nodeId={Number(nodeId)}
              onClose={this.onCommentsClose}
            />
          );
        }} />
      </div>
    );
  }
}
Model.propTypes = {
  modelId:  PropTypes.number.isRequired,
  revisionId:  PropTypes.number.isRequired,
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
  }).isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
}

const mapStateToProps = (_, ownProps) => {
  const { modelId, revisionId } = ownProps.match.params;
  return {
    modelId: Number(modelId),
    revisionId: Number(revisionId),
  }
}

export default connect(mapStateToProps)(Model);
