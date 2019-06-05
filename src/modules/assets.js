import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

// Constants
export const SET_ASSETS = 'assets/SET_ASSETS';
export const ADD_ASSETS = 'assets/ADD_ASSETS';

export const Asset = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  description: PropTypes.string,
});

export const Assets = PropTypes.exact({
  all: PropTypes.arrayOf(Asset),
  current: PropTypes.arrayOf(Asset),
});

let lastRequest = 0;
// Functions
export function searchForAsset(query, name) {
  return async dispatch => {
    const now = Date.now();
    lastRequest = now;

    const result = await sdk.Assets.search({ query, name, limit: 100 });
    const assets_ = result.items.map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
    }));
    if (now === lastRequest) {
      dispatch({ type: ADD_ASSETS, payload: { items: assets_ } });
      dispatch({ type: SET_ASSETS, payload: { items: assets_ } });
    }
  };
}

// Reducer
const initialState = {};

export default function assets(state = initialState, action) {
  switch (action.type) {
    case SET_ASSETS: {
      const { items } = action.payload;
      return {
        ...state,
        current: items,
      };
    }
    case ADD_ASSETS: {
      const { items } = action.payload;
      const existingAssets = state.all ? state.all : [];
      const allItemsArray = [...items, ...existingAssets];
      const allItems = [...new Set(allItemsArray)];
      return {
        ...state,
        all: allItems,
      };
    }
    default:
      return state;
  }
}

// Action creators
const setAssets = createAction(SET_ASSETS);

export const actions = {
  setAssets,
};

// Selectors
export const selectAssets = state => state.assets || { current: [], all: [] };
