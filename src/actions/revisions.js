import * as sdk from '@cognite/sdk'
import ActionTypes from '../constants/actionTypes'

export function fetchRevisions(modelId) {
  return async (dispatch) => {
    dispatch({ type: ActionTypes.FETCH_REVISIONS, payload: modelId });
    const response = await sdk.ThreeD.listRevisions(modelId);
    const revisions = response.items.filter(revision => revision.status === 'Done').map(revision => ({
      id: revision.id,
      thumbnailURL: revision.thumbnailURL,
    }));
    dispatch({ type: ActionTypes.SET_REVISIONS, payload: revisions })
  }
}
