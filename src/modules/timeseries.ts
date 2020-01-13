import { createAction } from 'redux-actions';
import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
  GetTimeSeriesMetadataDTO,
  TimeSeriesUpdate,
  IdEither,
} from '@cognite/sdk';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { arrayToObjectById, checkForAccessPermission } from '../utils/utils';
import { trackUsage } from '../utils/metrics';
import { setTimeseriesId } from './app';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';
export const DELETE_TIMESERIES = 'timeseries/DELETE_TIMESERIES';
export const REMOVE_ASSET_FROM_TIMESERIES =
  'timeseries/REMOVE_ASSET_FROM_TIMESERIES';

interface SetTimeseriesAction extends Action<typeof SET_TIMESERIES> {
  payload: { items: GetTimeSeriesMetadataDTO[]; assetId?: number };
}
interface RemoveAssetAction
  extends Action<typeof REMOVE_ASSET_FROM_TIMESERIES> {
  payload: { timeseriesId: number };
}
interface DeleteTimeseriesAction extends Action<typeof DELETE_TIMESERIES> {
  payload: { timeseriesId: number };
}
type TimeseriesAction =
  | SetTimeseriesAction
  | RemoveAssetAction
  | DeleteTimeseriesAction;

// Functions
export function fetchTimeseries(ids: IdEither[]) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    const results = await sdk.timeseries.retrieve(ids);
    dispatch({ type: SET_TIMESERIES, payload: { items: results } });
  };
}
export function fetchTimeseriesForAssetId(assetId: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    trackUsage('Timeseries.fetchTimeseriesForAssetId', {
      assetId,
    });
    const results = await sdk.timeseries.list({
      assetIds: [assetId],
      limit: 1000,
    });
    dispatch({
      type: SET_TIMESERIES,
      payload: { items: results.items, assetId },
    });
  };
}
export function fetchAndSetTimeseries(timeseriesId: number, redirect = false) {
  return async (dispatch: ThunkDispatch<any, any, AnyAction>) => {
    const results = await sdk.timeseries.retrieve([{ id: timeseriesId }]);
    dispatch({ type: SET_TIMESERIES, payload: { items: results } });
    dispatch(setTimeseriesId(timeseriesId, redirect));
  };
}
let searchTimeseriesId = 0;
export function searchTimeseries(query: string, assetId?: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    trackUsage('Timeseries.fetchTimeseriesForAssetId', {
      assetId,
      query,
    });
    searchTimeseriesId += 1;
    const id = searchTimeseriesId;
    const results = await sdk.timeseries.search({
      filter: {
        ...(assetId && { assetIds: [assetId] }),
      },
      limit: 1000,
      search: { query },
    });
    if (searchTimeseriesId === id) {
      dispatch({
        type: SET_TIMESERIES,
        payload: { items: results },
      });
      searchTimeseriesId = 0;
    }
  };
}

export function addTimeseriesToState(
  timeseriesToAdd: GetTimeSeriesMetadataDTO[]
) {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: SET_TIMESERIES,
      payload: {
        items: timeseriesToAdd,
      },
    });
  };
}

export const deleteTimeseries = (timeseriesId: number) => async (
  dispatch: Dispatch<DeleteTimeseriesAction>,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(
      getState().app.groups,
      'timeSeriesAcl',
      'WRITE',
      true
    )
  ) {
    return false;
  }
  trackUsage('Timeseries.deleteTimeseries', {
    timeseriesId,
  });
  try {
    const results = await sdk.timeseries.delete([{ id: timeseriesId }]);

    if (results) {
      dispatch({ type: DELETE_TIMESERIES, payload: { timeseriesId } });
    }
    return true;
  } catch (ex) {
    message.error(`Could not delete timeseries.`);
    return false;
  }
};

