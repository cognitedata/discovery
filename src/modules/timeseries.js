import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';

// Constants
export const ADD_TIMESERIES = 'timeseries/ADD_TIMESERIES';
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';

// Reducer
const initialState = { };

export default function timeseries(state = initialState, action) {
  switch (action.type) {
    case ADD_TIMESERIES: {
      const { ts } = action.payload;
      return {
        ...state,
        items: [...state.items, ...ts]
      }
    }
    case SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      }
    }
    default:
      return state
  }
}

// Action creators
const add_timeseries = createAction(ADD_TIMESERIES);
const set_timeseries = createAction(SET_TIMESERIES);

export const actions = {
  add_timeseries,
  set_timeseries
};

// Selectors
export const selectTimeseries = (state) => state.timeseries || { items: [] }

export function addTimeseriesToAsset(timeseriesIds, assetId) {
  return async (dispatch) => {
    const changes = timeseriesIds.map(id => ({ id, assetId: {set: assetId} }));
    const result = await sdk.TimeSeries.updateMultiple(changes);
    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
    }, 1000);
  }
}

export function fetchTimeseries(assetId) {
  return async (dispatch) => {
    const result = await sdk.TimeSeries.list({assetId, limit: 10000});
    const timeseries = result.items.map(ts => ({
      id: ts.id,
      name: ts.name
    }));
    dispatch({ type: SET_TIMESERIES, payload: { items: timeseries } })
  };
}