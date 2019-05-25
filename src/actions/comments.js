import * as sdk from '@cognite/sdk'
import ActionTypes from '../constants/actionTypes'
import store from '../store'
import { MODEL_ID_FIELD, REVISION_ID_FIELD, NODE_ID_FIELD } from '../constants/events'

export const addComment = (nodeId, comment) => ({
  type: ActionTypes.ADD_COMMENT,
  payload: { nodeId, comment },
})

export function fetchComments(modelId, revisionId, nodeId) {
  return async (dispatch) => {
    if (store.getState().comments[nodeId] !== undefined) {
      return;
    }
    dispatch({ type: ActionTypes.FETCH_COMMENTS, payload: nodeId })
    const events = await sdk.Events.search({
      metadata: {
        [MODEL_ID_FIELD]: modelId,
        [REVISION_ID_FIELD]: revisionId,
        [NODE_ID_FIELD]: nodeId,
      },
      sort: 'createdTime',
      dir: 'asc',
    });
    const comments = events.items.map(event => ({
      author: event.metadata.author,
      content: event.description,
      datetime: new Date(event.createdTime).toDateString(),
    }));
    dispatch({ type: ActionTypes.SET_COMMENTS, payload: { nodeId, items: comments } })
  }
}

export function submitComment(modelId, revisionId, nodeId, comment) {
  return async (dispatch) => {
    const { author, content } = comment;
    const metadata = {
      author,
      [MODEL_ID_FIELD]: modelId,
      [REVISION_ID_FIELD]: revisionId,
      [NODE_ID_FIELD]: nodeId,
    };
    await sdk.Events.create([{
      description: content,
      source: '3d-reviewer',
      type: 'Comment',
      metadata,
    }]);
    dispatch(addComment(nodeId, {
      author: comment.author,
      content: comment.content,
      datetime: new Date().toDateString(),
    }));
  }
}
