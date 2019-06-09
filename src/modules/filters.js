import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import { selectEventList } from './events';
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
  if (!events_.some(event => event.assetIds.indexOf(asset.id) !== -1)) {
    // Did not find any event for this asset
    return true;
  }

  const anyBadEvents = events_.some(event => {
    return (
      event.startTime < filter.from ||
      event.startTime > filter.to ||
      event.assetIds.indexOf(asset.id) === -1
    );
  });

  return anyBadEvents;
};

const applyFilter = (state, asset, filter) => {
  if (filter.type === 'event') {
    return applyEventFilter(state, asset, filter);
  }
  return false;
};

const applyFilters = (state, asset) => {
  const filters = selectFilters(state).items;
  // Loop through all filters and see if anyone rejects this asset
  const anyBadFilters = filters.some(filter =>
    applyFilter(state, asset, filter)
  );

  return !anyBadFilters;
};

export const selectFilteredSearch = state => {
  const currentAssets = selectAssets(state).current;
  return { items: currentAssets.filter(asset => applyFilters(state, asset)) };
};

export function setFilters(filters) {
  return async dispatch => {
    dispatch({ type: SET_FILTERS, payload: { items: filters } });
  };
}
