import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';
import { arrayToObjectById } from '../utils/utils';
import { Dispatch, Action, AnyAction } from 'redux';
import { RootState } from '../reducers/index';
import { Revision, Model } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';

export interface ThreeDModel extends Model {
  revisions?: Revision[];
  metadata?: { [key: string]: string };
}

export interface CurrentNode {
  id: number;
  depth: number;
  name: string;
  boundingBox: {
    min: number[];
    max: number[];
  };
}

// Constants
export const SET_MODELS = 'threed/SET_MODELS';
export const ADD_REVISIONS = 'threed/ADD_REVISIONS';
export const SET_NODE = 'threed/SET_NODE';

interface SetModelAction extends Action<typeof SET_MODELS> {
  payload: { models: { [key: string]: Model } };
}
interface AddRevisionAction extends Action<typeof ADD_REVISIONS> {
  payload: { modelId: number; revisions: Revision[] };
}
interface SetNodeAction extends Action<typeof SET_NODE> {
  payload: { currentNode: any };
}
type ThreeDAction = SetModelAction | SetNodeAction | AddRevisionAction;

export function fetchRevisions(modelId: number) {
  return async (dispatch: Dispatch<AddRevisionAction>) => {
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(
      `https://api.cognitedata.com/api/v1/projects/${project}/3d/models/${modelId}/revisions?limit=1000`
    );
    if (requestResult) {
      const result = requestResult.data;
      const { items }: { items: Revision[] } = result;

      dispatch({ type: ADD_REVISIONS, payload: { modelId, revisions: items } });
    }
  };
}

export function fetchNode(modelId: number, revisionId: number, nodeId: number) {
  return async (dispatch: Dispatch<SetNodeAction>) => {
    dispatch({ type: SET_NODE, payload: { currentNode: undefined } });

    const result = await sdk.ThreeD.listNodes(modelId, revisionId, {
      nodeId,
      limit: 1
    });

    const { items } = result;
    if (items.length === 0) {
      return;
    }

    dispatch({ type: SET_NODE, payload: { currentNode: items[0] } });
  };
}

export function fetchModels() {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    const { project } = sdk.configure({});
    const requestResult = await sdk.rawGet(`https://api.cognitedata.com/api/v1/projects/${project}/3d/models/`);
    if (requestResult) {
      const result = requestResult.data;
      const { items }: { items: ThreeDModel[] } = result;

      items.forEach(model => {
        dispatch(fetchRevisions(model.id));
      });

      dispatch({
        type: SET_MODELS,
        payload: { models: arrayToObjectById(items) }
      });
    }
  };
}

// Reducer
export interface ThreeDState {
  models: { [key: string]: ThreeDModel };
  currentNode?: CurrentNode;
}
const initialState: ThreeDState = { models: {}, currentNode: undefined };

export default function threed(state = initialState, action: ThreeDAction): ThreeDState {
  switch (action.type) {
    case SET_MODELS: {
      const models = { ...action.payload.models };
      return {
        ...state,
        models
      };
    }
    case ADD_REVISIONS: {
      const { modelId, revisions } = action.payload;
      state.models[modelId].revisions = revisions;
      return {
        ...state
      };
    }
    case SET_NODE: {
      const { currentNode } = action.payload;
      const newState = {
        ...state,
        currentNode
      };
      return newState;
    }
    default:
      return state;
  }
}

// Selectors
export const selectThreeD = (state: RootState) => state.threed || { models: {} };

// Action creators
const setModels = createAction(SET_MODELS);
const addRevisions = createAction(ADD_REVISIONS);

export const actions = {
  setModels,
  addRevisions
};
