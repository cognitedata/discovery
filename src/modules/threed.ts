import { Dispatch, Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Revision3D, Model3D } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { arrayToObjectById } from '../utils/utils';
import { sdk } from '../index';
import { trackUsage } from '../utils/Metrics';
import { canReadThreeD } from '../utils/PermissionsUtils';

export interface ThreeDModel extends Model3D {
  id: number;
  revisions?: Revision3D[];
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
export const LOAD_MODELS = 'threed/LOAD_MODELS';
export const LOADED_MODELS = 'threed/LOADED_MODELS';
export const SET_MODELS = 'threed/SET_MODELS';
export const UPDATE_REVISON = 'threed/UPDATE_REVISON';
export const ADD_REVISIONS = 'threed/ADD_REVISIONS';

interface LoadModelAction extends Action<typeof LOAD_MODELS> {}
interface LoadedModelAction extends Action<typeof LOADED_MODELS> {}
interface SetModelAction extends Action<typeof SET_MODELS> {
  payload: { models: { [key: string]: ThreeDModel } };
}
export interface UpdateRevisionAction extends Action<typeof UPDATE_REVISON> {
  payload: {
    modelId: number;
    revisionId: number;
    assetId: number;
    item: Revision3D;
  };
}
export interface AddRevisionAction extends Action<typeof ADD_REVISIONS> {
  payload: {
    modelId: number;
    revisions: Revision3D[];
    byAssetId: {
      [key: number]: {
        modelId: number;
        revisionId: number;
      }[];
    };
  };
}

type ThreeDAction =
  | SetModelAction
  | AddRevisionAction
  | LoadModelAction
  | LoadedModelAction
  | UpdateRevisionAction;

// Reducer
export interface ThreeDState {
  byAssetId: { [key: number]: { modelId: number; revisionId: number }[] };
  models: { [key: string]: ThreeDModel };
  loading: boolean;
}

const initialState: ThreeDState = {
  models: {},
  loading: false,
  byAssetId: {},
};

export default function reducer(
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
    case LOADED_MODELS: {
      return {
        ...state,
        loading: false,
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
        byAssetId: {
          ...state.byAssetId,
          [assetId]: [
            ...(state.byAssetId[assetId] || []),
            {
              modelId,
              revisionId,
            },
          ],
        },
      };
    }
    case ADD_REVISIONS: {
      const { modelId, revisions, byAssetId } = action.payload;
      // TODO, replaced with relationships
      return {
        ...state,
        models: {
          ...state.models,
          [modelId]: {
            ...state.models[modelId],
            revisions,
          },
        },
        byAssetId: {
          ...state.byAssetId,
          ...byAssetId,
        },
      };
    }
    default:
      return state;
  }
}

export function fetchRevisions(modelId: number) {
  return async (
    dispatch: Dispatch<AddRevisionAction>,
    getState: () => RootState
  ) => {
    const { byAssetId: origRepresentsAsset } = getState().threed;
    const requestResult = await sdk.revisions3D.list(modelId, { limit: 1000 });
    if (requestResult) {
      const { items } = requestResult;
      const representsAssetMap = items.reduce((prev, revision: Revision3D) => {
        if (revision.metadata!.representsAsset) {
          const { representsAsset } = revision.metadata!;
          // eslint-disable-next-line no-param-reassign
          prev[Number(representsAsset)] = [
            ...(prev[Number(representsAsset)] ||
              origRepresentsAsset[Number(representsAsset)] ||
              []),
            {
              modelId,
              revisionId: revision.id,
            },
          ];
        }
        return prev;
      }, {} as { [key: number]: { modelId: number; revisionId: number }[] });
      dispatch({
        type: ADD_REVISIONS,
        payload: {
          modelId,
          revisions: items,
          byAssetId: representsAssetMap,
        },
      });
    }
  };
}

export function updateRevisionRepresentAsset(
  modelId: number,
  revisionId: number,
  assetId: number
) {
  return async (
    dispatch: Dispatch<UpdateRevisionAction>,
    getState: () => RootState
  ) => {
    if (!canReadThreeD()) {
      return;
    }
    trackUsage('3D.SetRevisionRepresentsAsset', {
      assetId,
      revisionId,
      modelId,
    });
    try {
      const revision = getState().threed.models[modelId].revisions!.find(
        el => el.id === revisionId
      ) as Revision3D;
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
      // eslint-disable-next-line no-console
      console.error(ex);
    }
  };
}

export function fetchModels() {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    if (!canReadThreeD()) {
      return;
    }
    dispatch({
      type: LOAD_MODELS,
    });
    try {
      const requestResult = await sdk.models3D.list({ limit: 200 });
      if (requestResult) {
        dispatch({
          type: SET_MODELS,
          payload: { models: arrayToObjectById(requestResult.items) },
        });

        const results = await Promise.all(
          requestResult.items.map(model =>
            sdk.revisions3D.list(model.id, {
              limit: 1000,
            })
          )
        );

        let cumulativeRepresentsAsset: {
          [key: number]: { modelId: number; revisionId: number }[];
        } = {};

        results.forEach((revisionResults, i) => {
          const modelId = requestResult.items[i].id;
          const { items } = revisionResults;
          cumulativeRepresentsAsset = items.reduce(
            (prev, revision: Revision3D) => {
              if (revision.metadata!.representsAsset) {
                const { representsAsset } = revision.metadata!;
                // eslint-disable-next-line no-param-reassign
                prev[Number(representsAsset)] = [
                  ...(prev[Number(representsAsset)] || []),
                  {
                    modelId,
                    revisionId: revision.id,
                  },
                ];
              }
              return prev;
            },
            cumulativeRepresentsAsset
          );
          dispatch({
            type: ADD_REVISIONS,
            payload: {
              modelId,
              revisions: items,
              representsAsset:
                i === results.length - 1 ? cumulativeRepresentsAsset : {},
            },
          });
        });
      }
      dispatch({
        type: LOADED_MODELS,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      dispatch({
        type: LOADED_MODELS,
      });
    }
  };
}

// Selectors
