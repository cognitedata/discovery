import { createAction } from 'redux-actions';
import PropTypes from 'prop-types';
import * as sdk from '@cognite/sdk';

export const File = PropTypes.shape({
  id: PropTypes.number,
  fileName: PropTypes.string,
  fileType: PropTypes.string,
});

export const Files = PropTypes.exact({
  byAssetId: PropTypes.objectOf(PropTypes.arrayOf(File)),
});

// Constants
export const ADD_FILES = 'files/SET_FILES';

// Reducer
const initialState = { byAssetId: {} };

export default function files(state = initialState, action) {
  switch (action.type) {
    case ADD_FILES: {
      const { assetId, items } = action.payload;
      state.byAssetId[assetId] = items;
      return state;
    }
    default:
      return state;
  }
}

// Action creators
const addFiles = createAction(ADD_FILES);

export const actions = {
  addFiles,
};

// Selectors
export const selectFiles = state => state.files || { byAssetId: {} };

export function fetchFiles(assetId) {
  return async dispatch => {
    const result = await sdk.Files.list({ assetId, limit: 10000 });
    const items = result.items
      .filter(file => file.uploaded === true)
      .map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType,
      }));
    dispatch({ type: ADD_FILES, payload: { assetId, items } });
  };
}
