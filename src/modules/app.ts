import { Action } from 'redux';
import { push, CallHistoryMethodAction } from 'connected-react-router';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { AddNodeAssetMappingAction, ADD_ASSET_MAPPINGS } from './assetmappings';
import { trackUsage } from '../utils/metrics';
import { fetchAsset, AddAssetAction, ADD_ASSETS } from './assets';
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
    timeseriesId?: number;
  };
}
interface ClearAppStateAction extends Action<typeof CLEAR_APP_STATE> {}

type AppAction =
  | SetAppStateAction
  | ClearAppStateAction
  | UpdateRevisionAction
  | AddRevisionAction
  | AddNodeAssetMappingAction
  | AddAssetAction;

const findBestRootAssetforModelAndRevision = (
  representsAsset: { [key: number]: { modelId: number; revisionId: number }[] },
  modelId: number,
  revisionId: number
) =>
  Object.keys(representsAsset).find(
    (assetId: string) =>
      representsAsset[Number(assetId)] &&
      representsAsset[Number(assetId)].find(
        el => el.revisionId === revisionId && el.modelId === modelId
      )
  );

export const setModelAndRevisionAndNode = (
  modelId?: number,
  revisionId?: number,
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
  trackUsage('App.setModelAndRevisionAndNode', {
    modelId,
    revisionId,
    nodeId,
  });
  if (!modelId || !revisionId) {
    dispatch({
      type: SET_APP_STATE,
      payload: {
        modelId,
        revisionId,
        nodeId,
      },
    });
    return;
  }
  const {
    threed: { representsAsset },
    assetMappings: { byNodeId },
    app: { tenant },
  } = getState();
  const newRootAssetId = findBestRootAssetforModelAndRevision(
    representsAsset,
    modelId,
    revisionId
  );
  let currentAssetId: number | undefined;
  if (nodeId) {
    currentAssetId = byNodeId[nodeId] ? byNodeId[nodeId].assetId : undefined;
  } else {
    currentAssetId = newRootAssetId ? Number(newRootAssetId) : undefined;
  }
  dispatch({
    type: SET_APP_STATE,
    payload: {
      modelId,
      revisionId,
      nodeId,
      assetId: currentAssetId,
      rootAssetId: newRootAssetId ? Number(newRootAssetId) : undefined,
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
  trackUsage('App.setAssetId', {
    assetId,
  });
  const {
    assetMappings: { byAssetId },
    app: { tenant },
  } = getState();
  const assetMapping = byAssetId[assetId];
  dispatch({
    type: SET_APP_STATE,
    payload: {
      revisionId: assetMapping ? assetMapping.nodeId : undefined,
      modelId: assetMapping ? assetMapping.modelId : undefined,
      nodeId: assetMapping ? assetMapping.nodeId : undefined,
      assetId,
      rootAssetId,
    },
  });
  if (redirect) {
    dispatch(push(`/${tenant}/asset/${rootAssetId}/${assetId}`));
  }
};

export const setTimeseriesId = (
  timeseriesId?: number,
  redirect = false
) => async (
  dispatch: ThunkDispatch<
    any,
    any,
    SetAppStateAction | CallHistoryMethodAction
  >,
  getState: () => RootState
) => {
  trackUsage('App.setTimeseriesId', {
    timeseriesId,
  });
  if (!timeseriesId) {
    dispatch({
      type: SET_APP_STATE,
      payload: {
        timeseriesId,
      },
    });
    return;
  }
  const {
    assetMappings: { byAssetId },
    assets: { all },
    timeseries: { timeseriesData },
    app: { tenant },
  } = getState();
  const timeseries = timeseriesData[timeseriesId];
  if (!timeseries) {
    message.error(`Unable to find timeseries`);
    return;
  }
  let assetId;
  let rootAssetId;
  let assetMapping;

  if (timeseries.assetId) {
    // eslint-disable-next-line prefer-destructuring
    assetId = timeseries.assetId;
    if (all[assetId]) {
      rootAssetId = all[assetId].rootId;
      assetMapping = byAssetId[assetId];
    } else {
      dispatch(fetchAsset(assetId, true));
    }
  }

  dispatch({
    type: SET_APP_STATE,
    payload: {
      modelId: assetMapping ? assetMapping.modelId : undefined,
      revisionId: assetMapping ? assetMapping.revisionId : undefined,
      nodeId: assetMapping ? assetMapping.nodeId : undefined,
      assetId,
      timeseriesId,
      rootAssetId,
    },
  });

  if (redirect && rootAssetId) {
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
  timeseriesId?: number;
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
      return { ...state, ...action.payload };
    case CLEAR_APP_STATE:
      return {
        ...state,
        timeseriesId: undefined,
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
        rootAssetId = findBestRootAssetforModelAndRevision(
          representsAsset,
          state.modelId,
          state.revisionId
        );
      }
      if (state.rootAssetId) {
        mapping = representsAsset[state.rootAssetId];
      }
      return {
        ...state,
        ...(rootAssetId && { rootAssetId: Number(rootAssetId) }),
        ...(!state.assetId && rootAssetId && { assetId: Number(rootAssetId) }),
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
    case ADD_ASSETS: {
      const { items } = action.payload;
      const { assetId } = state;
      const asset = assetId ? items[assetId] : undefined;
      if (asset) {
        return {
          ...state,
          rootAssetId: asset.rootId,
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
