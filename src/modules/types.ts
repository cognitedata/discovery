import { Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { arrayToObjectById } from '../utils/utils';

// Constants
export const RETRIEVE_TYPE = 'types/RETRIEVE_TYPE';
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
  payload: { assetId: number; type: any[] };
}
interface FetchTypeAction extends Action<typeof RETRIEVE_TYPE> {
  payload: { types: Type[] };
}

type TypeAction = FetchTypeForAssetAction | FetchTypeAction;

// Functions
export function fetchTypeForAsset(assetId: number) {
  return async (
    dispatch: ThunkDispatch<any, void, AnyAction>,
    getState: () => RootState
  ) => {
    const { project } = sdk;
    const { items } = getState().types;
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
  };
}

export function fetchTypes() {
  return async (dispatch: ThunkDispatch<any, void, FetchTypeAction>) => {
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
  };
}
export function fetchTypeByIds(typeIds: number[]) {
  return async (dispatch: ThunkDispatch<any, void, FetchTypeAction>) => {
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
  };
}

// Reducer
export interface TypesState {
  items: Type[];
  assetTypes: { [key: number]: any };
}
const initialState: TypesState = { assetTypes: {}, items: [] };

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

    default:
      return state;
  }
}

// Selectors
export const selectTypes = (state: RootState) => state.types;
