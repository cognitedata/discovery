import * as sdk from '@cognite/sdk'
import ActionTypes from '../constants/actionTypes'
import store from '../store'

export const addTimeseries = (nodeId, comment) => ({
  type: ActionTypes.ADD_TIMESERIES,
  payload: { nodeId, comment },
})

// export function addTimeseriesToAsset(timeseriesIds, assetId) {
//   return async (dispatch) => {
//     Promise.all(timeseriesIds.forEach(async id => {
//       await sdk.TimeSeries.update(id, {assetId});
//     }));
    
//     dispatch(addComment(nodeId, {
//       author: comment.author,
//       content: comment.content,
//       datetime: new Date().toDateString(),
//     }));
//   }
// }

export function fetchTimeseries(assetId) {
  return async (dispatch) => {
    const result = await sdk.TimeSeries.list({assetId, limit: 10000});
    const timeseries = result.items.map(ts => ({
      id: ts.id,
      name: ts.name
    }));
    console.log('what: ', timeseries);
    dispatch({ type: ActionTypes.SET_TIMESERIES, payload: { items: timeseries } })
  };
}