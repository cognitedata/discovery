import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';
import { fetchEvents } from './events';
import mixpanel from 'mixpanel-browser';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';

// Reducer
const initialState = { };

export default function timeseries(state = initialState, action) {
  switch (action.type) {
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
const set_timeseries = createAction(SET_TIMESERIES);

export const actions = {
  set_timeseries
};

// Selectors
export const selectTimeseries = (state) => state.timeseries || { items: [] }

export function addTimeseriesToAsset(timeseriesIds, assetId) {
  return async (dispatch) => {
    mixpanel.context.track('Timeseries.addToAsset', {
      assetId,
      timeseriesIds
    });
    
    const changes = timeseriesIds.map(id => ({ id, assetId: {set: assetId} }));
    let result = await sdk.TimeSeries.updateMultiple(changes);
    
    const now = Date.now() * 1000; // ms
    
    // Create event for this mapping
    result = await sdk.Events.create([
      { 
        startTime: now,
        description: 'Mapped timeseries to asset',
        type: 'cognite_contextualization',
        subtype: 'mapped_timeseries_to_asset',
        assetIds: [assetId],
        metadata: {added: JSON.stringify(timeseriesIds)}
      }
    ]);
    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
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