import { createAction } from 'redux-actions';
import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { Asset, ExternalAssetItem, AssetChange } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';
// import { push } from 'connected-react-router';
import { arrayToObjectById } from '../utils/utils';
// eslint-disable-next-line import/no-cycle
import { Type } from './types';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { createAssetNodeMapping } from './assetmappings';
import { setRevisionRepresentAsset } from './threed';
import { trackUsage } from '../utils/metrics';

// Constants
export const SET_ASSETS = 'assets/SET_ASSETS';
export const ADD_ASSETS = 'assets/ADD_ASSETS';
export const UPDATE_ASSET = 'assets/UPDATE_ASSET';
export const DELETE_ASSETS = 'assets/DELETE_ASSETS';

export interface ExtendedAsset extends Asset {
  rootId: number;
  types: Type[];
  metadata?: { [key: string]: string };
}

export interface AddAssetAction extends Action<typeof ADD_ASSETS> {
  payload: { items: { [key: string]: ExtendedAsset } };
}
interface UpdateAction extends Action<typeof UPDATE_ASSET> {
  payload: { item: ExtendedAsset; assetId: number };
}
export interface DeleteAssetAction extends Action<typeof DELETE_ASSETS> {
  payload: { assetId: number };
}

interface SetAction extends Action<typeof SET_ASSETS> {
  payload: { items: ExtendedAsset[] };
}
type AssetAction =
  | AddAssetAction
  | SetAction
  | DeleteAssetAction
  | UpdateAction;

let searchCounter = 0;

// Functions
export function searchForAsset(query: string) {
  return async (dispatch: Dispatch) => {
    trackUsage('Assets.searchForAsset', {
      query,
    });
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
    const result = (await sdk.post(
      `/api/playground/projects/${sdk.project}/assets/search`,
      {
        data: {
          limit: 1000,
          ...(query && query.length > 0 && { search: { query } }),
        },
      }
    )).data.items;

    if (result) {
      const assetResults = result.map((asset: Asset) => ({
        id: asset.id,
        name: asset.name,
        rootId: asset.rootId,
        description: asset.description,
        types: [],
        metadata: asset.metadata,
      }));
      if (currentCounter === searchCounter) {
        dispatch({
          type: ADD_ASSETS,
          payload: arrayToObjectById(
            result.map((asset: Asset) => slimAssetObject(asset))
          ),
        });
        dispatch({ type: SET_ASSETS, payload: { items: assetResults } });
      }
    }
  };
}

type RequestedAssetIds = { [key: string]: boolean };

const requestedAssetIds: RequestedAssetIds = {};

export function fetchAsset(assetId: number, redirect = false) {
  return async (
    dispatch: ThunkDispatch<any, any, AnyAction>
    // getState: () => RootState
  ) => {
    // Skip if we did it before
    if (requestedAssetIds[assetId]) {
      return;
    }
    requestedAssetIds[assetId] = true;

    try {
      const results = await sdk.assets.retrieve([{ id: assetId }]);

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => slimAssetObject(asset))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
        if (redirect) {
          // const {
          //   app: { tenant },
          // } = getState();
          // dispatch(
          //   push(`/${tenant}/asset/${items[assetId].rootId}/${assetId}`)
          // );
        }
      }
    } catch (ex) {
      message.error(`Could not fetch asset.`);
      return;
    }
    requestedAssetIds[assetId] = false;
  };
}

export function fetchRootAssets() {
  return async (dispatch: Dispatch) => {
    // Skip if we did it before
    if (requestedAssetIds.root) {
      return;
    }
    requestedAssetIds.root = true;

    try {
      const { items: results } = await sdk.assets.list({
        filter: {
          root: true,
        },
      });

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => slimAssetObject(asset))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not fetch root assets.`);
      return;
    }
    requestedAssetIds.root = false;
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
          results.map(asset => slimAssetObject(asset))
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
        results.map(asset => slimAssetObject(asset))
      );
      dispatch({
        type: ADD_ASSETS,
        payload: { items },
      });
      if (
        results.length > 0 &&
        results[0].parentId &&
        results[0].id !== rootAssetId
      ) {
        dispatch(loadParentRecurse(results[0].parentId, rootAssetId));
      }
    } catch (ex) {
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
          results.map(asset => slimAssetObject(asset))
        );

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not fetch assets.`);
    }
  };
}

export function createNewAsset(
  newAsset: ExternalAssetItem,
  mappingInfo?: {
    modelId?: number;
    revisionId?: number;
    nodeId?: number;
  },
  callback?: (asset: Asset) => void
) {
  return async (dispatch: ThunkDispatch<any, any, AnyAction>) => {
    trackUsage('Assets.createNewAsset', {
      mappedTo3D: !!mappingInfo,
    });
    try {
      const results = await sdk.assets.create([
        {
          ...newAsset,
          metadata: {
            ...newAsset.metadata,
            COGNITE__GENERATED: 'true',
            COGNITE__SOURCE: 'discovery',
          },
        },
      ]);
      if (results) {
        const items = arrayToObjectById(
          results.map(asset => slimAssetObject(asset))
        );

        const assetId = results[0].id;

        if (mappingInfo) {
          const { modelId, revisionId, nodeId } = mappingInfo;
          if (modelId && revisionId && nodeId) {
            dispatch(
              createAssetNodeMapping(modelId, revisionId, nodeId, assetId)
            );
          } else if (modelId && revisionId) {
            dispatch(setRevisionRepresentAsset(modelId, revisionId, assetId));
          }
        }
        if (callback) {
          callback(results[0]);
        }

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      message.error(`Could not add assets.`);
    }
  };
}

export function editAsset(asset: AssetChange) {
  return async (dispatch: Dispatch<UpdateAction>) => {
    trackUsage('Assets.editAsset', {
      assetd: asset.update.externalId,
    });
    try {
      const results = await sdk.assets.update([asset]);

      if (results) {
        dispatch({
          type: UPDATE_ASSET,
          payload: {
            item: slimAssetObject(results[0]),
            assetId: results[0].id,
          },
        });
      }
    } catch (ex) {
      message.error(`Could not update asset.`);
    }
  };
}

export function deleteAsset(assetId: number) {
  return async (dispatch: Dispatch<DeleteAssetAction>) => {
    trackUsage('Assets.deleteAsset', {
      assetId,
    });
    try {
      const results = await sdk.assets.delete([{ id: assetId }], {
        recursive: true,
      });

      if (results) {
        dispatch({ type: DELETE_ASSETS, payload: { assetId } });
      }
    } catch (ex) {
      message.error(`Could not delete asset with children.`);
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
    case UPDATE_ASSET: {
      return {
        ...state,
        all: {
          ...state.all,
          [action.payload.assetId]: action.payload.item,
        },
      };
    }
    case DELETE_ASSETS: {
      const all = { ...state.all };
      delete all[action.payload.assetId];
      return {
        ...state,
        all,
      };
    }
    default:
      return state;
  }
}

const slimAssetObject = (asset: Asset): ExtendedAsset => ({
  id: asset.id,
  name: asset.name,
  rootId: asset.rootId,
  description: asset.description,
  parentId: asset.parentId,
  lastUpdatedTime: asset.lastUpdatedTime,
  createdTime: asset.createdTime,
  types: [],
  metadata: asset.metadata,
});

// Action creators
const setAssets = createAction(SET_ASSETS);

export const actions = {
  setAssets,
};

// Selectors
export const selectAssets = (state: RootState) => state.assets || initialState;
export const selectCurrentAsset = (state: RootState) =>
  state.app.assetId ? selectAssets(state).all[state.app.assetId] : undefined;
