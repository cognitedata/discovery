import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

export const Events = PropTypes.exact({
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      description: PropTypes.string,
      metadata: PropTypes.any,
      type: PropTypes.string,
      subtype: PropTypes.string,
      startTime: PropTypes.number,
      endTime: PropTypes.number,
    })
  ),
});

// Constants
export const SET_EVENTS = 'events/SET_EVENTS';

// Reducer
const initialState = {};

export default function events(state = initialState, action) {
  switch (action.type) {
    case SET_EVENTS: {
      const { items } = action.payload;
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
export const selectEvents = state => state.events || { items: [] };

export function fetchEvents(assetId) {
  return async dispatch => {
    const result = await sdk.Events.list({ assetId, limit: 10000 });
    const events_ = result.items.map(event => ({
      id: event.id,
      description: event.description,
      metadata: event.metadata,
      type: event.type,
      subtype: event.subtype,
      startTime: event.startTime,
      endTime: event.endTime,
    }));
    dispatch({ type: SET_EVENTS, payload: { items: events_ } });
  };
}
