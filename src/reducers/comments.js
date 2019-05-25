import PropTypes from 'prop-types'
import ActionTypes from '../constants/actionTypes'

export const Comment = PropTypes.shape({
  author: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  datetime: PropTypes.string.isRequired,
});

export const Comments = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(Comment).isRequired,
});

// nodeId -> { loading: boolean, items: array of comments }
const initialState = {}

export default function comments(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.ADD_COMMENT: {
      const { comment, nodeId } = action.payload;
      return {
        ...state,
        [nodeId]: {
          ...state[nodeId],
          items: [
            ...state[nodeId].items,
            comment,
          ],
        },
      }
    }
    case ActionTypes.SET_COMMENTS: {
      const { items, nodeId } = action.payload;
      return {
        ...state,
        [nodeId]: { loading: false, items },
      }
    }
    case ActionTypes.FETCH_COMMENTS: {
      const { nodeId } = action.payload;
      return {
        ...state,
        [nodeId]: { loading: true, items: [] },
      }
    }
    default:
      return state
  }
}
