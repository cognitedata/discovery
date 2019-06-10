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
export const ADD_EVENTS = 'events/ADD_EVENTS';
export const ADD_UNIQUE_EVENT_TYPES = 'events/ADD_UNIQUE_EVENT_TYPES';

// Reducer
const initialState = { items: {}, types: [] };

export default function events(state = initialState, action) {
  switch (action.type) {
    case ADD_EVENTS: {
      const items = { ...state.items, ...action.payload.items };
      return {
        ...state,
        items,
      };
    }
    case ADD_UNIQUE_EVENT_TYPES: {
      const items = [...new Set([...state.types, ...action.payload.items])];
      return {
        ...state,
        types: items,
      };
    }
    default:
      return state;
  }
}

// Action creators
const addEvents = createAction(ADD_EVENTS);
const addUniqueEventTypes = createAction(ADD_UNIQUE_EVENT_TYPES);

export const actions = {
  addEvents,
  addUniqueEventTypes,
};

// Selectors
export const selectEvents = state => state.events || { items: {}, types: [] };
export const selectEventTypes = state =>
  state.events ? state.events.types : [];
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

    const types = result.items.map(event => event.type);
    const items = arrayToObjectById(result.items);

    dispatch({ type: ADD_UNIQUE_EVENT_TYPES, payload: { items: types } });
    dispatch({ type: ADD_EVENTS, payload: { items } });
  };
}

export function fetchEventsByFilter(eventFilter) {
  return async dispatch => {
    const result = await sdk.Events.list({
      type: eventFilter.eventType,
      subtype: 'IAA',
      minStartTime: eventFilter.from,
      maxStartTime: eventFilter.to,
      limit: 10000,
    });

    const types = result.items.map(event => event.type);
    const items = arrayToObjectById(result.items);

    dispatch({ type: ADD_UNIQUE_EVENT_TYPES, payload: { items: types } });
    dispatch({ type: ADD_EVENTS, payload: { items } });
  };
}
