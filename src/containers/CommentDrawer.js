import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Drawer } from 'antd'
import CommentSection from '../components/CommentSection'
import { fetchComments, submitComment } from '../actions/comments'
import { Comments } from '../reducers/comments'
import { selectComments } from '../selectors/comments'

class CommentDrawer extends React.Component {
  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    const { nodeId } = this.props;
    if (prevProps.nodeId !== nodeId) {
      this.fetchData();
    }
  }

  onComment = (content) => {
    const { modelId, revisionId, nodeId, onSubmitComment } = this.props
    onSubmitComment(modelId, revisionId, nodeId, {
      content,
      author: 'fredrik.anfinsen@cognite.com',
    })
  }

  fetchData = () => {
    const { modelId, revisionId, nodeId, doFetchComments } = this.props
    doFetchComments(modelId, revisionId, nodeId)
  }

  render() {
    const { comments, onClose } = this.props
    return (
      <Drawer title="Comments" placement="right" width={400} closable onClose={onClose} visible mask={false}>
        <CommentSection loading={comments.loading} comments={comments.items} onComment={this.onComment} />
      </Drawer>
    )
  }
}
CommentDrawer.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  nodeId: PropTypes.number.isRequired,
  doFetchComments: PropTypes.func.isRequired,
  onSubmitComment: PropTypes.func.isRequired,
  comments: Comments.isRequired,
  onClose: PropTypes.func.isRequired,
}

const mapStateToProps = (state, ownProps) => {
  const { nodeId } = ownProps
  return {
    comments: selectComments(state, nodeId),
  }
}
const mapDispatchToProps = (dispatch) => ({
  doFetchComments: (...args) => dispatch(fetchComments(...args)),
  onSubmitComment: (...args) => dispatch(submitComment(...args)),
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CommentDrawer)