export const removeAssetFromTimeseries = (
  timeseriesId: number,
  assetId: number
) => async (
  dispatch: ThunkDispatch<any, void, AnyAction>,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(
      getState().app.groups,
      'timeSeriesAcl',
      'WRITE',
      true
    )
  ) {
    return;
  }
  trackUsage('Timeseries.removeAssetFromTimeseries', {
    assetId,
    timeseriesId,
  });
  await sdk.timeseries.update([
    {
      id: timeseriesId,
      update: {
        assetId: { setNull: true },
      },
    },
  ]);
  dispatch({
    type: REMOVE_ASSET_FROM_TIMESERIES,
    payload: { timeseriesId },
  });

  message.info(`Removed 1 timeseries from asset.`);
};

export const addTimeseriesToAsset = (
  timeseriesIds: number[],
  assetId: number
) => async (
  dispatch: ThunkDispatch<any, void, AnyAction>,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(
      getState().app.groups,
      'timeSeriesAcl',
      'WRITE',
      true
    )
  ) {
    return;
  }
  trackUsage('Timeseries.addTimeseriesToAsset', {
    assetId,
    timeseriesIds,
  });

  const changes = timeseriesIds.map(id => ({
    id,
    update: { assetId: { set: assetId } },
  }));
  await sdk.timeseries.update(changes);

  message.info(`Mapped ${timeseriesIds.length} timeseries to asset.`);

  setTimeout(() => {
    dispatch(fetchTimeseriesForAssetId(assetId));
  }, 1000);
};

export const updateTimeseries = (
  timeseriesId: number,
  update: TimeSeriesUpdate
) => async (
  dispatch: Dispatch<SetTimeseriesAction>,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(
      getState().app.groups,
      'timeSeriesAcl',
      'WRITE',
      true
    )
  ) {
    return;
  }
  trackUsage('Timeseries.updateTimeseries', {
    id: timeseriesId,
  });

  const updatedTimeseries = await sdk.timeseries.update([update]);
  dispatch({
    type: SET_TIMESERIES,
    payload: { items: updatedTimeseries },
  });
};

// Reducer
export interface TimeseriesState {
  timeseriesData: { [key: number]: GetTimeSeriesMetadataDTO };
  byAssetId: { [key: number]: number[] };
}
const initialState: TimeseriesState = { timeseriesData: {}, byAssetId: {} };

export default function timeseries(
  state = initialState,
  action: TimeseriesAction
): TimeseriesState {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items, assetId } = action.payload;
      return {
        ...state,
        timeseriesData: {
          ...state.timeseriesData,
          ...arrayToObjectById(items),
        },
        byAssetId: {
          ...state.byAssetId,
          ...(assetId && {
            [assetId]: items.map(el => el.id),
          }),
        },
      };
    }

    case REMOVE_ASSET_FROM_TIMESERIES: {
      const { timeseriesId } = action.payload;
      const { timeseriesData } = state;
      delete timeseriesData[timeseriesId];
      return {
        ...state,
        timeseriesData,
      };
    }
    case DELETE_TIMESERIES: {
      const { timeseriesId } = action.payload;
      const { timeseriesData, byAssetId } = state;
      if (timeseriesData[timeseriesId]) {
        const { assetId } = timeseriesData[timeseriesId];
        if (assetId && byAssetId[assetId]) {
          byAssetId[assetId] = byAssetId[assetId].filter(
            el => el !== timeseriesId
          );
        }
      }
      delete timeseriesData[timeseriesId];
      return {
        ...state,
        timeseriesData,
        byAssetId,
      };
    }
    default:
      return state;
  }
}

// Action creators
const setTimeseries = createAction(SET_TIMESERIES);

export const actions = {
  setTimeseries,
};

// Selectors
export const selectTimeseries = (state: RootState) => state.timeseries;
export const selectTimeseriesByAssetId = (
  state: RootState,
  assetId: number
) => {
  const tsForAsset = state.timeseries.byAssetId[assetId];
  if (tsForAsset) {
    return tsForAsset
      .map(id => state.timeseries.timeseriesData[id])
      .filter(el => !!el);
  }
  return tsForAsset;
};
