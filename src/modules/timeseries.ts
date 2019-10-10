import { createAction } from 'redux-actions';
import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { fetchEvents, createEvent } from './events';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { arrayToObjectById } from '../utils/utils';
import { trackUsage } from '../utils/metrics';
import { setTimeseriesId } from './app';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';
export const REMOVE_ASSET_FROM_TIMESERIES =
  'timeseries/REMOVE_ASSET_FROM_TIMESERIES';

interface SetTimeseriesAction extends Action<typeof SET_TIMESERIES> {
  payload: { items: GetTimeSeriesMetadataDTO[] };
}
interface RemoveAssetAction
  extends Action<typeof REMOVE_ASSET_FROM_TIMESERIES> {
  payload: { timeseriesId: number };
}
type TimeseriesAction = SetTimeseriesAction | RemoveAssetAction;

// Functions
export function fetchTimeseries(assetId: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    trackUsage('Timeseries.fetchTimeseries', {
      assetId,
    });
    const results = await sdk.timeseries.list({
      assetIds: [assetId],
      limit: 1000,
    });
    dispatch({ type: SET_TIMESERIES, payload: { items: results.items } });
  };
}
// Functions
export function fetchAndSetTimeseries(timeseriesId: number, redirect = false) {
  return async (dispatch: ThunkDispatch<any, any, AnyAction>) => {
    const results = await sdk.timeseries.retrieve([{ id: timeseriesId }]);
    dispatch({ type: SET_TIMESERIES, payload: { items: results } });
    dispatch(setTimeseriesId(timeseriesId, redirect));
  };
}
let searchTimeseriesId = 0;
// Functions
export function searchTimeseries(query: string, assetId?: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    trackUsage('Timeseries.fetchTimeseries', {
      assetId,
      query,
    });
    searchTimeseriesId += 1;
    const id = searchTimeseriesId;
    const results = await sdk.post(
      `/api/playground/projects/${sdk.project}/timeseries/search`,
      {
        data: {
          filter: {
            ...(assetId && { assetIds: [assetId] }),
          },
          limit: 1000,
          search: { query },
        },
      }
    );
    if (searchTimeseriesId === id) {
      dispatch({
        type: SET_TIMESERIES,
        payload: { items: results.data.items },
      });
      searchTimeseriesId = 0;
    }
  };
}

export function removeAssetFromTimeseries(
  timeseriesId: number,
  assetId: number
) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
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

    createEvent('removed_timeseries', 'Removed timeseries', [assetId], {
      removed: timeseriesId,
    });

    dispatch({
      type: REMOVE_ASSET_FROM_TIMESERIES,
      payload: { timeseriesId },
    });

    message.info(`Removed 1 timeseries from asset.`);

    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
    }, 1000);
  };
}

export function addTimeseriesToAsset(timeseriesIds: number[], assetId: number) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    trackUsage('Timeseries.addTimeseriesToAsset', {
      assetId,
      timeseriesIds,
    });

    const changes = timeseriesIds.map(id => ({
      id,
      update: { assetId: { set: assetId } },
    }));
    await sdk.timeseries.update(changes);

    // Create event for this mapping
    createEvent('attached_timeseries', 'Attached timeseries', [assetId], {
      added: JSON.stringify(timeseriesIds),
    });

    message.info(`Mapped ${timeseriesIds.length} timeseries to asset.`);

    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
    }, 1000);
  };
}

// Reducer
export interface TimeseriesState {
  timeseriesData: { [key: number]: GetTimeSeriesMetadataDTO };
}
const initialState: TimeseriesState = { timeseriesData: {} };

export default function timeseries(
  state = initialState,
  action: TimeseriesAction
): TimeseriesState {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        timeseriesData: {
          ...arrayToObjectById(items),
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
export const selectTimeseries = (state: RootState) =>
  state.timeseries || { items: [] };
