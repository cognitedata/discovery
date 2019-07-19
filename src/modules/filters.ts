import { createAction, Action } from 'redux-actions';
import PropTypes from 'prop-types';
import { selectEventList, fetchEventsByFilter } from './events';
import { selectAssets } from './assets';
import { Dispatch } from 'redux';
import { RootState } from '../reducers';
import { Asset } from '@cognite/sdk';

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

interface SetFilterAction extends Action<{ items: { [key: string]: string } }> {}

type FiltersAction = SetFilterAction;

export function setFilters(filters: FilterOptions) {
  return async (dispatch: Dispatch) => {
    if (filters.event) {
      if (filters.event.from != null || filters.event.to != null || filters.event.eventType != null) {
        fetchEventsByFilter(filters.event);
      }
    }

    dispatch({ type: SET_FILTERS, payload: { items: filters } });
  };
}

// Reducer
export interface FilterState extends FilterOptions {}
const initialState: FilterState = {};

export default function events(state = initialState, action: FiltersAction): FilterState {
  switch (action.type) {
    case SET_FILTERS: {
      const { items } = action.payload;
      return {
        ...items
      };
    }
    default:
      return state;
  }
}

export const actions = {
  setFilters: createAction(SET_FILTERS)
};

// Selectors
export const selectFilters = (state: RootState) => state.filters || initialState;

const applyEventFilter = (state: RootState, asset: Asset, filter: EventFilter) => {
  const events_ = selectEventList(state).items;
  const eventsForThisAsset = events_.filter(event => event.assetIds.indexOf(asset.id) !== -1);
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

const applyLocationFilter = (state: RootState, asset: Asset, filter: LocationFilter) => {
  if (filter.area === undefined) {
    return true;
  }

  if (asset.metadata === undefined) {
    return false;
  }

  // The key can be Area or AREA
  const areaKeys = Object.keys(asset.metadata).filter(keys => keys.toUpperCase() === 'AREA');
  if (areaKeys.length > 0) {
    return asset.metadata[areaKeys[0]] === filter.area;
  }
  return false;
};

const applyFilter = (state: RootState, asset: Asset, filter: LocationFilter | EventFilter) => {
  // TODO Fix
  if (filter.type === 'event') {
    const result = applyEventFilter(state, asset, filter);
    return result;
  }
  if (filter.type === 'location') {
    const result = applyLocationFilter(state, asset, filter);
    return result;
  }
  return true;
};

const applyFilters = (state: RootState, asset: Asset) => {
  const filters = selectFilters(state);
  // Loop through all filters and see if anyone rejects this asset
  // TODO FIX
  filters.event && applyFilter(state, asset, filters.event);
  filters.location && applyFilter(state, asset, filters.location);
  // return Object.keys(filters).every(filterKey => {
  //   const filter: LocationFilter | EventFilter = filters[filterKey];
  //   applyFilter(state, asset, filter);
  // });
};

export const selectFilteredSearch = (state: RootState) => {
  let assets = selectAssets(state).current;

  if (assets.length === 0) {
    // If we don't have a search result, use all cached assets and filter on events instead
    assets = Object.keys(selectAssets(state).all).map(assetId => selectAssets(state).all[assetId]);
  }

  const items = assets.filter((asset: Asset) => applyFilters(state, asset));

  return { items };
};
