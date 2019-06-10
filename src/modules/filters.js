import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import { selectEventList, fetchEventsByFilter } from './events';
import { selectAssets } from './assets';

export const EventFilter = PropTypes.shape({
  type: PropTypes.string,
  eventType: PropTypes.string,
  from: PropTypes.number,
  to: PropTypes.number,
});

export const Filters = PropTypes.exact({
  items: PropTypes.arrayOf(EventFilter),
});

// Constants
export const SET_FILTERS = 'filters/SET_FILTERS';

// Reducer
const initialState = {};

export default function events(state = initialState, action) {
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
export const selectFilters = state => state.filters || {};

const applyEventFilter = (state, asset, filter) => {
  const events_ = selectEventList(state).items;
  const eventsForThisAsset = events_.filter(
    event => event.assetIds.indexOf(asset.id) !== -1
  );
  if (eventsForThisAsset.length === 0) {
    // Did not find any events for this asset
    return false;
  }

  // Check if at least of the remaining assets obey all criteria
  return eventsForThisAsset.some(event => {
    return (
      (filter.eventType === undefined || event.type === filter.eventType) &&
      (filter.from === undefined || event.startTime >= filter.from) &&
      (filter.to === undefined || event.startTime <= filter.to)
    );
  });
};

const applyLocationFilter = (state, asset, filter) => {
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

const applyFilter = (state, asset, filter) => {
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

const applyFilters = (state, asset) => {
  const filters = selectFilters(state);
  // Loop through all filters and see if anyone rejects this asset
  return Object.keys(filters).every(filterKey =>
    applyFilter(state, asset, filters[filterKey])
  );
};

export const selectFilteredSearch = state => {
  let assets = selectAssets(state).current;

  if (assets.length === 0) {
    // If we don't have a search result, use all cached assets and filter on events instead
    assets = Object.keys(selectAssets(state).all).map(
      assetId => selectAssets(state).all[assetId]
    );
  }

  const items = assets.filter(asset => applyFilters(state, asset));

  return { items };
};

export function setFilters(filters) {
  return async dispatch => {
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
