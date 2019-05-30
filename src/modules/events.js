import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';

// Constants
export const SET_EVENTS = 'events/SET_EVENTS';

// Reducer
const initialState = { };

export default function events(state = initialState, action) {
  switch (action.type) {
    case SET_EVENTS: {
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
const set_events = createAction(SET_EVENTS);

export const actions = {
  set_events
};

// Selectors
export const selectEvents = (state) => state.events || { items: [] }

export function addEventsToAsset(timeseriesIds, assetId) {
  return async (dispatch) => {
    // const changes = timeseriesIds.map(id => ({ id, assetId: {set: assetId} }));
    // const result = await sdk.TimeSeries.updateMultiple(changes);
    // setTimeout(() => {
    //   dispatch(fetchEvents(assetId));
    // }, 1000);
  }
}

export function fetchEvents(assetId) {
  return async (dispatch) => {
    const result = await sdk.Events.list({assetId, limit: 10000});
    const events = result.items.map(event => ({
      id: event.id,
      description: event.description,
      type: event.type,
      subtype: event.subtype,
      startTime: event.startTime,
      endTime: event.endTime
    }));
    dispatch({ type: SET_EVENTS, payload: { items: events } })
  };
}