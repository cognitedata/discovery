import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';
import mixpanel from 'mixpanel-browser';
import { fetchEvents } from './events';

// Constants
export const SET_TIMESERIES = 'timeseries/SET_TIMESERIES';

export const Timeseries = PropTypes.exact({
  id: PropTypes.number,
  name: PropTypes.string,
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

    const now = Date.now() * 1000; // ms

    // Create event for this mapping
    await sdk.Events.create([
      {
        startTime: now,
        endTime: now,
        description: 'Mapped timeseries to asset',
        type: 'cognite_contextualization',
        subtype: 'mapped_timeseries_to_asset',
        assetIds: [assetId],
        metadata: { added: JSON.stringify(timeseriesIds) },
      },
    ]);
    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
      dispatch(fetchEvents(assetId));
    }, 1000);
  };
}
