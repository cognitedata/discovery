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

export const ThreeD = PropTypes.exact({
  models: PropTypes.objectOf(Model),
  currentNode: PropTypes.shape({
    id: PropTypes.number,
    depth: PropTypes.number,
    name: PropTypes.string,
    boundingBox: PropTypes.shape({
      min: PropTypes.arrayOf(PropTypes.number),
      max: PropTypes.arrayOf(PropTypes.number),
    }),
  }),
});

// Constants
export const SET_MODELS = 'threed/SET_MODELS';
export const ADD_REVISIONS = 'threed/ADD_REVISIONS';
export const SET_NODE = 'threed/SET_NODE';

// Reducer
const initialState = { models: {} };

export default function threed(state = initialState, action) {
  switch (action.type) {
    case SET_MODELS: {
      const models = { ...action.payload.models };
      return {
        ...state,
        models,
      };
    }
    case ADD_REVISIONS: {
      const { modelId, revisions } = action.payload;
      state.models[modelId].revisions = revisions;
      return {
        ...state,
      };
    }
    case SET_NODE: {
      const { currentNode } = action.payload;
      const newState = {
        ...state,
        currentNode,
      };
      return newState;
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
export const selectThreeD = state => state.threed || { models: {} };

export function fetchRevisions(modelId) {
  return async dispatch => {
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/v1/projects/${project}/3d/models/${modelId}/revisions?limit=1000`
    );

    const result = requestResult.data;
    const { items } = result;

    dispatch({ type: ADD_REVISIONS, payload: { modelId, revisions: items } });
  };
}

export function fetchNode(modelId, revisionId, nodeId) {
  return async dispatch => {
    dispatch({ type: SET_NODE, payload: { currentNode: undefined } });

    const result = await sdk.ThreeD.listNodes(modelId, revisionId, {
      nodeId,
      limit: 1,
    });

    const { items } = result;
    if (items.length === 0) {
      return;
    }

    dispatch({ type: SET_NODE, payload: { currentNode: items[0] } });
  };
}

export function fetchModels() {
  return async dispatch => {
    const result = await sdk.ThreeD.listModels({ limit: 1000 });

    const items = arrayToObjectById(result.items);
    result.items.forEach(model => {
      dispatch(fetchRevisions(model.id));
    });

    dispatch({ type: SET_MODELS, payload: { models: items } });
  };
}
