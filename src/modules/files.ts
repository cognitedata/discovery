import { Dispatch, Action } from 'redux';
import { FilesMetadata, FileChangeUpdate } from '@cognite/sdk';
import { message } from 'antd';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { arrayToObjectById } from '../utils/utils';
import { trackUsage } from '../utils/Metrics';
import { canReadFiles, canEditFiles } from '../utils/PermissionsUtils';

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

// Reducer
export interface FilesState {
  items: { [key: string]: FilesMetadata };
  byAssetId: { [key: string]: number[] };
}
const initialState: FilesState = { byAssetId: {}, items: {} };

export default function reducer(
  state = initialState,
  action: FilesAction
): FilesState {
  switch (action.type) {
    case ADD_FILES: {
      const { assetId, items } = action.payload;
      const byAssetMap = items.reduce((prev, item) => {
        if (
          !state.items[item.id] ||
          state.items[item.id].assetIds !== item.assetIds
        ) {
          const prevIds = state.items[item.id]
            ? state.items[item.id].assetIds
            : undefined;
          const currIds = item.assetIds;
          if (prevIds) {
            prevIds.forEach(prevId => {
              if (prev[prevId]) {
                // eslint-disable-next-line no-param-reassign
                prev[prevId] = prev[prevId].filter(el => el !== item.id);
              }
            });
          }
          if (currIds) {
            currIds.forEach(currId => {
              if (prev[currId]) {
                // eslint-disable-next-line no-param-reassign
                prev[currId].push(item.id);
              } else {
                // eslint-disable-next-line no-param-reassign
                prev[currId] = [item.id];
              }
            });
          }
        }
        return prev;
      }, state.byAssetId);
      if (assetId && items.length === 0) {
        byAssetMap[assetId] = [];
      }
      return {
        ...state,
        items: { ...state.items, ...arrayToObjectById(items) },
        byAssetId: byAssetMap,
      };
    }
    case ADD_FILE: {
      const { item } = action.payload;
      return {
        ...state,
        items: { ...state.items, ...arrayToObjectById([item]) },
      };
    }
    case DELETE_FILE: {
      const { fileId } = action.payload;
      const { items: filesData, byAssetId } = state;
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
        items: filesData,
        byAssetId,
      };
    }
    default:
      return state;
  }
}

export const fetchFiles = (assetId: number) => async (dispatch: Dispatch) => {
  if (!canReadFiles()) {
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

export const fetchFile = (fileId: number) => async (dispatch: Dispatch) => {
  if (!canReadFiles()) {
    return;
  }
  const [item] = await sdk.files.retrieve([{ id: fileId }]);
  dispatch({ type: ADD_FILE, payload: { item } });
};

export const updateFile = (file: FileChangeUpdate) => async (
  dispatch: Dispatch
) => {
  if (!canEditFiles()) {
    return;
  }
  const [item] = await sdk.files.update([file]);
  dispatch({ type: ADD_FILE, payload: { item } });
};

export const deleteFile = (fileId: number) => async (
  dispatch: Dispatch<DeleteFileAction>
) => {
  if (!canEditFiles()) {
    return false;
  }
  trackUsage('Files.DeleteFiles', {
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

// Selectors
export const selectFilesForAsset = (state: RootState, assetId: number) => {
  const filesForAsset = state.files.byAssetId[assetId];
  if (filesForAsset) {
    return filesForAsset.map(id => state.files.items[id]);
  }
  return undefined;
};
export const selectFileById = (state: RootState, fileId?: number) => {
  return fileId ? state.files.items[fileId] : undefined;
};
