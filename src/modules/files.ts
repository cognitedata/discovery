import { createAction } from 'redux-actions';
import { Dispatch, Action } from 'redux';
import { FilesMetadata, FileChangeUpdate } from '@cognite/sdk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { checkForAccessPermission, arrayToObjectById } from '../utils/utils';
import { trackUsage } from '../utils/metrics';

// Constants
export const ADD_FILES = 'files/SET_FILES';
export const ADD_FILE = 'files/ADD_FILE';
export const DELETE_FILE = 'files/DELETE_FILE';

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
interface DeleteFileAction extends Action<typeof DELETE_FILE> {
  payload: {
    fileId: number;
  };
}

type FilesAction = AddFilesAction | AddFileAction | DeleteFileAction;

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

export const deleteFile = (fileId: number) => async (
  dispatch: Dispatch<DeleteFileAction>,
  getState: () => RootState
) => {
  if (
    !checkForAccessPermission(getState().app.groups, 'filesAcl', 'WRITE', true)
  ) {
    return false;
  }
  trackUsage('Files.deleteFiles', {
    fileId,
  });
  try {
    const results = await sdk.files.delete([{ id: fileId }]);

    if (results) {
      dispatch({ type: DELETE_FILE, payload: { fileId } });
    }
    return true;
  } catch (ex) {
    message.error(`Could not delete file.`);
    return false;
  }
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
    case DELETE_FILE: {
      const { fileId } = action.payload;
      const { files: filesData, byAssetId } = state;
      if (filesData[fileId]) {
        const { assetIds } = filesData[fileId];
        if (assetIds) {
          assetIds.forEach(assetId => () => {
            byAssetId[assetId] = byAssetId[assetId].filter(el => el !== fileId);
          });
        }
      }
      delete filesData[fileId];
      return {
        ...state,
        files: filesData,
        byAssetId,
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
