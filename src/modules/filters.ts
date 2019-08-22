import { createAction } from 'redux-actions';
import { AnyAction, Action } from 'redux';
import { Asset } from '@cognite/sdk';
import { ThunkDispatch } from 'redux-thunk';
import { selectEventList, fetchEventsByFilter } from './events';
import { selectAssets } from './assets';
import { RootState } from '../reducers';

export interface EventFilter {
  type: string;
  eventType?: string;
  from?: number;
  to?: number;
}

export interface LocationFilter {
  type: string;
  area?: string;
}

export interface FilterOptions {
  event?: EventFilter;
  location?: LocationFilter;
}

// Constants
export const SET_FILTERS = 'filters/SET_FILTERS';

interface SetFilterAction extends Action<typeof SET_FILTERS> {
  payload: { items: { [key: string]: string } };
}

type FiltersAction = SetFilterAction;

export function setFilters(filters: FilterOptions) {
  return async (dispatch: ThunkDispatch<any, void, AnyAction>) => {
    if (filters.event) {
      if (
        filters.event.from != null ||
        filters.event.to != null ||
        filters.event.eventType != null
      ) {
        dispatch(fetchEventsByFilter(filters.event));
      }
    }

    dispatch({ type: SET_FILTERS, payload: { items: filters } });
  };
}

// Reducer
export interface FilterState {
  event?: EventFilter;
  location?: LocationFilter;
}

const initialState: FilterState = {};

export default function events(
  state = initialState,
  action: FiltersAction
): FilterState {
  switch (action.type) {
    case SET_FILTERS: {
      const { items } = action.payload;
      return {
        ...items,
      };
    }
    default:
      return state;
  }
}

export const actions = {
  setFilters: createAction(SET_FILTERS),
};

// Selectors
export const selectFilters = (state: RootState) =>
  state.filters || initialState;

const applyEventFilter = (
  state: RootState,
  asset: Asset,
  filter: EventFilter
) => {
  const selectedEvents = selectEventList(state).items;
  const eventsForThisAsset = selectedEvents.filter(
    event => event.assetIds && event.assetIds.indexOf(asset.id) !== -1
  );
  if (eventsForThisAsset.length === 0) {
    // Did not find any events for this asset
    return false;
  }

  // Check if at least of the remaining assets obey all criteria
  return eventsForThisAsset.some(event => {
    return (
      (filter.eventType === undefined || event.type === filter.eventType) &&
      event.startTime &&
      (filter.from === undefined || event.startTime >= filter.from) &&
      (filter.to === undefined || event.startTime <= filter.to)
    );
  });
};

const applyLocationFilter = (
  _state: RootState,
  asset: Asset,
  filter: LocationFilter
) => {
  if (filter.area === undefined) {
    return true;
  }

  if (asset.metadata === undefined) {
    return false;
  }

  // The key can be Area or AREA
  const areaKeys = Object.keys(asset.metadata).filter(
    keys => keys.toUpperCase() === 'AREA'
  );
  if (areaKeys.length > 0) {
    return asset.metadata[areaKeys[0]] === filter.area;
  }
  return false;
};

/**
 * Applies filter onto the asset object. Currently, the type of each Filter is being used to determine
 * what to apply (event vs location) and its assumed that there is only 1 filter of each type
 *
 * @param state reducer state
 * @param asset asset to check if filter should be added
 */
const applyFilters = (state: RootState, asset: Asset) => {
  const filters = selectFilters(state);
  // Loop through all filters and see if anyone rejects this asset
  let isTrue: boolean = true;
  if (filters.event) {
    isTrue = applyEventFilter(state, asset, filters.event);
  }
  if (isTrue && filters.location) {
    isTrue = isTrue && applyLocationFilter(state, asset, filters.location);
  }
  return isTrue;
};

/**
 * Selects the post-filter current assets, if current assets is empty, the filters
 * all cached objects in the state
 *
 * @param state reducer state
 */
export const selectFilteredAssets = (state: RootState) => {
  let assets = selectAssets(state).current;

  if (assets.length === 0) {
    // If we don't have a search result, use all cached assets and filter on events instead
    assets = Object.keys(selectAssets(state).all).map(
      assetId => selectAssets(state).all[assetId]
    );
  }

  const items = assets.filter((asset: Asset) => applyFilters(state, asset));

  return { items };
};

/**
 * Selects the root assets only
 *
 * @param state reducer state
 */
export const selectRootAssets = (state: RootState) => {
  let assets = selectAssets(state).current;

  if (assets.length === 0) {
    // If we don't have a search result, use all cached assets and filter on events instead
    assets = Object.keys(selectAssets(state).all).map(
      assetId => selectAssets(state).all[assetId]
    );
  }

  const items = assets.filter((asset: Asset) => asset.id === asset.rootId);

  return { items };
};
