import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { FilesMetadata, FileChangeUpdate } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { checkForAccessPermission, arrayToObjectById } from '../utils/utils';

// Constants
export const ADD_FILES = 'files/SET_FILES';
export const ADD_FILE = 'files/ADD_FILE';

interface AddFilesAction extends Action<typeof ADD_FILES> {
  payload: {
    assetId: number;
    items: FilesMetadata[];
  };
}
interface AddFileAction extends Action<typeof ADD_FILE> {
  payload: {
    item: FilesMetadata;
  };
}

type FilesAction = AddFilesAction | AddFileAction;

export const fetchFiles = (assetId: number) => async (
  dispatch: Dispatch,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(getState().app.groups, 'filesAcl', 'READ', true)
  ) {
    return;
  }
  const result = await sdk.files.list({
    filter: { assetIds: [assetId] },
    limit: 1000,
  });
  const items = result.items.filter(file => file.uploaded === true);
  dispatch({ type: ADD_FILES, payload: { assetId, items } });
};

export function addFilesToState(filesToAdd: FilesMetadata[]) {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: ADD_FILES,
      payload: {
        items: filesToAdd,
      },
    });
  };
}

export const fetchFile = (fileId: number) => async (
  dispatch: Dispatch,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(getState().app.groups, 'filesAcl', 'READ', true)
  ) {
    return;
  }
  const [item] = await sdk.files.retrieve([{ id: fileId }]);
  dispatch({ type: ADD_FILE, payload: { item } });
};

export const updateFile = (file: FileChangeUpdate) => async (
  dispatch: Dispatch,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(getState().app.groups, 'filesAcl', 'WRITE', true)
  ) {
    return;
  }
  const [item] = await sdk.files.update([file]);
  dispatch({ type: ADD_FILE, payload: { item } });
};

// Reducer
export interface FilesState {
  files: { [key: string]: FilesMetadata };
  byAssetId: { [key: string]: number[] };
}
const initialState: FilesState = { byAssetId: {}, files: {} };

export default function files(
  state = initialState,
  action: FilesAction
): FilesState {
  switch (action.type) {
    case ADD_FILES: {
      const { assetId, items } = action.payload;
      return {
        ...state,
        files: { ...state.files, ...arrayToObjectById(items) },
        byAssetId: {
          ...state.byAssetId,
          [assetId]: items.map(el => el.id),
        },
      };
    }
    case ADD_FILE: {
      const { item } = action.payload;
      return {
        ...state,
        files: { ...state.files, ...arrayToObjectById([item]) },
      };
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
export const selectFiles = (state: RootState) =>
  state.files || { byAssetId: {} };

export const selectFilesForAsset = (state: RootState, assetId: number) => {
  const filesForAsset = state.files.byAssetId[assetId];
  if (filesForAsset) {
    return filesForAsset.map(id => state.files.files[id]);
  }
  return undefined;
};
