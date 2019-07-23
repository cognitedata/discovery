import { createAction } from 'redux-actions';
import * as sdk from '@cognite/sdk';
import { Dispatch, Action } from 'redux';
import { File } from '@cognite/sdk';
import { RootState } from '../reducers/index';

// Constants
export const ADD_FILES = 'files/SET_FILES';

interface AddFilesAction extends Action<typeof ADD_FILES> {
  payload: {
    assetId: number;
    items: {
      id: number;
      fileName: string;
      fileType: string | undefined;
    }[];
  };
}

type FilesAction = AddFilesAction;

export function fetchFiles(assetId: number) {
  return async (dispatch: Dispatch) => {
    const result = await sdk.Files.list({ assetId, limit: 10000 });
    const items = result.items
      .filter(file => file.uploaded === true)
      .map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType
      }));
    dispatch({ type: ADD_FILES, payload: { assetId, items } });
  };
}

// Reducer
export interface FilesState {
  byAssetId: { [key: string]: File[] };
}
const initialState: FilesState = { byAssetId: {} };

export default function files(state = initialState, action: FilesAction): FilesState {
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
  addFiles
};

// Selectors
export const selectFiles = (state: RootState) => state.files || { byAssetId: {} };
