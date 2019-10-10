import { Action } from 'redux';
import { CallHistoryMethodAction } from 'connected-react-router';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { AddNodeAssetMappingAction, ADD_ASSET_MAPPINGS } from './assetmappings';
import { trackUsage } from '../utils/metrics';
import { fetchAsset, AddAssetAction, ADD_ASSETS } from './assets';
import { EDIT_DATAKIT, EditDatakitAction } from './datakit';

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
    currentPage?: number;
    datakit?: string;
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
  | EditDatakitAction
  | AddAssetAction;

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
  trackUsage('App.setModelAndRevisionAndNode', {
    modelId,
    revisionId,
    nodeId,
  });
  const {
    threed: { representsAsset },
    assetMappings: { byNodeId },
    // app: { tenant },
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
    // dispatch(push(`/${tenant}/models/${modelId}/${revisionId}/${nodeId}`));
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
    threed: { representsAsset },
    assetMappings: { byAssetId },
    // app: { tenant },
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
    // dispatch(push(`/${tenant}/asset/${rootAssetId}/${assetId}`));
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
    threed: { representsAsset },
    assetMappings: { byAssetId },
    assets: { all },
    timeseries: { timeseriesData },
    // app: { tenant },
  } = getState();
  const timeseries = timeseriesData[timeseriesId];
  if (!timeseries) {
    message.error(`Unable to find timeseries`);
    return;
  }
  let assetId;
  let rootAssetId;
  let modelMapping;
  let assetMapping;

  if (timeseries.assetId) {
    // eslint-disable-next-line prefer-destructuring
    assetId = timeseries.assetId;
    if (all[assetId]) {
      rootAssetId = all[assetId].rootId;
      modelMapping = representsAsset[rootAssetId];
      assetMapping = byAssetId[assetId];
    } else {
      dispatch(fetchAsset(assetId, true));
    }
  }

  dispatch({
    type: SET_APP_STATE,
    payload: {
      modelId: modelMapping ? modelMapping.modelId : undefined,
      revisionId: modelMapping ? modelMapping.revisionId : undefined,
      nodeId: modelMapping && assetMapping ? assetMapping.nodeId : undefined,
      assetId,
      timeseriesId,
      rootAssetId,
    },
  });

  if (redirect && rootAssetId) {
    // dispatch(push(`/${tenant}/asset/${rootAssetId}/${assetId}`));
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
    // dispatch(push(`/${tenant}`));
  }
};

export const resetAppState = () => async (
  dispatch: ThunkDispatch<
    any,
    any,
    ClearAppStateAction | CallHistoryMethodAction
  >
  // getState: () => RootState
) => {
  // const {
  //   app: { tenant },
  // } = getState();
  dispatch({
    type: CLEAR_APP_STATE,
  });
  // dispatch(push(`/${tenant}`));
};
export const setAppDataKit = (datakit: string) => async (
  dispatch: ThunkDispatch<any, any, SetAppStateAction>
) => {
  dispatch({
    type: SET_APP_STATE,
    payload: {
      datakit,
    },
  });
};
export const setAppCurrentPage = (currentPage: number) => async (
  dispatch: ThunkDispatch<any, any, SetAppStateAction>
) => {
  dispatch({
    type: SET_APP_STATE,
    payload: {
      currentPage,
    },
  });
};

// Reducer
export interface AppState {
  currentPage: number;
  datakit?: string;
  tenant?: string;
  modelId?: number;
  timeseriesId?: number;
  revisionId?: number;
  nodeId?: number;
  assetId?: number;
  rootAssetId?: number;
}
const initialState: AppState = { currentPage: 0 };

export default function app(state = initialState, action: AppAction): AppState {
  switch (action.type) {
    case SET_APP_STATE:
      // needed to trigger states properly
      return Object.assign({}, state, action.payload);
    case CLEAR_APP_STATE:
      return {
        ...state,
        datakit: undefined,
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
    case EDIT_DATAKIT: {
      const { name, datakit } = action.payload;
      if (state.datakit === name && name !== datakit.name) {
        return {
          ...state,
          datakit: datakit.name,
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
