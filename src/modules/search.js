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

// Reducer
const initialState = { items: [] };

export default function search(state = initialState, action) {
  switch (action.type) {
    case SET_RESULTS: {
      return { items: action.payload.items };
    }
    default:
      return state;
  }
}

// Action creators
const setResults = createAction(SET_RESULTS);

export const actions = {
  setResults,
};

// Selectors
export const selectResult = state => state.search || { items: [] };

export function runQuery(query) {
  return async dispatch => {
    const requestResult = await sdk.rawPost(`http://localhost:3000/search`, {
      data: { query },
    });
    const result = requestResult.data;
    console.log('Got result: ', result);

    dispatch({ type: SET_RESULTS, payload: { items: result } });
  };
}
