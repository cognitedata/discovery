import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';
import mixpanel from 'mixpanel-browser';
import { message } from 'antd';
import { fetchEvents, createEvent } from './events';
import { Dispatch, Action } from 'redux';
import { Timeseries } from '@cognite/sdk';
import { RootState } from '../reducers';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';
export const REMOVE_ASSET_FROM_TIMESERIES = 'timeseries/REMOVE_ASSET_FROM_TIMESERIES';

interface SetTimeseriesAction extends Action<typeof SET_TIMESERIES> {
  payload: { items: Timeseries[] };
}
interface RemoveAssetAction extends Action<typeof REMOVE_ASSET_FROM_TIMESERIES> {
  payload: { timeseriesId: number };
}
type TimeseriesAction = SetTimeseriesAction | RemoveAssetAction;

// Functions
export function fetchTimeseries(assetId: number) {
  return async (dispatch: Dispatch<SetTimeseriesAction>) => {
    const result = await sdk.TimeSeries.list({ assetId, limit: 10000 });
    const timeseries_ = result.items.map(ts => ({
      id: ts.id,
      name: ts.name
    }));
    dispatch({ type: SET_TIMESERIES, payload: { items: timeseries_ } });
  };
}

export function removeAssetFromTimeseries(timeseriesId: number, assetId: number) {
  return async (dispatch: Dispatch<RemoveAssetAction>) => {
    await sdk.TimeSeries.update(timeseriesId, {
      assetId: { setNull: true }
    });

    createEvent('removed_timeseries', 'Removed timeseries', [assetId], {
      removed: timeseriesId
    });

    dispatch({
      type: REMOVE_ASSET_FROM_TIMESERIES,
      payload: { timeseriesId }
    });

    message.info(`Removed 1 timeseries from asset.`);

    setTimeout(() => {
      fetchTimeseries(assetId);
      fetchEvents(assetId);
    }, 1000);
  };
}

export function addTimeseriesToAsset(timeseriesIds: number[], assetId: number) {
  return async (dispatch: Dispatch) => {
    // @ts-ignore
    mixpanel.context.track('Timeseries.addToAsset', {
      assetId,
      timeseriesIds
    });

    const changes = timeseriesIds.map(id => ({
      id,
      assetId: { set: assetId }
    }));
    await sdk.TimeSeries.updateMultiple(changes);

    // Create event for this mapping
    createEvent('attached_timeseries', 'Attached timeseries', [assetId], {
      added: JSON.stringify(timeseriesIds)
    });

    message.info(`Mapped ${timeseriesIds.length} timeseries to asset.`);

    setTimeout(() => {
      fetchTimeseries(assetId);
      fetchEvents(assetId);
    }, 1000);
  };
}

// Reducer
export interface TimeseriesState {
  items?: Timeseries[];
}
const initialState: TimeseriesState = {};

export default function timeseries(state = initialState, action: TimeseriesAction): TimeseriesState {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        items
      };
    }

    case REMOVE_ASSET_FROM_TIMESERIES: {
      const { timeseriesId } = action.payload;
      if (state.items) {
        const items = state.items.filter(ts => ts.id !== timeseriesId);
        return {
          ...state,
          items
        };
      }
    }
    default:
      return state;
  }
}

// Action creators
const setTimeseries = createAction(SET_TIMESERIES);

export const actions = {
  setTimeseries
};

// Selectors
export const selectTimeseries = (state: RootState) => state.timeseries || { items: [] };
