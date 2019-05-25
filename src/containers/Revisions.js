import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Spin } from 'antd';
import { Revisions } from '../reducers/revisions'
import RevisionCard from '../components/RevisionCard'
import { fetchRevisions } from '../actions/revisions';

class RevisionsContainer extends React.Component {
  componentDidMount() {
    const { doFetchRevisions, match } = this.props;
    doFetchRevisions(Number(match.params.modelId));
  }

  render() {
    const { revisions } = this.props
    if (revisions.loading) {
      return (<Spin size="large" />);
    }
    return (
      <>
        {revisions.items.map(revision => (
          <RevisionCard
            key={revision.id}
            revisionId={revision.id}
            thumbnailURL={revision.thumbnailURL}
          />
        ))}
      </>
    )
  }
}
RevisionsContainer.propTypes = {
  revisions: Revisions.isRequired,
  doFetchRevisions: PropTypes.func.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      modelId: PropTypes.string.isRequired,
    }).isRequired
  }).isRequired,
}

const mapStateToProps = state => ({
  revisions: state.revisions,
});
const mapDispatchToProps = dispatch => ({
  doFetchRevisions: modelId => dispatch(fetchRevisions(modelId)),
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RevisionsContainer)
