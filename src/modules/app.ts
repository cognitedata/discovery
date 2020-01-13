import { Action } from 'redux';
import { push, CallHistoryMethodAction } from 'connected-react-router';
import { ThunkDispatch } from 'redux-thunk';
import { message } from 'antd';
import { SingleCogniteCapability } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { AddNodeAssetMappingAction, ADD_ASSET_MAPPINGS } from './assetmappings';
import { trackUsage } from '../utils/metrics';
import { fetchAsset, AddAssetAction, ADD_ASSETS } from './assets';
import { sdk } from '../index';
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
    cdfEnv?: string;
    revisionId?: number;
    nodeId?: number;
    assetId?: number;
    rootAssetId?: number;
    timeseriesId?: number;
    groups?: { [key: string]: string[] };
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
    dispatch(
      push(
        `/${tenant}/models/${modelId}/${revisionId}/${nodeId}${window.location.search}${window.location.hash}`
      )
    );
  }
};

export const setAssetId = (
  rootAssetId: number,
  assetId?: number,
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
    rootAssetId,
  });
  const {
    assetMappings: { byAssetId },
    threed: { representsAsset },
    app: { tenant, revisionId, modelId },
  } = getState();
  let newModelId;
  let newRevisionId;
  const currentModelSelected =
    representsAsset[rootAssetId] &&
    representsAsset[rootAssetId].find(
      el => el.revisionId === revisionId && el.modelId === modelId
    ) !== undefined;

  if (!revisionId && !modelId) {
    if (
      representsAsset[rootAssetId] &&
      representsAsset[rootAssetId].length === 1
    ) {
      newModelId = representsAsset[rootAssetId][0].modelId;
      newRevisionId = representsAsset[rootAssetId][0].revisionId;
    }
  }

  if (currentModelSelected) {
    newModelId = modelId;
    newRevisionId = revisionId;
  }
  const assetMapping = assetId ? byAssetId[assetId] : undefined;
  dispatch({
    type: SET_APP_STATE,
    payload: {
      revisionId: newRevisionId,
      modelId: newModelId,
      nodeId: assetMapping ? assetMapping.nodeId : undefined,
      assetId,
      rootAssetId,
    },
  });
  if (redirect) {
    dispatch(
      push(
        `/${tenant}/asset/${rootAssetId}/${assetId}${window.location.search}${window.location.hash}`
      )
    );
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
    dispatch(
      push(
        `/${tenant}/asset/${rootAssetId}/${assetId}${window.location.search}${window.location.hash}`
      )
    );
  }
};

export const fetchUserGroups = () => async (
  dispatch: ThunkDispatch<any, any, SetAppStateAction | CallHistoryMethodAction>
) => {
  try {
    const response = await sdk.groups.list();

    const groups = response.reduce(
      (prev, current) => {
        const a = {
          ...prev,
        };
        // @ts-ignore
        const { capabilities, permissions } = current;
        if (permissions) {
          a.assetsAcl = (a.assetsAcl || []).concat(permissions.accessTypes);
          a.filesAcl = (a.filesAcl || []).concat(permissions.accessTypes);
          a.timeSeriesAcl = (a.timeSeriesAcl || []).concat(
            permissions.accessTypes
          );
        }
        if (capabilities) {
          capabilities.forEach((capability: SingleCogniteCapability) => {
            Object.keys(capability).forEach(key => {
              if (a[key]) {
                // @ts-ignore
                capability[key].actions.forEach(el => {
                  if (a[key].indexOf(el) === -1) {
                    a[key].push(el);
                  }
                });
              } else {
                // @ts-ignore
                a[key] = capability[key].actions;
              }
            });
          });
        }
        return a;
      },
      { groupsAcl: ['LIST'] } as { [key: string]: string[] }
    );

    dispatch({
      type: SET_APP_STATE,
      payload: {
        groups,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      'Unable to load user permissions (missing permission groupsAcl:LIST)'
    );
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
    dispatch(
      push(`/${tenant}${window.location.search}${window.location.hash}`)
    );
  }
};
export const setCdfEnv = (env?: string) => async (
  dispatch: ThunkDispatch<any, any, SetAppStateAction | CallHistoryMethodAction>
) => {
  if (env) {
    sdk.setBaseUrl(`https://${env}.cognitedata.com`);
  }
  dispatch({
    type: SET_APP_STATE,
    payload: {
      cdfEnv: env,
    },
  });
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
  dispatch(push(`/${tenant}${window.location.search}${window.location.hash}`));
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
  cdfEnv?: string;
  groups: { [key: string]: string[] };
}
const initialState: AppState = { groups: {} };

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
      if (state.rootAssetId && representsAsset[state.rootAssetId]) {
        mapping =
          representsAsset[state.rootAssetId].length === 1
            ? representsAsset[state.rootAssetId][0]
            : {
                revisionId: state.revisionId,
                modelId: state.modelId,
              };
      }
      return {
        ...state,
        ...(rootAssetId && { rootAssetId: Number(rootAssetId) }),
        ...(!state.assetId && // Only set when theres no current Asset or Node selected
          !state.nodeId &&
          rootAssetId && { assetId: Number(rootAssetId) }),
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
export const selectAppState = (state: RootState) => state.app || {};
