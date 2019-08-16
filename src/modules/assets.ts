import { createAction } from 'redux-actions';
import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { Asset } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';
import { arrayToObjectById } from '../utils/utils';
// eslint-disable-next-line import/no-cycle
import { Type } from './types';
import { RootState } from '../reducers';
import { sdk } from '../index';

// Constants
export const SET_ASSETS = 'assets/SET_ASSETS';
export const ADD_ASSETS = 'assets/ADD_ASSETS';

export interface ExtendedAsset extends Asset {
  rootId: number;
  types: Type[];
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
    const currentCounter = searchCounter + 1;
    searchCounter += 1;

    if (query === '') {
      dispatch({ type: SET_ASSETS, payload: { items: [] } });
      return;
    }
    // const result = await sdk.Assets.search({ query, name, limit: 100 });
    // const requestResult = await sdk.rawGet(
    //   `https://api.cognitedata.com/api/0.6/projects/${project}/assets/search?query=${query}&limit=100&assetSubtrees=[7793176078609329]`
    // );
    const result = await sdk.assets.search({
      search: { name: query },
      limit: 1000,
    });

    if (result) {
      const assetResults = result.map(asset => ({
        id: asset.id,
        name: asset.name,
        rootId: asset.rootId,
        description: asset.description,
        types: asset.metadata!.types,
        metadata: asset.metadata,
      }));
      if (currentCounter === searchCounter) {
        dispatch({
          type: ADD_ASSETS,
          payload: arrayToObjectById(
            result.map(asset => ({
              id: asset.id,
              name: asset.name,
              rootId: asset.rootId,
              description: asset.description,
              types: asset.metadata!.types,
              metadata: asset.metadata,
              parentId: asset.parentId,
            }))
          ),
        });
        dispatch({ type: SET_ASSETS, payload: { items: assetResults } });
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

    try {
      const results = await sdk.assets.retrieve([{ id: assetId }]);

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => ({
            id: asset.id,
            name: asset.name,
            rootId: asset.rootId,
            description: asset.description,
            parentId: asset.parentId,
            types: asset.metadata ? asset.metadata!.types : [],
            metadata: asset.metadata,
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
export function loadAssetChildren(assetId: number) {
  return async (dispatch: Dispatch) => {
    try {
      const results = await sdk.assets.search({
        filter: { parentIds: [assetId] },
      });

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => ({
            id: asset.id,
            name: asset.name,
            rootId: asset.rootId,
            parentId: asset.parentId,
            description: asset.description,
            types: asset.metadata!.types,
            metadata: asset.metadata,
          }))
        );
        dispatch({
          type: ADD_ASSETS,
          payload: { items }, // what is going on with sdk man...
        });
      }
    } catch (ex) {
      message.error(`Could not fetch children.`);
    }
  };
}
export function loadParentRecurse(assetId: number, rootAssetId: number) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    // Skip if we did it before
    if (requestedAssetIds[assetId]) {
      return;
    }
    requestedAssetIds[assetId] = true;

    try {
      const results = await sdk.assets.retrieve([{ id: assetId }]);
      requestedAssetIds[assetId] = false;

      const items = arrayToObjectById(
        results.map(asset => ({
          id: asset.id,
          name: asset.name,
          rootId: asset.rootId,
          parentId: asset.parentId,
          description: asset.description,
          types: asset.metadata!.types,
          metadata: asset.metadata,
        }))
      );
      dispatch({
        type: ADD_ASSETS,
        payload: { items },
      });
      if (
        results.length > 0 &&
        results[0].parentId &&
        results[0].parentId !== rootAssetId
      ) {
        dispatch(loadParentRecurse(results[0].parentId, rootAssetId));
      }
    } catch (ex) {
      console.log(ex);
      message.error(`Could not fetch parents.`);
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

    try {
      const results = await sdk.assets.retrieve(
        assetIds.map(id => ({
          id,
        }))
      );

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => ({
            id: asset.id,
            name: asset.name,
            rootId: asset.rootId,
            parentId: asset.parentId,
            description: asset.description,
            types: asset.metadata!.types,
            metadata: asset.metadata,
          }))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not fetch assets.`);
    }
  };
}

// Reducer
export interface AssetsState {
  all: { [key: string]: ExtendedAsset };
  current: ExtendedAsset[];
}

const initialState: AssetsState = { current: [], all: {} };

export default function assets(
  state = initialState,
  action: AssetAction
): AssetsState {
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
export const selectAssets = (state: RootState) => state.assets || initialState;
