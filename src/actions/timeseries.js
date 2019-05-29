import * as sdk from '@cognite/sdk'
import ActionTypes from '../constants/actionTypes'
import store from '../store'

export const addTimeseries = (nodeId, comment) => ({
  type: ActionTypes.ADD_TIMESERIES,
  payload: { nodeId, comment },
})

export function addTimeseriesToAsset(timeseriesIds, assetId) {
  return async (dispatch) => {
    const changes = timeseriesIds.map(id => ({ id, assetId: {set: assetId} }));
    const result = await sdk.TimeSeries.updateMultiple(changes);
    setTimeout(() => {
      dispatch(fetchTimeseries(assetId));
    }, 1000);
  }
}

export function fetchTimeseries(assetId) {
  return async (dispatch) => {
    const result = await sdk.TimeSeries.list({assetId, limit: 10000});
    const timeseries = result.items.map(ts => ({
      id: ts.id,
      name: ts.name
    }));
    dispatch({ type: ActionTypes.SET_TIMESERIES, payload: { items: timeseries } })
  };
}