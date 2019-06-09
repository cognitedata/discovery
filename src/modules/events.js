import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import { arrayToObjectById } from '../utils/utils';

export const Event = PropTypes.shape({
  id: PropTypes.number,
  description: PropTypes.string,
  metadata: PropTypes.any,
  type: PropTypes.string,
  subtype: PropTypes.string,
  startTime: PropTypes.number,
  endTime: PropTypes.number,
});

export const Events = PropTypes.exact({
  items: PropTypes.objectOf(Event),
});

export const EventList = PropTypes.exact({
  items: PropTypes.arrayOf(Event),
});

// Constants
export const SET_EVENTS = 'events/SET_EVENTS';

// Reducer
const initialState = { items: [] };

export default function events(state = initialState, action) {
  switch (action.type) {
    case SET_EVENTS: {
      const items = { ...state.items, ...action.payload.items };
      return {
        ...state,
        items,
      };
    }
    default:
      return state;
  }
}

// Action creators
const setEvents = createAction(SET_EVENTS);

export const actions = {
  setEvents,
};

// Selectors
export const selectEvents = state => state.events || { items: {} };
export const selectEventList = state => {
  const items = Object.keys(state.events.items).map(
    key => state.events.items[key]
  ); // to array
  return { items };
};
export const selectEventsByAssetId = (state, assetId) => {
  const items = Object.keys(state.events.items)
    .map(key => state.events.items[key]) // to array
    .filter(event => event.assetIds.indexOf(assetId) !== -1); // filter by assetId
  return { items };
};

export async function createEvent(subtype, description, assetIds, metadata) {
  const now = Date.now(); // ms
  // Create event for this mapping
  await sdk.Events.create([
    {
      startTime: now,
      endTime: now,
      description,
      type: 'cognite_contextualization',
      subtype,
      assetIds,
      metadata,
    },
  ]);
}

export function fetchEvents(assetId) {
  return async dispatch => {
    const result = await sdk.Events.list({ assetId, limit: 10000 });
    const items = arrayToObjectById(result.items);

    dispatch({ type: SET_EVENTS, payload: { items } });
  };
}

export function fetchEventsByFilter(eventFilter) {
  return async dispatch => {
    const result = await sdk.Events.search({
      type: eventFilter.type,
      subtype: 'IAA',
      minStartTime: eventFilter.from,
      maxStartTime: eventFilter.to,
      limit: 10000,
    });

    const items = arrayToObjectById(result.items);

    dispatch({ type: SET_EVENTS, payload: { items } });
  };
}
