import { createAction } from 'redux-actions';
import { message } from 'antd';
import { Dispatch, AnyAction, Action } from 'redux';
import { Asset } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';
import { fetchAsset } from './assets';
import { fetchEvents } from './events';
import { RootState } from '../reducers/index';
import { sdk } from '../index';

// Constants
export const SET_TYPES = 'types/SET_TYPES';

export interface Type {
  id: number;
  name: string;
  description: string;
  fields: {
    id: number;
    name: string;
    description: string;
    valueType: string;
  }[];
}

interface SetAction extends Action<typeof SET_TYPES> {
  payload: { items: Type[] };
}

type TypeAction = SetAction;

// Functions
export function removeTypeFromAsset(type: Type, asset: Asset) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    const body = {
      id: asset.id,
      types: {
        remove: [type.id],
      },
    };

    const { project } = sdk;
    await sdk.post(
      `/api/0.6/projects/${project}/assets/${asset.id}/update`,
      {
        data: body,
      }
    );

    message.info(`Removed ${type.name} from ${asset.name}.`);

    dispatch(fetchAsset(asset.id));
    dispatch(fetchEvents(asset.id));
  };
}
export function addTypesToAsset(selectedTypes: Type[], asset: Asset) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    // We here assume that we have the two fields confidence and source on all types
    const formattedTypes = selectedTypes.map((type: Type) => ({
      id: type.id,
      fields: type.fields.map(field => ({
        id: field.id,
        value: field.name === 'confidence' ? 1.0 : 'expert',
      })),
    }));

    const body = {
      id: asset.id,
      types: {
        add: formattedTypes,
      },
    };

    const { project } = sdk;
    await sdk.post(
      `/api/0.6/projects/${project}/assets/${asset.id}/update`,
      {
        data: body,
      }
    );

    message.info(`Added ${selectedTypes.length} types to ${asset.name}.`);
    dispatch(fetchAsset(asset.id));
    dispatch(fetchEvents(asset.id));
  };
}

export function fetchTypes() {
  return async (dispatch: Dispatch) => {
    // Skip if we did it before

    const { project } = sdk;
    const result = await sdk.get(
      `/api/0.6/projects/${project}/assets/types`
    );

    if (result) {
      const { items }: { items: Type[] } = result.data.data;
      dispatch({ type: SET_TYPES, payload: { items } });
    }
  };
}

// Reducer
export interface TypesState {
  items?: Type[];
}
const initialState: TypesState = {};

export default function types(
  state = initialState,
  action: TypeAction
): TypesState {
  switch (action.type) {
    case SET_TYPES: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      };
    }

    default:
      return state;
  }
}

// Action creators
const setTypes = createAction(SET_TYPES);

export const actions = {
  setTypes,
};

// Selectors
export const selectTypes = (state: RootState) => state.types || { items: [] };
