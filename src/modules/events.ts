import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { CogniteEvent } from '@cognite/sdk';
import { arrayToObjectById } from '../utils/utils';
import { RootState } from '../reducers';
import { sdk } from '../index';
import { trackUsage } from '../utils/Metrics';
import { canEditEvents, canReadEvents } from '../utils/PermissionsUtils';

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
export const REMOVE_EVENT = 'events/REMOVE_EVENT';
export const ADD_UNIQUE_EVENT_TYPES = 'events/ADD_UNIQUE_EVENT_TYPES';

interface AddEventAction extends Action<typeof ADD_EVENTS> {
  payload: { items: CogniteEvent[]; assetId: number };
}
interface RemoveEventAction extends Action<typeof REMOVE_EVENT> {
  payload: { eventId: number };
}
interface AddUniqueEventTypesAction
  extends Action<typeof ADD_UNIQUE_EVENT_TYPES> {
  payload: { items: string[] };
}
type EventsAction =
  | AddEventAction
  | AddUniqueEventTypesAction
  | RemoveEventAction;

export async function createEvent(
  subtype?: string,
  description?: string,
  assetIds?: number[],
  metadata?: { [key: string]: any }
) {
  if (!canEditEvents()) {
    return;
  }
  trackUsage('Events.CreateEvent', {
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

export function fetchEventsForAssetId(assetId: number) {
  return async (dispatch: Dispatch) => {
    if (!canReadEvents()) {
      return;
    }
    const result = await sdk.events.list({
      filter: { assetIds: [assetId] },
      limit: 1000,
    });

    const types = result.items.map(event => event.type);
    const { items } = result;

    dispatch({ type: ADD_UNIQUE_EVENT_TYPES, payload: { items: types } });
    dispatch({ type: ADD_EVENTS, payload: { items, assetId } });
  };
}

export function deleteEvent(eventId: number) {
  return async (dispatch: Dispatch) => {
    if (!canEditEvents()) {
      return;
    }
    await sdk.events.delete([{ id: eventId }]);
    dispatch({ type: REMOVE_EVENT, payload: { eventId } });
  };
}

// Reducer
export interface EventState {
  items: { [key: string]: CogniteEvent };
  byAssetId: { [key: number]: number[] };
  types: string[];
}
const initialState: EventState = { items: {}, types: [], byAssetId: {} };

export default function events(
  state = initialState,
  action: EventsAction
): EventState {
  switch (action.type) {
    case ADD_EVENTS: {
      const items = {
        ...state.items,
        ...arrayToObjectById(action.payload.items),
      };
      return {
        ...state,
        items,
        byAssetId: {
          ...state.byAssetId,
          [action.payload.assetId]: action.payload.items.map(el => el.id),
        },
      };
    }
    case REMOVE_EVENT: {
      const items = { ...state.items };
      delete items[action.payload.eventId];
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
export const selectEventsByAssetId = (state: RootState, assetId: number) => {
  const eventsForAsset = state.events.byAssetId[assetId];
  if (eventsForAsset) {
    return eventsForAsset.map(id => state.events.items[id]);
  }
  return eventsForAsset;
};
