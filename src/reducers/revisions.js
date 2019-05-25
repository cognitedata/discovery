import PropTypes from 'prop-types'
import ActionTypes from '../constants/actionTypes'

export const Revision = PropTypes.shape({
  id: PropTypes.number.isRequired,
  thumbnailURL: PropTypes.string.isRequired,
});

export const Revisions = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(Revision).isRequired,
});

// nodeId -> { loading: boolean, items: array of revisions }
const initialState = {
  loading: false,
  items: [],
}

export default function revisions(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.FETCH_REVISIONS: {
      return {
        ...state,
        loading: true,
        items: [],
      }
    }
    case ActionTypes.SET_REVISIONS: {
      return {
        ...state,
        loading: false,
        items: action.payload,
      }
    }
    default:
      return state
  }
}
