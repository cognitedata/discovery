import PropTypes from 'prop-types';
import ActionTypes from '../constants/actionTypes';

export const Model = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
});

export const Models = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(Model).isRequired,
});

// nodeId -> { loading: boolean, items: array of models }
const initialState = {
  loading: false,
  items: [],
};

export default function models(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.FETCH_MODELS: {
      return {
        ...state,
        loading: true,
        items: [],
      };
    }
    case ActionTypes.SET_MODELS: {
      return {
        ...state,
        loading: false,
        items: action.payload,
      };
    }
    default:
      return state;
  }
}
