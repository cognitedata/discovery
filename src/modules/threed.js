import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { arrayToObjectById } from '../utils/utils';

export const Revision = PropTypes.shape({
  id: PropTypes.number,
  metadata: PropTypes.objectOf(PropTypes.string),
  assetMappingCount: PropTypes.number,
});

export const Model = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  revisions: PropTypes.arrayOf(Revision),
});

export const Models = PropTypes.exact({
  items: PropTypes.objectOf(Model),
});

// Constants
export const SET_MODELS = 'threed/SET_MODELS';
export const ADD_REVISIONS = 'threed/ADD_REVISIONS';

// Reducer
const initialState = { items: {} };

export default function threed(state = initialState, action) {
  switch (action.type) {
    case SET_MODELS: {
      const items = { ...action.payload.items };
      return {
        ...state,
        items,
      };
    }
    case ADD_REVISIONS: {
      const { modelId, items } = action.payload;
      state.items[modelId].revisions = items;
      return {
        ...state,
      };
    }
    default:
      return state;
  }
}

// Action creators
const setModels = createAction(SET_MODELS);
const addRevisions = createAction(ADD_REVISIONS);

export const actions = {
  setModels,
  addRevisions,
};

// Selectors
export const selectModels = state => state.threed || { items: {} };

export function fetchRevisions(modelId) {
  return async dispatch => {
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/v1/projects/${project}/3d/models/${modelId}/revisions?limit=1000`
    );

    const result = requestResult.data;
    const { items } = result;

    dispatch({ type: ADD_REVISIONS, payload: { modelId, items } });
  };
}

export function fetchModels() {
  return async dispatch => {
    const result = await sdk.ThreeD.listModels({ limit: 1000 });

    const items = arrayToObjectById(result.items);
    result.items.forEach(model => {
      dispatch(fetchRevisions(model.id));
    });

    dispatch({ type: SET_MODELS, payload: { items } });
  };
}
