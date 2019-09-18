import { createAction } from 'redux-actions';
import { Dispatch, Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Revision3D, Model3D } from '@cognite/sdk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { arrayToObjectById } from '../utils/utils';
import { sdk } from '../index';

export interface ThreeDModel extends Model3D {
  id: number;
  revisions?: Revision3D[];
  metadata?: { [key: string]: string };
}

interface TBDRevision extends Revision3D {
  metadata?: { [key: string]: any };
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
export const LOAD_MODELS = 'threed/LOAD_MODELS';
export const SET_MODELS = 'threed/SET_MODELS';
export const UPDATE_REVISON = 'threed/UPDATE_REVISON';
export const ADD_REVISIONS = 'threed/ADD_REVISIONS';
export const SET_NODE = 'threed/SET_NODE';

interface LoadModelAction extends Action<typeof LOAD_MODELS> {}
interface SetModelAction extends Action<typeof SET_MODELS> {
  payload: { models: { [key: string]: ThreeDModel } };
}
export interface UpdateRevisionAction extends Action<typeof UPDATE_REVISON> {
  payload: {
    modelId: number;
    revisionId: number;
    assetId: number;
    item: TBDRevision;
  };
}
export interface AddRevisionAction extends Action<typeof ADD_REVISIONS> {
  payload: {
    modelId: number;
    revisions: Revision3D[];
    representsAsset: {
      [key: number]: {
        modelId: number;
        revisionId: number;
      };
    };
  };
}
interface SetNodeAction extends Action<typeof SET_NODE> {
  payload: { currentNode: any };
}
type ThreeDAction =
  | SetModelAction
  | SetNodeAction
  | AddRevisionAction
  | LoadModelAction
  | UpdateRevisionAction;

export function fetchRevisions(modelId: number) {
  return async (dispatch: Dispatch<AddRevisionAction>) => {
    const requestResult = await sdk.revisions3D.list(modelId, { limit: 1000 });
    if (requestResult) {
      const { items } = requestResult;
      const representsAssetMap = items.reduce(
        (prev, revision: TBDRevision) => {
          if (revision.metadata!.representsAsset) {
            const { representsAsset } = revision.metadata!;
            if (prev[Number(representsAsset)] === undefined) {
              // eslint-disable-next-line no-param-reassign
              prev[Number(representsAsset)] = {
                modelId,
                revisionId: revision.id,
              };
            }
          }
          return prev;
        },
        {} as { [key: number]: { modelId: number; revisionId: number } }
      );
      dispatch({
        type: ADD_REVISIONS,
        payload: {
          modelId,
          revisions: items,
          representsAsset: representsAssetMap,
        },
      });
    }
  };
}

export function setRevisionRepresentAsset(
  modelId: number,
  revisionId: number,
  assetId: number
) {
  return async (
    dispatch: Dispatch<UpdateRevisionAction>,
    getState: () => RootState
  ) => {
    try {
      const revision = getState().threed.models[modelId].revisions!.find(
        el => el.id === revisionId
      ) as TBDRevision;
      const [requestResult] = await sdk.revisions3D.update(modelId, [
        {
          id: revisionId,
          update: {
            // @ts-ignore
            metadata: {
              set: {
                ...revision.metadata,
                representsAsset: assetId,
              },
            },
          },
        },
      ]);
      if (requestResult) {
        dispatch({
          type: UPDATE_REVISON,
          payload: { modelId, revisionId, assetId, item: requestResult },
        });
      }
    } catch (ex) {
      message.error(
        `Unable to create mapping, make sure you have the right permission?`
      );
    }
  };
}

export function fetchNode(modelId: number, revisionId: number, nodeId: number) {
  return async (dispatch: Dispatch<SetNodeAction>) => {
    dispatch({ type: SET_NODE, payload: { currentNode: undefined } });

    const result = await sdk.viewer3D.listRevealNodes3D(modelId, revisionId, {
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
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    dispatch({
      type: LOAD_MODELS,
    });
    const requestResult = await sdk.models3D.list({ limit: 200 });
    if (requestResult) {
      const { items } = requestResult;
      // items.forEach(el => dispatch(fetchRevisions(el.id)));

      dispatch({
        type: SET_MODELS,
        payload: { models: arrayToObjectById(items) },
      });
    }
  };
}

// Reducer
export interface ThreeDState {
  representsAsset: { [key: number]: { modelId: number; revisionId: number } };
  models: { [key: string]: ThreeDModel };
  currentNode?: CurrentNode;
  loading: boolean;
}
const initialState: ThreeDState = {
  models: {},
  currentNode: undefined,
  loading: false,
  representsAsset: {},
};

export default function threed(
  state = initialState,
  action: ThreeDAction
): ThreeDState {
  switch (action.type) {
    case SET_MODELS: {
      const models = { ...action.payload.models };
      return {
        ...state,
        models,
      };
    }
    case LOAD_MODELS: {
      return {
        ...state,
        loading: true,
      };
    }
    case UPDATE_REVISON: {
      const { modelId, revisionId, assetId, item } = action.payload;
      const revisions = state.models[modelId].revisions || [];
      const index = revisions.findIndex(el => el.id === revisionId);
      if (index === -1) {
        // this should not happen....
        revisions.push(item);
      } else {
        revisions.splice(index, 1, item);
      }
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            revisions,
          },
        },
        representsAsset: {
          ...state.representsAsset,
          [assetId]: {
            modelId,
            revisionId,
          },
        },
      };
    }
    case ADD_REVISIONS: {
      const { modelId, revisions, representsAsset } = action.payload;
      // TODO, this is a hack!
      const newRepresentMap: {
        [key: number]: { modelId: number; revisionId: number };
      } = {
        ...state.representsAsset,
        ...representsAsset,
      };
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            revisions,
          },
        },
        loading: false,
        representsAsset: newRepresentMap,
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

// Selectors
export const selectThreeD = (state: RootState) =>
  state.threed || { models: {} };

// Action creators
const setModels = createAction(SET_MODELS);
const addRevisions = createAction(ADD_REVISIONS);

export const actions = {
  setModels,
  addRevisions,
};
