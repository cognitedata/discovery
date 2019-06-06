import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { message } from 'antd';
// TODO(anders.hafreager) Fix this cycle import
// eslint-disable-next-line import/no-cycle
import { fetchAsset } from './assets';
import { fetchEvents, createEvent } from './events';

// Constants
export const SET_TYPES = 'types/SET_TYPES';

export const Type = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  description: PropTypes.string,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      valueType: PropTypes.string,
    })
  ),
});

export const Types = PropTypes.exact({
  items: PropTypes.arrayOf(Type),
});

// Functions
export function removeTypeFromAsset(type, asset) {
  return async dispatch => {
    const body = {
      id: asset.id,
      types: {
        remove: [type.id],
      },
    };

    const { project } = sdk.configure({});
    await sdk.rawPost(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/${
        asset.id
      }/update`,
      { data: body }
    );

    createEvent('removed_type', 'Removed type', [asset.id], {
      removed: JSON.stringify({ id: type.id, name: type.name }),
    });

    message.info(`Removed ${type.name} from ${asset.name}.`);
    dispatch(fetchAsset(asset.id));
    dispatch(fetchEvents(asset.id));
  };
}
export function addTypesToAsset(typeIds, asset) {
  return async dispatch => {
    const formattedTypes = typeIds.map(id => ({
      id,
      fields: [
        {
          id: 6545982454552263,
          value: 1.0,
        },
        {
          id: 6199669604428227,
          value: 'expert',
        },
      ],
    }));

    const body = {
      id: asset.id,
      types: {
        add: formattedTypes,
      },
    };

    const { project } = sdk.configure({});
    await sdk.rawPost(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/${
        asset.id
      }/update`,
      { data: body }
    );

    createEvent('added_type', 'Added type', [asset.id], {
      added: JSON.stringify({ typeIds }),
    });

    message.info(`Added ${typeIds} types to ${asset.name}.`);
    dispatch(fetchAsset(asset.id));
    dispatch(fetchEvents(asset.id));
  };
}

export function fetchTypes() {
  return async dispatch => {
    // Skip if we did it before

    const { project } = sdk.configure({});
    const result = await sdk.rawGet(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/types`
    );

    const types_ = result.data.data.items;

    dispatch({ type: SET_TYPES, payload: { items: types_ } });
  };
}

// Reducer
const initialState = {};

export default function types(state = initialState, action) {
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
export const selectTypes = state => state.types || { items: [] };
