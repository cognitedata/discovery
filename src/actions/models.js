import * as sdk from '@cognite/sdk'
import ActionTypes from '../constants/actionTypes'

export function fetchModels() {
  return async (dispatch) => {
    dispatch({ type: ActionTypes.FETCH_MODELS });
    const response = await sdk.ThreeD.listModels();
    const models = response.items.map(model => ({
      name: model.name,
      id: model.id,
    }));
    dispatch({ type: ActionTypes.SET_MODELS, payload: models })
  }
}
