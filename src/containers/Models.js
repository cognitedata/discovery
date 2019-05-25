import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { fetchModels } from '../actions/models'
import { Models } from '../reducers/models'
import ModelList from '../components/ModelList'

class ModelsContainer extends React.Component {
  componentDidMount() {
    const { doFetchModels } = this.props;
    doFetchModels();
  }

  render() {
    const { models } = this.props
    return (
      <ModelList
        loading={models.loading}
        items={models.items}
      />
    )
  }
}
ModelsContainer.propTypes = {
  models: Models.isRequired,
  doFetchModels: PropTypes.func.isRequired,
}

const mapStateToProps = state => ({
  models: state.models,
});
const mapDispatchToProps = dispatch => ({
  doFetchModels: () => dispatch(fetchModels()),
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ModelsContainer)
