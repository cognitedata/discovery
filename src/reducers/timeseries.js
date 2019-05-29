import PropTypes from 'prop-types'
import ActionTypes from '../constants/actionTypes'

export const SingleTimeseries = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
});

export const Timeseries = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(SingleTimeseries).isRequired,
});

// nodeId -> { loading: boolean, items: array of comments }
const initialState = {}

export default function timeseries(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.ADD_TIMESERIES: {
      const { ts } = action.payload;
      return {
        ...state,
        items: [...state.items, ...ts]
      }
    }
    case ActionTypes.SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      }
    }
    default:
      return state
  }
}
