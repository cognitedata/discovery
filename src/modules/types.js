import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

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

export function fetchTypes() {
  return async dispatch => {
    // Skip if we did it before

    const { project } = sdk.configure({});
    const result = await sdk.rawGet(
      `https://api.cognitedata.com/api/0.6/projects/${project}/assets/types`
    );

    const types = result.data.data.items;
    console.log('Got the types: ', types);

    dispatch({ type: SET_TYPES, payload: { items: types } });
  };
}

// Reducer
const initialState = {};

export default function assets(state = initialState, action) {
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
