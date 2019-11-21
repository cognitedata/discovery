import { Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { arrayToObjectById, checkForAccessPermission } from '../utils/utils';
import { AssetTypeInfo } from './assets';

// Constants
export const RETRIEVE_TYPE = 'types/RETRIEVE_TYPE';
export const RETRIEVE_TYPE_FAILED = 'types/RETRIEVE_TYPE_FAILED';
export const RETRIEVE_TYPE_FOR_ASSET = 'types/RETRIEVE_TYPE_FOR_ASSET';

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

interface FetchTypeForAssetAction
  extends Action<typeof RETRIEVE_TYPE_FOR_ASSET> {
  payload: { assetId: number; type: AssetTypeInfo[] };
}
interface FetchTypeAction extends Action<typeof RETRIEVE_TYPE> {
  payload: { types: Type[] };
}
interface FetchTypeFailedAction extends Action<typeof RETRIEVE_TYPE_FAILED> {}

type TypeAction =
  | FetchTypeForAssetAction
  | FetchTypeAction
  | FetchTypeFailedAction;

// Functions
export function fetchTypeForAsset(assetId: number) {
  return async (
    dispatch: ThunkDispatch<any, void, AnyAction>,
    getState: () => RootState
  ) => {
    try {
      const {
        types: { items },
        app: { groups },
      } = getState();
      if (!checkForAccessPermission(groups, 'typesAcl', 'READ', false)) {
        throw new Error('Missing ACL for types');
      }
      const { project } = sdk;
      const response = await sdk.post(
        `/api/playground/projects/${project}/assets/byids`,
        {
          data: {
            items: [{ id: assetId }],
          },
        }
      );

      if (response.status === 200 && response.data.items.length === 1) {
        const missingTypes = response.data.items[0].types.filter(
          (el: any) => items[el.type.id] === undefined
        );
        if (missingTypes.length > 0) {
          dispatch(fetchTypeByIds(missingTypes.map((el: any) => el.type.id)));
        }

        dispatch({
          type: RETRIEVE_TYPE_FOR_ASSET,
          payload: {
            assetId,
            type: response.data.items[0].types,
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
    dispatch: ThunkDispatch<any, void, FetchTypeAction | FetchTypeFailedAction>,
    getState: () => RootState
  ) => {
    try {
      const {
        app: { groups },
      } = getState();
      if (!checkForAccessPermission(groups, 'typesAcl', 'READ', false)) {
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
    dispatch: ThunkDispatch<any, void, FetchTypeAction | FetchTypeFailedAction>,
    getState: () => RootState
  ) => {
    try {
      const {
        app: { groups },
      } = getState();
      if (!checkForAccessPermission(groups, 'typesAcl', 'READ', false)) {
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

// Reducer
export interface TypesState {
  error: boolean;
  items: Type[];
  assetTypes: { [key: number]: AssetTypeInfo[] };
}
const initialState: TypesState = { assetTypes: {}, items: [], error: false };

export default function typesReducer(
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
    case RETRIEVE_TYPE_FOR_ASSET: {
      const { type, assetId } = action.payload;
      return {
        ...state,
        assetTypes: { ...state.assetTypes, [assetId]: type },
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

// Selectors
export const selectTypes = (state: RootState) => state.types;
