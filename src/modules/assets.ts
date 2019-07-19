import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { message } from 'antd';
import { arrayToObjectById } from '../utils/utils';
// eslint-disable-next-line import/no-cycle
import { Type } from './types';
import { Asset } from '@cognite/sdk';
import { Dispatch, Action } from 'redux';
import { RootState } from '../reducers';
// Constants
export const SET_ASSETS = 'assets/SET_ASSETS';
export const ADD_ASSETS = 'assets/ADD_ASSETS';

export interface ExtendedAsset extends Asset {
  rootId?: number;
  types?: Type[];
  metadata?: { [key: string]: string };
}

interface AddAction extends Action<typeof ADD_ASSETS> {
  payload: { items: { [key: string]: ExtendedAsset } };
}
interface SetAction extends Action<typeof SET_ASSETS> {
  payload: { items: ExtendedAsset[] };
}
type AssetAction = AddAction | SetAction;

let searchCounter = 0;

// Functions
export function searchForAsset(query: string) {
  return async (dispatch: Dispatch) => {
    const currentCounter = ++searchCounter;

    if (query === '') {
      dispatch({ type: SET_ASSETS, payload: { items: [] } });
      return;
    }
    // const result = await sdk.Assets.search({ query, name, limit: 100 });
    const { project } = sdk.configure({});
    // const requestResult = await sdk.rawGet(
    //   `https://api.cognitedata.com/api/0.6/projects/${project}/assets/search?query=${query}&limit=100&assetSubtrees=[7793176078609329]`
    // );
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/search?query=${query}&limit=1000`
    );

    if (requestResult) {
      const result = requestResult.data.data;

      const assets_: Asset = result.items.map((asset: ExtendedAsset) => ({
        id: asset.id,
        name: asset.name,
        rootId: asset.rootId,
        description: asset.description,
        types: asset.types,
        metadata: asset.metadata
      }));
      if (currentCounter === searchCounter) {
        dispatch({
          type: ADD_ASSETS,
          payload: arrayToObjectById(
            result.items.map((asset: ExtendedAsset) => ({
              id: asset.id,
              name: asset.name,
              rootId: asset.path ? asset.path[0] : undefined,
              description: asset.description,
              types: asset.types,
              metadata: asset.metadata
            }))
          )
        });
        dispatch({ type: SET_ASSETS, payload: { items: assets_ } });
      }
    }
  };
}

type RequestedAssetIds = { [key: string]: boolean };

const requestedAssetIds: RequestedAssetIds = {};

export function fetchAsset(assetId: number) {
  return async (dispatch: Dispatch) => {
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

      if (requestResult) {
        const result = requestResult.data.data;
        const items = arrayToObjectById(
          result.items.map((asset: ExtendedAsset) => ({
            id: asset.id,
            name: asset.name,
            rootId: asset.path ? asset.path[0] : undefined,
            description: asset.description,
            types: asset.types,
            metadata: asset.metadata
          }))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not fetch asset.`);
      return;
    }
    requestedAssetIds[assetId] = false;
  };
}

export function fetchAssets(assetIds: number[]) {
  return async (dispatch: Dispatch) => {
    if (assetIds.length === 0) {
      return;
    }

    const { project } = sdk.configure({});
    const body = {
      items: assetIds.map(id => ({
        id
      }))
    };
    try {
      const requestResult = await sdk.rawPost(`https://api.cognitedata.com/api/v1/projects/${project}/assets/byids`, {
        data: body
      });

      if (requestResult) {
        const result = requestResult.data;

        const items = arrayToObjectById(
          result.items.map((asset: ExtendedAsset) => ({
            id: asset.id,
            name: asset.name,
            rootId: asset.rootId,
            description: asset.description,
            types: asset.types,
            metadata: asset.metadata
          }))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not fetch asset.`);
    }
  };
}

// Reducer
export interface AssetsState {
  all: { [key: string]: ExtendedAsset };
  current: ExtendedAsset[];
}

const initialState: AssetsState = { current: [], all: {} };

export default function assets(state = initialState, action: AssetAction): AssetsState {
  switch (action.type) {
    case SET_ASSETS: {
      const { items } = action.payload;
      return {
        ...state,
        current: items
      };
    }
    case ADD_ASSETS: {
      const all = { ...state.all, ...action.payload.items };
      return {
        ...state,
        all
      };
    }
    default:
      return state;
  }
}

// Action creators
const setAssets = createAction(SET_ASSETS);

export const actions = {
  setAssets
};

// Selectors
export const selectAssets = (state: RootState) => state.assets || initialState;
