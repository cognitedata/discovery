import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { message } from 'antd';
import { arrayToObjectById } from '../utils/utils';
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
  metadata: PropTypes.objectOf(PropTypes.string),
});

export const Assets = PropTypes.exact({
  all: PropTypes.objectOf(Asset),
  current: PropTypes.arrayOf(Asset),
});

let searchCounter = 0;
// Functions
export function searchForAsset(query) {
  return async dispatch => {
    const currentCounter = ++searchCounter;

    if (query === '') {
      dispatch({ type: SET_ASSETS, payload: { items: [] } });
      return;
    }
    // const result = await sdk.Assets.search({ query, name, limit: 100 });
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/search?query=${query}&limit=100&assetSubtrees=[7793176078609329]`
    );
    const result = requestResult.data.data;

    const assets_ = result.items.map(asset => ({
      id: asset.id,
      name: asset.name,
      description: asset.description,
      types: asset.types,
      metadata: asset.metadata,
    }));
    if (currentCounter === searchCounter) {
      dispatch({ type: ADD_ASSETS, payload: { items: assets_ } });
      dispatch({ type: SET_ASSETS, payload: { items: assets_ } });
    }
  };
}

const requestedAssetIds = {};
export function fetchAsset(assetId) {
  return async dispatch => {
    // Skip if we did it before
    if (requestedAssetIds[assetId]) {
      return;
    }
    requestedAssetIds[assetId] = true;

    const { project } = sdk.configure({});
    try {
      const requestResult = await sdk.rawGet(
        `https://api.cognitedata.com/api/0.6/projects/${project}/assets/${assetId}`
      );

      const result = requestResult.data.data;
      const items = arrayToObjectById(
        result.items.map(asset => ({
          id: asset.id,
          name: asset.name,
          description: asset.description,
          types: asset.types,
          metadata: asset.metadata,
        }))
      );

      dispatch({ type: ADD_ASSETS, payload: { items } });
    } catch (ex) {
      message.error(`Could not fetch asset.`);
      return;
    }
    requestedAssetIds[assetId] = false;
  };
}

export function fetchAssets(assetIds) {
  return async dispatch => {
    if (assetIds.length === 0) {
      return;
    }

    const { project } = sdk.configure({});
    const body = {
      items: assetIds.map(id => ({
        id,
      })),
    };
    try {
      const requestResult = await sdk.rawPost(
        `https://api.cognitedata.com/api/v1/projects/${project}/assets/byids`,
        { data: body }
      );

      const result = requestResult.data;

      const items = arrayToObjectById(
        result.items.map(asset => ({
          id: asset.id,
          name: asset.name,
          description: asset.description,
          types: asset.types,
          metadata: asset.metadata,
        }))
      );

      dispatch({ type: ADD_ASSETS, payload: { items } });
    } catch (ex) {
      message.error(`Could not fetch asset.`);
    }
  };
}

// Reducer
const initialState = { current: [], all: {} };

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
      const all = { ...state.all, ...action.payload.items };
      return {
        ...state,
        all,
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
export const selectAssets = state => state.assets || { current: [], all: {} };
