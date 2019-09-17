import { Action } from 'redux';
import { push, CallHistoryMethodAction } from 'connected-react-router';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../reducers/index';
import { AddNodeAssetMappingAction, ADD_ASSET_MAPPINGS } from './assetmappings';
import {
  UPDATE_REVISON,
  UpdateRevisionAction,
  AddRevisionAction,
  ADD_REVISIONS,
} from './threed';

// Constants
export const SET_APP_STATE = 'app/SET_APP_STATE';
export const CLEAR_APP_STATE = 'app/CLEAR_APP_STATE';

export interface SetAppStateAction extends Action<typeof SET_APP_STATE> {
  payload: {
    tenant?: string;
    modelId?: number;
    revisionId?: number;
    nodeId?: number;
    assetId?: number;
    rootAssetId?: number;
  };
}
interface ClearAppStateAction extends Action<typeof CLEAR_APP_STATE> {}

type AppAction =
  | SetAppStateAction
  | ClearAppStateAction
  | UpdateRevisionAction
  | AddRevisionAction
  | AddNodeAssetMappingAction;

export const setModelAndRevisionAndNode = (
  modelId: number,
  revisionId: number,
  nodeId?: number,
  redirect = true
) => async (
  dispatch: ThunkDispatch<
    any,
    any,
    SetAppStateAction | CallHistoryMethodAction
  >,
  getState: () => RootState
) => {
  const {
    threed: { representsAsset },
    assetMappings: { byNodeId },
    app: { tenant },
  } = getState();
  const rootAssetId = Object.keys(representsAsset).find(
    (assetId: string) =>
      representsAsset[Number(assetId)].revisionId === revisionId &&
      representsAsset[Number(assetId)].modelId === modelId
  );
  let currentAssetId;
  if (nodeId) {
    currentAssetId = byNodeId[nodeId];
  }
  dispatch({
    type: SET_APP_STATE,
    payload: {
      modelId,
      revisionId,
      nodeId,
      assetId:
        nodeId && rootAssetId && currentAssetId
          ? currentAssetId.assetId
          : undefined,
      rootAssetId: rootAssetId ? Number(rootAssetId) : undefined,
    },
  });
  if (redirect) {
    dispatch(push(`/${tenant}/models/${modelId}/${revisionId}/${nodeId}`));
  }
};

export const setAssetId = (
  rootAssetId: number,
  assetId: number,
  redirect = true
) => async (
  dispatch: ThunkDispatch<
    any,
    any,
    SetAppStateAction | CallHistoryMethodAction
  >,
  getState: () => RootState
) => {
  const {
    threed: { representsAsset },
    assetMappings: { byAssetId },
    app: { tenant },
  } = getState();
  const modelMapping = representsAsset[rootAssetId];
  const assetMapping = byAssetId[assetId];
  dispatch({
    type: SET_APP_STATE,
    payload: {
      modelId: modelMapping ? modelMapping.modelId : undefined,
      revisionId: modelMapping ? modelMapping.revisionId : undefined,
      nodeId: modelMapping && assetMapping ? assetMapping.nodeId : undefined,
      assetId,
      rootAssetId,
    },
  });
  if (redirect) {
    dispatch(push(`/${tenant}/asset/${rootAssetId}/${assetId}`));
  }
};

export const setTenant = (tenant: string, redirect = false) => async (
  dispatch: ThunkDispatch<any, any, SetAppStateAction | CallHistoryMethodAction>
) => {
  dispatch({
    type: SET_APP_STATE,
    payload: {
      tenant,
    },
  });
  if (redirect) {
    dispatch(push(`/${tenant}`));
  }
};

export const resetAppState = () => async (
  dispatch: ThunkDispatch<
    any,
    any,
    ClearAppStateAction | CallHistoryMethodAction
  >,
  getState: () => RootState
) => {
  const {
    app: { tenant },
  } = getState();
  dispatch({
    type: CLEAR_APP_STATE,
  });
  dispatch(push(`/${tenant}`));
};

// Reducer
export interface AppState {
  tenant?: string;
  modelId?: number;
  revisionId?: number;
  nodeId?: number;
  assetId?: number;
  rootAssetId?: number;
}
const initialState: AppState = {};

export default function app(state = initialState, action: AppAction): AppState {
  switch (action.type) {
    case SET_APP_STATE:
      // needed to trigger states properly
      return Object.assign({}, state, action.payload);
    case CLEAR_APP_STATE:
      return {
        ...state,
        modelId: undefined,
        revisionId: undefined,
        nodeId: undefined,
        assetId: undefined,
        rootAssetId: undefined,
      };
    case ADD_REVISIONS: {
      const { representsAsset } = action.payload;
      let rootAssetId;
      let mapping;
      if (state.modelId && state.revisionId) {
        rootAssetId = Object.keys(representsAsset).find(
          (assetId: string) =>
            representsAsset[Number(assetId)].revisionId === state.revisionId &&
            representsAsset[Number(assetId)].modelId === state.modelId
        );
      }
      if (state.rootAssetId) {
        mapping = representsAsset[state.rootAssetId];
      }
      return {
        ...state,
        ...(rootAssetId && { rootAssetId: Number(rootAssetId) }),
        ...mapping,
      };
    }
    case UPDATE_REVISON: {
      const { item, modelId, revisionId, assetId } = action.payload;
      if (
        (state.modelId === modelId && state.revisionId === revisionId) ||
        state.rootAssetId === assetId
      ) {
        if (item.metadata && item.metadata.representsAsset) {
          return { ...state, revisionId, modelId, rootAssetId: assetId };
        }
      }
      return state;
    }
    case ADD_ASSET_MAPPINGS: {
      const { mapping, modelId, revisionId } = action.payload;
      if (
        state.assetId === mapping.assetId ||
        state.nodeId === mapping.nodeId
      ) {
        return {
          ...state,
          modelId,
          revisionId,
          ...(state.assetId && { nodeId: mapping.nodeId }),
          ...(state.nodeId && { assetId: mapping.assetId }),
        };
      }
      return state;
    }
    default:
      return state;
  }
}

// Selectors
export const selectApp = (state: RootState) => state.app || {};
