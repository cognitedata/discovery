import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

export const Revision = PropTypes.shape({
  id: PropTypes.number,
  metadata: PropTypes.objectOf(PropTypes.string),
  assetMappingCount: PropTypes.number,
});

export const Model = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  revisions: PropTypes.arrayOf(Revision),
});

export const Models = PropTypes.exact({
  items: PropTypes.objectOf(Model),
});

// Constants
export const SET_RESULTS = 'search/SET_RESULTS';
export const SET_LOADING = 'search/SET_LOADING';

// Reducer
const initialState = { items: [], loading: false };

export default function search(state = initialState, action) {
  switch (action.type) {
    case SET_RESULTS: {
      return { ...state, items: action.payload.items };
    }
    case SET_LOADING: {
      return { ...state, loading: action.payload.loading };
    }
    default:
      return state;
  }
}

// Action creators
const setResults = createAction(SET_RESULTS);
const setLoading = createAction(SET_LOADING);

export const actions = {
  setResults,
  setLoading,
};

// Selectors
export const selectResult = state => state.search.items || [];
export const selectIsLoading = state => state.search.loading || false;

export function runQuery(query) {
  return async dispatch => {
    dispatch({ type: SET_LOADING, payload: { loading: true } });
    dispatch({ type: SET_RESULTS, payload: { items: [] } });
    const requestResult = await sdk.rawPost(`http://localhost:3000/search`, {
      data: { query },
    });
    const result = requestResult.data;

    dispatch({ type: SET_LOADING, payload: { loading: false } });
    dispatch({ type: SET_RESULTS, payload: { items: result } });
  };
}
