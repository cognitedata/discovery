import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import mixpanel from 'mixpanel-browser';
import { fetchEvents, createEvent } from './events';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';
export const REMOVE_ASSET_FROM_TIMESERIES =
  'timeseries/REMOVE_ASSET_FROM_TIMESERIES';

export const Timeseries = PropTypes.exact({
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    })
  ),
});

// Functions
export function fetchTimeseries(assetId) {
  return async dispatch => {
    const result = await sdk.TimeSeries.list({ assetId, limit: 10000 });
    const timeseries_ = result.items.map(ts => ({
      id: ts.id,
      name: ts.name,
    }));
    dispatch({ type: SET_TIMESERIES, payload: { items: timeseries_ } });
  };
}

export function removeAssetFromTimeseries(timeseriesId, assetId) {
  return async dispatch => {
    await sdk.TimeSeries.update(timeseriesId, {
      assetId: { setNull: true },
    });

    createEvent('detached_timeseries', 'Detached timeseries', [assetId], {
      removed: timeseriesId,
    });

    dispatch({
      type: REMOVE_ASSET_FROM_TIMESERIES,
      payload: { timeseriesId },
    });

    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
    }, 1000);
  };
}

// Reducer
const initialState = {};

export default function timeseries(state = initialState, action) {
  switch (action.type) {
    case SET_TIMESERIES: {
      const { items } = action.payload;
      return {
        ...state,
        items,
      };
    }

    case REMOVE_ASSET_FROM_TIMESERIES: {
      const { timeseriesId } = action.payload;
      const items = state.items.filter(ts => ts.id !== timeseriesId);
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
const setTimeseries = createAction(SET_TIMESERIES);

export const actions = {
  setTimeseries,
};

// Selectors
export const selectTimeseries = state => state.timeseries || { items: [] };

export function addTimeseriesToAsset(timeseriesIds, assetId) {
  return async dispatch => {
    mixpanel.context.track('Timeseries.addToAsset', {
      assetId,
      timeseriesIds,
    });

    const changes = timeseriesIds.map(id => ({
      id,
      assetId: { set: assetId },
    }));
    await sdk.TimeSeries.updateMultiple(changes);

    // Create event for this mapping
    createEvent('attached_timeseries', 'Attached timeseries', [assetId], {
      added: JSON.stringify(timeseriesIds),
    });

    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
    }, 1000);
  };
}
