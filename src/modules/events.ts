import { Dispatch, Action } from 'redux';
import { CogniteEvent } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { arrayToObjectById } from '../utils/utils';
import { RootState } from '../reducers';
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

interface AddEventAction extends Action<typeof ADD_EVENTS> {
  payload: { items: CogniteEvent[]; assetId: number };
}
interface RemoveEventAction extends Action<typeof REMOVE_EVENT> {
  payload: { eventId: number };
}

type EventsAction = AddEventAction | RemoveEventAction;

// Reducer
export interface EventState {
  items: { [key: string]: CogniteEvent };
  byAssetId: { [key: number]: number[] };
}

const initialState: EventState = { items: {}, byAssetId: {} };

export default function reducer(
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
    default:
      return state;
  }
}

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

    const { items } = result;

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

// Selectors
export const selectEventsByAssetId = (state: RootState, assetId: number) => {
  const eventsForAsset = state.events.byAssetId[assetId];
  if (eventsForAsset) {
    return eventsForAsset.map(id => state.events.items[id]);
  }
  return eventsForAsset;
};
