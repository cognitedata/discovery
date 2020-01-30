import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { Asset, ExternalAssetItem, AssetChange, IdEither } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';
import { push } from 'connected-react-router';
import { arrayToObjectById, isInternalId } from '../utils/utils';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { createAssetNodeMapping } from './assetmappings';
import { updateRevisionRepresentAsset } from './threed';
import { trackUsage } from '../utils/Metrics';
import { fetchTypeForAssets } from './types';
import { canEditAssets, canReadAssets } from '../utils/PermissionsUtils';

// Constants
export const ADD_ASSETS = 'assets/ADD_ASSETS';
export const UPDATE_ASSET = 'assets/UPDATE_ASSET';
export const DELETE_ASSETS = 'assets/DELETE_ASSETS';

export interface AssetTypeInfo {
  type: {
    id: number;
    version: number;
    externalId: string;
  };
  object: any;
}

export interface ExtendedAsset extends Asset {
  rootId: number;
  types: AssetTypeInfo[];
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

type AssetAction = AddAssetAction | DeleteAssetAction | UpdateAction;

// Reducer
export interface AssetsState {
  items: { [key: string]: ExtendedAsset };
  byExternalId: { [key: string]: number };
}

const initialState: AssetsState = { items: {}, byExternalId: {} };

export default function reducer(
  state = initialState,
  action: AssetAction
): AssetsState {
  switch (action.type) {
    case ADD_ASSETS: {
      const items = { ...state.items, ...action.payload.items };
      return {
        ...state,
        items,
        byExternalId: {
          ...state.byExternalId,
          ...Object.values(action.payload.items).reduce((prev, el) => {
            if (el.externalId) {
              // eslint-disable-next-line no-param-reassign
              prev[el.externalId] = el.id;
            }
            return prev;
          }, {} as { [key: string]: number }),
        },
      };
    }
    case UPDATE_ASSET: {
      return {
        ...state,
        items: {
          ...state.items,
          [action.payload.assetId]: action.payload.item,
        },
      };
    }
    case DELETE_ASSETS: {
      const items = { ...state.items };
      delete items[action.payload.assetId];
      return {
        ...state,
        items,
      };
    }
    default:
      return state;
  }
}

// Functions
export function addAssetsToState(assetsToAdd: Asset[]) {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: ADD_ASSETS,
      payload: {
        items: arrayToObjectById(
          assetsToAdd.map((asset: Asset) => slimAssetObject(asset))
        ),
      },
    });
  };
}

type RequestedAssetIds = { [key: string]: boolean };

const requestedAssetIds: RequestedAssetIds = {};

export function fetchAsset(assetId: number, redirect = false) {
  return async (
    dispatch: ThunkDispatch<any, any, AnyAction>,
    getState: () => RootState
  ) => {
    if (!canReadAssets()) {
      return;
    }
    // Skip if we did it before
    if (requestedAssetIds[assetId]) {
      return;
    }
    requestedAssetIds[assetId] = true;

    const results = await sdk.assets.retrieve([{ id: assetId }]);

    if (results) {
      const items = arrayToObjectById(
        results.map(asset => slimAssetObject(asset))
      );

      dispatch({ type: ADD_ASSETS, payload: { items } });
      if (redirect) {
        const {
          app: { tenant },
        } = getState();
        dispatch(
          push(
            `/${tenant}/asset/${items[assetId].rootId}/${assetId}${window.location.search}${window.location.hash}`
          )
        );
      }
    }
    requestedAssetIds[assetId] = false;
  };
}

export function loadAssetChildren(assetId: number) {
  return async (dispatch: Dispatch) => {
    if (!canReadAssets()) {
      return;
    }
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
    if (!canReadAssets()) {
      return;
    }
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

export function fetchAssets(assetIds: IdEither[], isRetry = false) {
  return async (dispatch: ThunkDispatch<AnyAction, any, any>) => {
    if (!canReadAssets()) {
      return;
    }
    if (assetIds.length === 0) {
      return;
    }

    try {
      const results = await sdk.assets.retrieve(assetIds);

      if (results) {
        const items = arrayToObjectById(
          results.map(asset => slimAssetObject(asset))
        );

        dispatch(fetchTypeForAssets(results.map(el => el.id)));

        dispatch({ type: ADD_ASSETS, payload: { items } });
      }
    } catch (ex) {
      if (isRetry) {
        message.error(`Could not fetch assets.`);
      } else {
        const failed: IdEither[] = ex.errors.reduce(
          (prev: IdEither[], error: { missing?: IdEither[] }) =>
            prev.concat(error.missing || []),
          [] as IdEither[]
        );
        dispatch(
          fetchAssets(
            assetIds.filter(
              (el: any) =>
                !failed.find((fail: any) => {
                  if (isInternalId(el)) {
                    return fail.id === el.id;
                  }
                  return fail.externalId === el.externalId;
                })
            ),
            true
          )
        );
        dispatch(
          fetchAssets(
            failed
              .map(el => {
                if (isInternalId(el)) {
                  return { externalId: `${el.id}` };
                }
                return undefined;
              })
              .filter(el => !!el) as IdEither[],
            true
          )
        );
      }
    }
  };
}

export const createNewAsset = (
  newAsset: ExternalAssetItem,
  mappingInfo?: {
    modelId?: number;
    revisionId?: number;
    nodeId?: number;
  },
  callback?: (asset: Asset) => void
) => async (dispatch: ThunkDispatch<any, any, AnyAction>) => {
  if (!canEditAssets()) {
    return;
  }
  trackUsage('Assets.CreateNewAsset', {
    mappedTo3D: !!mappingInfo,
  });
  try {
    const results = await sdk.assets.create([
      {
        ...newAsset,
        metadata: {
          ...newAsset.metadata,
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
          dispatch(updateRevisionRepresentAsset(modelId, revisionId, assetId));
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

export function editAsset(asset: AssetChange) {
  return async (dispatch: Dispatch<UpdateAction>) => {
    if (!canEditAssets()) {
      return;
    }
    trackUsage('Assets.EditAsset', {});
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

export const deleteAsset = (assetId: number) => async (
  dispatch: Dispatch<DeleteAssetAction>
) => {
  if (!canEditAssets()) {
    return;
  }
  trackUsage('Assets.DeleteAsset', {
    id: assetId,
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

const slimAssetObject = (asset: Asset): ExtendedAsset => ({
  id: asset.id,
  externalId: asset.externalId,
  name: asset.name,
  rootId: asset.rootId,
  description: asset.description,
  parentId: asset.parentId,
  lastUpdatedTime: asset.lastUpdatedTime,
  createdTime: asset.createdTime,
  types: [],
  metadata: asset.metadata,
});

// Selectors
export const selectAssetById = (state: RootState, id: number) =>
  state.assets.items[id];
