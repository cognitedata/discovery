import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { message } from 'antd';
// eslint-disable-next-line import/no-cycle
import { Type } from './types';
// Constants
export const SET_ASSETS = 'assets/SET_ASSETS';
export const ADD_ASSETS = 'assets/ADD_ASSETS';

export const Asset = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  description: PropTypes.string,
  types: PropTypes.arrayOf(Type),
});

export const Assets = PropTypes.exact({
  all: PropTypes.arrayOf(Asset),
  current: PropTypes.arrayOf(Asset),
});

let searchCounter = 0;
// Functions
export function searchForAsset(query) {
  return async dispatch => {
    const currentCounter = ++searchCounter;

    // const result = await sdk.Assets.search({ query, name, limit: 100 });
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/search?query=${query}&limit=100`
    );
    const result = requestResult.data.data;

    const assets_ = result.items.map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      types: asset.types,
    }));
    if (currentCounter === searchCounter) {
      dispatch({ type: ADD_ASSETS, payload: { items: assets_ } });
      dispatch({ type: SET_ASSETS, payload: { items: assets_ } });
    }
  };
}

let requestedAssetIds = {};
export function fetchAsset(assetId) {
  return async dispatch => {
    // Skip if we did it before
    if (requestedAssetIds[assetId] !== undefined) {
      return;
    }
    requestedAssetIds[assetId] = true;

    // const result = await sdk.Assets.retrieve(assetId);
    const { project } = sdk.configure({});
    let requestResult;
    try {
      requestResult = await sdk.rawGet(
        `https://api.cognitedata.com/api/0.6/projects/${project}/assets/${assetId}`
      );
    } catch (ex) {
      message.error(`Could not fetch asset.`);
      return;
    }

    const result = requestResult.data.data;
    const assets_ = result.items.map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      types: asset.types,
    }));

    // Crazy way to reset the list
    setTimeout(() => {
      requestedAssetIds = {};
    }, 1000);
    dispatch({ type: ADD_ASSETS, payload: { items: assets_ } });
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
