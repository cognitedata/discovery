import { Action } from 'redux';
import { push, CallHistoryMethodAction } from 'connected-react-router';
import { ThunkDispatch } from 'redux-thunk';
import { SingleCogniteCapability } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';

// Global Permissions
export const PERMISSIONS: { [key: string]: string[] } = {};

// Constants
export const SET_APP_STATE = 'app/SET_APP_STATE';
export const CLEAR_APP_STATE = 'app/CLEAR_APP_STATE';

export interface SetAppStateAction extends Action<typeof SET_APP_STATE> {
  payload: {
    loaded?: boolean;
    tenant?: string;
    cdfEnv?: string;
    groups?: { [key: string]: string[] };
  };
}
interface ClearAppStateAction extends Action<typeof CLEAR_APP_STATE> {}

type AppAction = SetAppStateAction | ClearAppStateAction;

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

    Object.keys(groups).forEach(key => {
      PERMISSIONS[key] = groups[key];
    });

    const status = await sdk.login.status();
    if (status) {
      PERMISSIONS.email = [status.user];
    }

    dispatch({
      type: SET_APP_STATE,
      payload: {
        groups,
        loaded: true,
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
  loaded: boolean;
  cdfEnv?: string;
  groups: { [key: string]: string[] };
}
const initialState: AppState = { groups: {}, loaded: false };

export default function app(state = initialState, action: AppAction): AppState {
  switch (action.type) {
    case SET_APP_STATE:
      // needed to trigger states properly
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Selectors
export const selectAppState = (state: RootState) => state.app || {};
