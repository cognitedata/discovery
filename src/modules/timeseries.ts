import { message } from 'antd';
import { Dispatch, Action } from 'redux';
import {
  GetTimeSeriesMetadataDTO,
  TimeSeriesUpdate,
  IdEither,
} from '@cognite/sdk';
import { sdk } from 'modules/app';
import { RootState } from '../reducers';
import { arrayToObjectById } from '../utils/utils';
import { trackUsage } from '../utils/Metrics';
import { canEditTimeseries } from '../utils/PermissionsUtils';

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

// Reducer
export interface TimeseriesState {
  items: { [key: number]: GetTimeSeriesMetadataDTO };
  byAssetId: { [key: number]: number[] };
}

const initialState: TimeseriesState = { items: {}, byAssetId: {} };

export default function reducer(
  state = initialState,
  action: TimeseriesAction
): TimeseriesState {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items, assetId } = action.payload;

      const byAssetMap = items.reduce((prev, item) => {
        if (
          !state.items[item.id] ||
          state.items[item.id].assetId !== item.assetId
        ) {
          const prevId = state.items[item.id]
            ? state.items[item.id].assetId
            : undefined;
          const currId = item.assetId;
          if (prevId && prev[prevId]) {
            // eslint-disable-next-line no-param-reassign
            prev[prevId] = prev[prevId].filter(el => el !== item.id);
          }
          if (currId) {
            if (prev[currId]) {
              // eslint-disable-next-line no-param-reassign
              prev[currId] = [...prev[currId], item.id];
            } else {
              // eslint-disable-next-line no-param-reassign
              prev[currId] = [item.id];
            }
          }
        }
        return prev;
      }, state.byAssetId);
      if (assetId && items.length === 0) {
        byAssetMap[assetId] = [];
      }
      return {
        ...state,
        items: {
          ...state.items,
          ...arrayToObjectById(items),
        },
        byAssetId: byAssetMap,
      };
    }

    case REMOVE_ASSET_FROM_TIMESERIES: {
      const { timeseriesId } = action.payload;
      const { items } = state;
      delete items[timeseriesId];
      return {
        ...state,
        items,
      };
    }
    case DELETE_TIMESERIES: {
      const { timeseriesId } = action.payload;
      const { items, byAssetId } = state;
      if (items[timeseriesId]) {
        const { assetId } = items[timeseriesId];
        if (assetId && byAssetId[assetId]) {
          byAssetId[assetId] = byAssetId[assetId].filter(
            el => el !== timeseriesId
          );
        }
      }
      delete items[timeseriesId];
      return {
        ...state,
        items,
        byAssetId,
      };
    }
    default:
      return state;
  }
}

// Functions
export function fetchTimeseries(ids: IdEither[]) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    const results = await sdk.timeseries.retrieve(ids);
    dispatch({ type: SET_TIMESERIES, payload: { items: results } });
  };
}
export function fetchTimeseriesForAssetId(assetId: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
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

let searchTimeseriesId = 0;
export function searchTimeseries(query: string, assetId?: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
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
  dispatch: Dispatch<DeleteTimeseriesAction>
) => {
  if (!canEditTimeseries()) {
    return false;
  }
  trackUsage('Timeseries.DeleteTimeseries', {
    id: timeseriesId,
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

export const updateTimeseries = (
  timeseriesId: number,
  update: TimeSeriesUpdate
) => async (dispatch: Dispatch<SetTimeseriesAction>) => {
  if (!canEditTimeseries()) {
    return;
  }
  trackUsage('Timeseries.UpdateTimeseries', {
    id: timeseriesId,
  });

  const updatedTimeseries = await sdk.timeseries.update([update]);
  dispatch({
    type: SET_TIMESERIES,
    payload: { items: updatedTimeseries },
  });
};

// Selectors
export const selectTimeseriesByAssetId = (
  state: RootState,
  assetId: number
) => {
  const tsForAsset = state.timeseries.byAssetId[assetId];
  if (tsForAsset) {
    return tsForAsset.map(id => state.timeseries.items[id]).filter(el => !!el);
  }
  return tsForAsset;
};
export const selectTimeseriesById = (
  state: RootState,
  timeseriesId?: number
) => {
  return timeseriesId ? state.timeseries.items[timeseriesId] : undefined;
};
