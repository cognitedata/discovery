import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { CogniteEvent } from '@cognite/sdk';
import { arrayToObjectById } from '../utils/utils';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { trackUsage } from '../utils/metrics';

export interface EventFilter {
  eventType?: string;
  from?: number;
  to?: number;
}

export type EventsAndTypes = {
  items: CogniteEvent[];
  types: string[];
};

// Constants
export const ADD_EVENTS = 'events/ADD_EVENTS';
export const ADD_UNIQUE_EVENT_TYPES = 'events/ADD_UNIQUE_EVENT_TYPES';

interface AddEventAction extends Action<typeof ADD_EVENTS> {
  payload: { items: { [key: string]: CogniteEvent } };
}
interface AddUniqueEventTypesAction
  extends Action<typeof ADD_UNIQUE_EVENT_TYPES> {
  payload: { items: string[] };
}
type EventsAction = AddEventAction | AddUniqueEventTypesAction;

export async function createEvent(
  subtype?: string,
  description?: string,
  assetIds?: number[],
  metadata?: { [key: string]: any }
) {
  trackUsage('Events.createEvent', {
    assetIds,
    subtype,
  });
  const now = Date.now(); // ms
  // Create event for this mapping
  await sdk.events.create([
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

export function fetchEvents(assetId: number) {
  return async (dispatch: Dispatch) => {
    trackUsage('Events.fetchEvents', {
      assetId,
    });
    const result = await sdk.events.list({
      filter: { assetIds: [assetId] },
      limit: 1000,
    });

    const types = result.items.map(event => event.type);
    const items = arrayToObjectById(result.items);

    dispatch({ type: ADD_UNIQUE_EVENT_TYPES, payload: { items: types } });
    dispatch({ type: ADD_EVENTS, payload: { items } });
  };
}

export function fetchEventsByFilter(eventFilter: EventFilter) {
  return async (dispatch: Dispatch) => {
    const result = await sdk.events.list({
      filter: {
        type: eventFilter.eventType,
        subtype: 'IAA',
        startTime: { min: eventFilter.from, max: eventFilter.to },
      },
      limit: 1000,
    });

    const types = result.items.map(event => event.type);
    const items = arrayToObjectById(result.items);

    dispatch({ type: ADD_UNIQUE_EVENT_TYPES, payload: { items: types } });
    dispatch({ type: ADD_EVENTS, payload: { items } });
  };
}

// Reducer
export interface EventState {
  items: { [key: string]: CogniteEvent };
  types: string[];
}
const initialState: EventState = { items: {}, types: [] };

export default function events(
  state = initialState,
  action: EventsAction
): EventState {
  switch (action.type) {
    case ADD_EVENTS: {
      const items = { ...state.items, ...action.payload.items };
      return {
        ...state,
        items,
      };
    }
    case ADD_UNIQUE_EVENT_TYPES: {
      const items = Array.from(
        new Set([...state.types, ...action.payload.items])
      );
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
export const selectEvents = (state: RootState) =>
  state.events || { items: {}, types: [] };
export const selectEventTypes = (state: RootState) =>
  state.events ? state.events.types : [];
export const selectEventList = (state: RootState) => {
  const items = Object.keys(state.events.items).map(
    key => state.events.items[key]
  ); // to array
  return { items };
};
export const selectEventsByAssetId = (
  state: RootState,
  assetId: number
): EventsAndTypes => {
  const items = Object.keys(state.events.items)
    .map(key => state.events.items[key]) // to array
    .filter(event => event.assetIds && event.assetIds.indexOf(assetId) !== -1); // filter by assetId
  return { items, types: [] };
};
