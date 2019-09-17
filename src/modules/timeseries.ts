import { createAction } from 'redux-actions';
import mixpanel from 'mixpanel-browser';
import { message } from 'antd';
import { Dispatch, Action, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { fetchEvents, createEvent } from './events';
import { RootState } from '../reducers';
import { sdk } from '../index';

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
    const results = await sdk.timeseries.list({
      assetIds: [assetId],
      limit: 1000,
    });
    dispatch({ type: SET_TIMESERIES, payload: { items: results.items } });
  };
}

export function removeAssetFromTimeseries(
  timeseriesId: number,
  assetId: number
) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
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
    // @ts-ignore
    mixpanel.context.track('Timeseries.addToAsset', {
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
  items?: GetTimeSeriesMetadataDTO[];
}
const initialState: TimeseriesState = {};

export default function timeseries(
  state = initialState,
  action: TimeseriesAction
): TimeseriesState {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      };
    }

    case REMOVE_ASSET_FROM_TIMESERIES: {
      const { timeseriesId } = action.payload;
      if (state.items) {
        const items = state.items.filter(ts => ts.id !== timeseriesId);
        return {
          ...state,
          items,
        };
      }
      return state;
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
