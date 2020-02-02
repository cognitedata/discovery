import { Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { arrayToObjectById } from '../utils/utils';
import { AssetTypeInfo, ExtendedAsset } from './assets';
import { canReadTypes } from '../utils/PermissionsUtils';

// Constants
export const RETRIEVE_TYPE = 'types/RETRIEVE_TYPE';
export const RETRIEVE_TYPE_FAILED = 'types/RETRIEVE_TYPE_FAILED';
export const RETRIEVE_TYPE_FOR_ASSETS = 'types/RETRIEVE_TYPE_FOR_ASSETS';

export interface Type {
  name: string;
  description: string;
  properties: [
    {
      propertyId: string;
      name: string;
      description: string;
      type: string;
    }
  ];
  parentType: {
    id: number;
    version: number;
  };
  id: number;
  externalId?: number;
  version: number;
  createdTime: number;
  lastUpdatedTime: number;
}

interface FetchTypeForAssetsAction
  extends Action<typeof RETRIEVE_TYPE_FOR_ASSETS> {
  payload: { byAssetId: { [key: number]: AssetTypeInfo[] } };
}
interface FetchTypeAction extends Action<typeof RETRIEVE_TYPE> {
  payload: { types: Type[] };
}
interface FetchTypeFailedAction extends Action<typeof RETRIEVE_TYPE_FAILED> {}

type TypeAction =
  | FetchTypeForAssetsAction
  | FetchTypeAction
  | FetchTypeFailedAction;

// Reducer
export interface TypesState {
  error: boolean;
  items: { [key: number]: Type };
  byAssetId: { [key: number]: AssetTypeInfo[] };
}

const initialState: TypesState = { byAssetId: {}, items: {}, error: false };

export default function reducer(
  state = initialState,
  action: TypeAction
): TypesState {
  switch (action.type) {
    case RETRIEVE_TYPE: {
      const { types } = action.payload;
      return {
        ...state,
        items: { ...state.items, ...arrayToObjectById(types) },
      };
    }
    case RETRIEVE_TYPE_FOR_ASSETS: {
      const { byAssetId } = action.payload;
      return {
        ...state,
        byAssetId: { ...state.byAssetId, ...byAssetId },
      };
    }
    case RETRIEVE_TYPE_FAILED: {
      return {
        ...state,
        error: true,
      };
    }

    default:
      return state;
  }
}

// Functions
export function fetchTypeForAssets(assetIds: number[]) {
  return async (
    dispatch: ThunkDispatch<any, void, AnyAction>,
    getState: () => RootState
  ) => {
    try {
      const {
        types: { items },
      } = getState();
      if (!canReadTypes(false)) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/assets/byids`,
        {
          data: {
            items: assetIds.map(id => ({ id })),
          },
        }
      );

      if (response.status === 200 && response.data.items.length > 0) {
        const missingTypes: Set<number> = response.data.items.reduce(
          (prev: Set<number>, asset: ExtendedAsset) => {
            if (asset.types) {
              asset.types
                .filter(el => items[el.type.id] === undefined)
                .forEach(el => {
                  prev.add(el.type.id);
                });
            }
            return prev;
          },
          new Set()
        );
        if (missingTypes.size > 0) {
          dispatch(fetchTypeByIds(Array.from(missingTypes)));
        }

        dispatch({
          type: RETRIEVE_TYPE_FOR_ASSETS,
          payload: {
            byAssetId: response.data.items.reduce(
              (prev: { [key: number]: AssetTypeInfo[] }, el: ExtendedAsset) => {
                return { ...prev, [el.id]: el.types || [] };
              },
              {}
            ),
          },
        });
      }
    } catch (e) {
      dispatch({
        type: RETRIEVE_TYPE_FAILED,
      });
    }
  };
}

export function fetchTypes() {
  return async (
    dispatch: ThunkDispatch<any, void, FetchTypeAction | FetchTypeFailedAction>
  ) => {
    try {
      if (!canReadTypes(false)) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/types/list`,
        {
          data: {},
        }
      );

      dispatch({
        type: RETRIEVE_TYPE,
        payload: {
          types: response.data.items as Type[],
        },
      });
    } catch (e) {
      dispatch({
        type: RETRIEVE_TYPE_FAILED,
      });
    }
  };
}
export function fetchTypeByIds(typeIds: number[]) {
  return async (
    dispatch: ThunkDispatch<any, void, FetchTypeAction | FetchTypeFailedAction>
  ) => {
    try {
      if (!canReadTypes()) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/types/byids`,
        {
          data: {
            items: typeIds.map(id => ({ id })),
          },
        }
      );

      dispatch({
        type: RETRIEVE_TYPE,
        payload: {
          types: response.data.items as Type[],
        },
      });
    } catch (e) {
      dispatch({
        type: RETRIEVE_TYPE_FAILED,
      });
    }
  };
}
