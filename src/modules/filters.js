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
const initialState = { items: [] };

export default function events(state = initialState, action) {
  switch (action.type) {
    case SET_FILTERS: {
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

export const actions = {
  setFilters: createAction(SET_FILTERS),
};

// Selectors
export const selectFilters = state => state.filters || { items: [] };

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
      (filter.eventType == null || event.type === filter.eventType) &&
      (filter.from == null || event.startTime >= filter.from) &&
      (filter.to == null || event.startTime <= filter.to)
    );
  });
};

const applyFilter = (state, asset, filter) => {
  if (filter.type === 'event') {
    return applyEventFilter(state, asset, filter);
  }
  return true;
};

const applyFilters = (state, asset) => {
  const filters = selectFilters(state).items;
  // Loop through all filters and see if anyone rejects this asset
  return Object.keys(filters).every(filterKey =>
    applyFilter(state, asset, filters[filterKey])
  );
};

export const selectFilteredSearch = state => {
  const currentAssets = selectAssets(state).current;
  return { items: currentAssets.filter(asset => applyFilters(state, asset)) };
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
