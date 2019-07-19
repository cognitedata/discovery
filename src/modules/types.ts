import { createAction, Action } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { message } from 'antd';
// TODO(anders.hafreager) Fix this cycle import
// eslint-disable-next-line import/no-cycle
import { fetchAsset } from './assets';
import { fetchEvents, createEvent } from './events';
import { Dispatch } from 'redux';
import { AxiosResponse } from 'axios';
import { Asset } from '@cognite/sdk';
import { RootState } from '../reducers/index';

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

interface SetAction extends Action<{ items: Type[] }> {}

type TypeAction = SetAction;

// Functions
export function removeTypeFromAsset(type: Type, asset: Asset) {
  return async (dispatch: Dispatch) => {
    const body = {
      id: asset.id,
      types: {
        remove: [type.id]
      }
    };

    const { project } = sdk.configure({});
    await sdk.rawPost(`https://api.cognitedata.com/api/0.6/projects/${project}/assets/${asset.id}/update`, {
      data: body
    });

    createEvent('removed_type', 'Removed type', [asset.id], {
      removed: JSON.stringify({ id: type.id, name: type.name })
    });

    message.info(`Removed ${type.name} from ${asset.name}.`);

    // TODO it used to be wrapped in dispatch()
    fetchAsset(asset.id);
    fetchEvents(asset.id);
  };
}
export function addTypesToAsset(selectedTypes: Type[], asset: Asset) {
  return async (dispatch: Dispatch) => {
    // We here assume that we have the two fields confidence and source on all types
    const formattedTypes = selectedTypes.map((type: Type) => ({
      id: type.id,
      fields: type.fields.map(field => ({
        id: field.id,
        value: field.name === 'confidence' ? 1.0 : 'expert'
      }))
    }));

    const body = {
      id: asset.id,
      types: {
        add: formattedTypes
      }
    };

    const { project } = sdk.configure({});
    await sdk.rawPost(`https://api.cognitedata.com/api/0.6/projects/${project}/assets/${asset.id}/update`, {
      data: body
    });

    createEvent('added_type', 'Added type', [asset.id], {
      added: JSON.stringify({ types: selectedTypes })
    });

    message.info(`Added ${selectedTypes.length} types to ${asset.name}.`);
    fetchAsset(asset.id);
    fetchEvents(asset.id);
  };
}

export function fetchTypes() {
  return async (dispatch: Dispatch) => {
    // Skip if we did it before

    const { project } = sdk.configure({});
    const result = await sdk.rawGet(`https://api.cognitedata.com/api/0.6/projects/${project}/assets/types`);

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

export default function types(state = initialState, action: TypeAction): TypesState {
  switch (action.type) {
    case SET_TYPES: {
      const { items } = action.payload;
      return {
        ...state,
        items
      };
    }

    default:
      return state;
  }
}

// Action creators
const setTypes = createAction(SET_TYPES);

export const actions = {
  setTypes
};

// Selectors
export const selectTypes = (state: RootState) => state.types || { items: [] };
